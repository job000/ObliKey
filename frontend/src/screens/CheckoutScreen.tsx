import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import Container from '../components/Container';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

type PaymentMethod = 'CARD' | 'VIPPS';

interface AvailablePaymentMethod {
  provider: string;
  displayName: string;
  enabled: boolean;
  testMode: boolean;
}

interface DeliveryInfo {
  address: string;
  city: string;
  zip: string;
  country: string;
}

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { items, total, clearCart, loadCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<AvailablePaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [requiresDelivery, setRequiresDelivery] = useState(false);

  // Delivery information
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    address: '',
    city: '',
    zip: '',
    country: 'Norway',
  });

  // Card payment fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Vipps payment fields
  const [vippsPhone, setVippsPhone] = useState('');

  useEffect(() => {
    loadCart();
    fetchAvailablePaymentMethods();
    // Check if any items require physical delivery
    const hasPhysicalProducts = items.some(
      (item: any) => item.product?.type === 'PHYSICAL_PRODUCT'
    );
    setRequiresDelivery(hasPhysicalProducts);
  }, []);

  const fetchAvailablePaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/payments/available`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailablePaymentMethods(data.data || []);

        // Auto-select first available payment method
        const enabledMethods = data.data?.filter((m: AvailablePaymentMethod) => m.enabled) || [];
        if (enabledMethods.length > 0) {
          const firstMethod = enabledMethods[0].provider;
          if (firstMethod === 'VIPPS' || firstMethod === 'STRIPE') {
            setSelectedPaymentMethod(firstMethod === 'STRIPE' ? 'CARD' : 'VIPPS');
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ');
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\//g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateCardPayment = (): boolean => {
    const cleanedCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanedCardNumber.length !== 16 || !/^\d+$/.test(cleanedCardNumber)) {
      Alert.alert('Ugyldig kortnummer', 'Kortnummeret må være 16 siffer');
      return false;
    }

    const cleanedExpiry = cardExpiry.replace(/\//g, '');
    if (cleanedExpiry.length !== 4 || !/^\d+$/.test(cleanedExpiry)) {
      Alert.alert('Ugyldig utløpsdato', 'Utløpsdato må være i formatet MM/YY');
      return false;
    }

    const month = parseInt(cleanedExpiry.slice(0, 2));
    if (month < 1 || month > 12) {
      Alert.alert('Ugyldig måned', 'Måneden må være mellom 01 og 12');
      return false;
    }

    if (cardCvv.length !== 3 || !/^\d+$/.test(cardCvv)) {
      Alert.alert('Ugyldig CVV', 'CVV må være 3 siffer');
      return false;
    }

    return true;
  };

  const validateVippsPayment = (): boolean => {
    // Norwegian phone number validation (8 digits)
    const cleaned = vippsPhone.replace(/\s/g, '');
    if (!/^[49]\d{7}$/.test(cleaned)) {
      Alert.alert(
        'Ugyldig telefonnummer',
        'Vennligst skriv inn et gyldig norsk mobilnummer (8 siffer, starter med 4 eller 9)'
      );
      return false;
    }
    return true;
  };

  const validateDeliveryInfo = (): boolean => {
    if (!requiresDelivery) return true;

    if (!deliveryInfo.address.trim()) {
      Alert.alert('Manglende adresse', 'Vennligst fyll inn leveringsadresse');
      return false;
    }
    if (!deliveryInfo.city.trim()) {
      Alert.alert('Manglende by', 'Vennligst fyll inn by');
      return false;
    }
    if (!/^\d{4}$/.test(deliveryInfo.zip)) {
      Alert.alert('Ugyldig postnummer', 'Postnummer må være 4 siffer');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Tom handlekurv', 'Handlekurven din er tom');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Velg betalingsmetode', 'Vennligst velg en betalingsmetode');
      return;
    }

    // Validate delivery info if needed
    if (!validateDeliveryInfo()) {
      return;
    }

    // Validate payment method
    let paymentValid = false;
    switch (selectedPaymentMethod) {
      case 'CARD':
        paymentValid = validateCardPayment();
        break;
      case 'VIPPS':
        paymentValid = validateVippsPayment();
        break;
    }

    if (!paymentValid) {
      return;
    }

    try {
      setLoading(true);
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      // Prepare order data
      const orderData: any = {
        items: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: selectedPaymentMethod,
        notes: '',
      };

      // Add delivery info if required
      if (requiresDelivery) {
        orderData.deliveryAddress = deliveryInfo.address;
        orderData.deliveryCity = deliveryInfo.city;
        orderData.deliveryZip = deliveryInfo.zip;
        orderData.deliveryCountry = deliveryInfo.country;
      }

      // Create order first
      const response = await api.createOrder(orderData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create order');
      }

      const orderId = response.data.id;
      const orderNumber = response.data.orderNumber;

      // Handle payment based on selected method
      if (selectedPaymentMethod === 'VIPPS') {
        // Initiate Vipps payment
        const vippsResponse = await fetch(`${API_URL}/api/payments/vipps/initiate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            phoneNumber: vippsPhone,
            amount: total,
            description: `Ordre ${orderNumber}`,
          }),
        });

        const vippsData = await vippsResponse.json();

        if (vippsData.success && vippsData.data?.url) {
          // Clear cart before redirecting
          await clearCart();

          // Redirect to Vipps payment
          const canOpen = await Linking.canOpenURL(vippsData.data.url);
          if (canOpen) {
            await Linking.openURL(vippsData.data.url);
            // Show info message
            Alert.alert(
              'Omdirigerer til Vipps',
              'Du blir nå omdirigert til Vipps for å fullføre betalingen.',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('PurchaseHistory' as never),
                },
              ]
            );
          } else {
            throw new Error('Kunne ikke åpne Vipps');
          }
        } else {
          throw new Error(vippsData.error || 'Vipps-betaling feilet');
        }
      } else if (selectedPaymentMethod === 'CARD') {
        // Create Stripe payment intent
        const stripeResponse = await fetch(`${API_URL}/api/payments/stripe/create-intent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            amount: total,
            currency: 'NOK',
            description: `Ordre ${orderNumber}`,
          }),
        });

        const stripeData = await stripeResponse.json();

        if (stripeData.success && stripeData.data?.clientSecret) {
          // For now, show a message that card payment is initiated
          // In production, you would integrate Stripe's Payment Element here
          await clearCart();

          Alert.alert(
            'Betaling initiert',
            'Kortbetaling er initiert. I produksjon ville du nå bli tatt til Stripe for å fullføre betalingen.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('PurchaseHistory' as never),
              },
            ]
          );
        } else {
          throw new Error(stripeData.error || 'Kortbetaling feilet');
        }
      }
    } catch (error: any) {
      console.error('Order/Payment error:', error);
      Alert.alert(
        'Feil',
        error.message || error.response?.data?.error || 'Kunne ikke fullføre bestillingen. Prøv igjen.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethodCard = (
    method: PaymentMethod,
    title: string,
    icon: string,
    description: string
  ) => {
    const isSelected = selectedPaymentMethod === method;

    return (
      <TouchableOpacity
        style={[styles.paymentCard, isSelected && styles.paymentCardSelected]}
        onPress={() => setSelectedPaymentMethod(method)}
      >
        <View style={styles.paymentCardHeader}>
          <View style={styles.paymentCardTitle}>
            <Ionicons
              name={icon as any}
              size={24}
              color={isSelected ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.paymentMethodTitle,
                isSelected && styles.paymentMethodTitleSelected,
              ]}
            >
              {title}
            </Text>
          </View>
          <View
            style={[styles.radioButton, isSelected && styles.radioButtonSelected]}
          >
            {isSelected && <View style={styles.radioButtonInner} />}
          </View>
        </View>
        <Text style={styles.paymentMethodDescription}>{description}</Text>
      </TouchableOpacity>
    );
  };

  const renderPaymentForm = () => {
    if (!selectedPaymentMethod) {
      return null;
    }

    switch (selectedPaymentMethod) {
      case 'CARD':
        const isTestMode = availablePaymentMethods.find(m => m.provider === 'STRIPE')?.testMode;
        return (
          <View style={styles.paymentForm}>
            <Text style={styles.formSectionTitle}>Kortinformasjon</Text>
            {isTestMode && (
              <View style={styles.testModeBanner}>
                <Ionicons name="warning-outline" size={16} color={colors.warning} />
                <Text style={styles.testModeText}>Testmodus aktivert</Text>
              </View>
            )}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Kortnummer</Text>
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\s/g, '');
                  if (cleaned.length <= 16) {
                    setCardNumber(formatCardNumber(cleaned));
                  }
                }}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.flex1]}>
                <Text style={styles.inputLabel}>Utløpsdato</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\//g, '');
                    if (cleaned.length <= 4) {
                      setCardExpiry(formatExpiry(cleaned));
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputContainer, styles.flex1]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={cardCvv}
                  onChangeText={(text) => {
                    if (text.length <= 3 && /^\d*$/.test(text)) {
                      setCardCvv(text);
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                {isTestMode
                  ? 'Testmodus: Bruk testkortnummer 4242424242424242'
                  : 'Sikker kortbetaling via Stripe'}
              </Text>
            </View>
          </View>
        );

      case 'VIPPS':
        const vippsTestMode = availablePaymentMethods.find(m => m.provider === 'VIPPS')?.testMode;
        return (
          <View style={styles.paymentForm}>
            <View style={styles.vippsHeader}>
              <Text style={styles.formSectionTitle}>Betal med Vipps</Text>
              {vippsTestMode && (
                <View style={styles.testModeBanner}>
                  <Ionicons name="warning-outline" size={16} color={colors.warning} />
                  <Text style={styles.testModeText}>Testmodus aktivert</Text>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mobilnummer</Text>
              <TextInput
                style={styles.input}
                placeholder="400 00 000"
                value={vippsPhone}
                onChangeText={setVippsPhone}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                {vippsTestMode
                  ? 'Testmodus: Vipps-betaling vil ikke belaste din konto'
                  : 'Du blir omdirigert til Vipps for å fullføre betalingen'}
              </Text>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.screenHeader}>
          <Container>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Kasse</Text>
            </View>
          </Container>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Container>
            {/* Order Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ordresammendrag</Text>
              <View style={styles.summaryCard}>
                {items.map((item: any) => (
                  <View key={item.id} style={styles.summaryItem}>
                    <Text style={styles.summaryItemName} numberOfLines={1}>
                      {item.product.name} x {item.quantity}
                    </Text>
                    <Text style={styles.summaryItemPrice}>
                      {((item.price || 0) * item.quantity).toLocaleString('nb-NO')} kr
                    </Text>
                  </View>
                ))}
                <View style={styles.summaryDivider} />
                <View style={styles.summaryTotal}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>
                    {(total || 0).toLocaleString('nb-NO')} kr
                  </Text>
                </View>
              </View>
            </View>

            {/* Delivery Information */}
            {requiresDelivery && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Leveringsinformasjon</Text>
                <View style={styles.deliveryCard}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Adresse</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Gateadresse"
                      value={deliveryInfo.address}
                      onChangeText={(text) =>
                        setDeliveryInfo({ ...deliveryInfo, address: text })
                      }
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputContainer, styles.flex2]}>
                      <Text style={styles.inputLabel}>By</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="By"
                        value={deliveryInfo.city}
                        onChangeText={(text) =>
                          setDeliveryInfo({ ...deliveryInfo, city: text })
                        }
                      />
                    </View>

                    <View style={[styles.inputContainer, styles.flex1]}>
                      <Text style={styles.inputLabel}>Postnr.</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0000"
                        value={deliveryInfo.zip}
                        onChangeText={(text) =>
                          setDeliveryInfo({ ...deliveryInfo, zip: text })
                        }
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Land</Text>
                    <TextInput
                      style={styles.input}
                      value={deliveryInfo.country}
                      editable={false}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Payment Method Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Betalingsmetode</Text>
              {loadingPaymentMethods ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingText}>Laster betalingsmetoder...</Text>
                </View>
              ) : availablePaymentMethods.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="alert-circle-outline" size={48} color={colors.textLight} />
                  <Text style={styles.emptyStateText}>
                    Ingen betalingsmetoder tilgjengelig
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Kontakt administrator for å konfigurere betalingsmetoder
                  </Text>
                </View>
              ) : (
                <>
                  {availablePaymentMethods
                    .filter((m) => m.enabled && m.provider === 'STRIPE')
                    .map((method) => (
                      <View key={method.provider}>
                        {renderPaymentMethodCard(
                          'CARD',
                          method.displayName || 'Kort',
                          'card-outline',
                          'Betal med debet- eller kredittkort'
                        )}
                      </View>
                    ))}
                  {availablePaymentMethods
                    .filter((m) => m.enabled && m.provider === 'VIPPS')
                    .map((method) => (
                      <View key={method.provider}>
                        {renderPaymentMethodCard(
                          'VIPPS',
                          method.displayName || 'Vipps',
                          'phone-portrait-outline',
                          'Betal enkelt med Vipps'
                        )}
                      </View>
                    ))}
                </>
              )}
            </View>

            {/* Payment Form */}
            {renderPaymentForm()}

            {/* Place Order Button */}
            <TouchableOpacity
              style={[styles.placeOrderButton, loading && styles.buttonDisabled]}
              onPress={handlePlaceOrder}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.cardBg} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color={colors.cardBg} />
                  <Text style={styles.placeOrderText}>
                    Bekreft bestilling ({(total || 0).toLocaleString('nb-NO')} kr)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  screenHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryItemName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginRight: 12,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  deliveryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  paymentCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  paymentMethodTitleSelected: {
    color: '#3B82F6',
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 36,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3B82F6',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  paymentForm: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  vippsHeader: {
    marginBottom: 0,
  },
  klarnaHeader: {
    marginBottom: 0,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeOrderText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  testModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  testModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
