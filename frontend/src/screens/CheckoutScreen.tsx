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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import Container from '../components/Container';
import { useCart } from '../contexts/CartContext';

type PaymentMethod = 'CARD' | 'VIPPS' | 'KLARNA';

interface DeliveryInfo {
  address: string;
  city: string;
  zip: string;
  country: string;
}

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const { items, total, clearCart, loadCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('CARD');
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

  // Klarna payment fields
  const [klarnaEmail, setKlarnaEmail] = useState('');

  useEffect(() => {
    loadCart();
    // Check if any items require physical delivery
    const hasPhysicalProducts = items.some(
      (item: any) => item.product?.type === 'PHYSICAL_PRODUCT'
    );
    setRequiresDelivery(hasPhysicalProducts);
  }, []);

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

  const validateKlarnaPayment = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(klarnaEmail)) {
      Alert.alert('Ugyldig e-post', 'Vennligst skriv inn en gyldig e-postadresse');
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
      case 'KLARNA':
        paymentValid = validateKlarnaPayment();
        break;
    }

    if (!paymentValid) {
      return;
    }

    try {
      setLoading(true);

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

      // Create order
      const response = await api.createOrder(orderData);

      if (response.success) {
        // Clear cart after successful order
        await clearCart();

        // Show success message
        Alert.alert(
          'Bestilling bekreftet!',
          `Din bestilling er mottatt. Ordrenummer: ${response.data.orderNumber}`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('PurchaseHistory' as never);
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Order creation error:', error);
      Alert.alert(
        'Feil',
        error.response?.data?.error || 'Kunne ikke fullføre bestillingen. Prøv igjen.'
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
              color={isSelected ? '#3B82F6' : '#6B7280'}
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
    switch (selectedPaymentMethod) {
      case 'CARD':
        return (
          <View style={styles.paymentForm}>
            <Text style={styles.formSectionTitle}>Kortinformasjon</Text>
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
              <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                Dette er en demo. Alle kortnumre vil bli godkjent.
              </Text>
            </View>
          </View>
        );

      case 'VIPPS':
        return (
          <View style={styles.paymentForm}>
            <View style={styles.vippsHeader}>
              <Text style={styles.formSectionTitle}>Betal med Vipps</Text>
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
              <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                Dette er en demo. Betalingen vil automatisk godkjennes.
              </Text>
            </View>
          </View>
        );

      case 'KLARNA':
        return (
          <View style={styles.paymentForm}>
            <View style={styles.klarnaHeader}>
              <Text style={styles.formSectionTitle}>Betal med Klarna</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>E-postadresse</Text>
              <TextInput
                style={styles.input}
                placeholder="din@epost.no"
                value={klarnaEmail}
                onChangeText={setKlarnaEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                Dette er en demo. Betalingen vil automatisk godkjennes.
              </Text>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <Container>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#111827" />
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
              {renderPaymentMethodCard(
                'CARD',
                'Kort',
                'card-outline',
                'Betal med debet- eller kredittkort'
              )}
              {renderPaymentMethodCard(
                'VIPPS',
                'Vipps',
                'phone-portrait-outline',
                'Betal enkelt med Vipps'
              )}
              {renderPaymentMethodCard(
                'KLARNA',
                'Klarna',
                'wallet-outline',
                'Betal senere med Klarna'
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
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
                  <Text style={styles.placeOrderText}>
                    Bekreft bestilling ({(total || 0).toLocaleString('nb-NO')} kr)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Container>
        </ScrollView>
      </View>
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
});
