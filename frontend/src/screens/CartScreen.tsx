import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';
import { useTheme } from '../contexts/ThemeContext';
import type { CartItem } from '../types';

interface DiscountInfo {
  discount: any;
  discountAmount: number;
  finalAmount: number;
}

export default function CartScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountInfo | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await api.getCart();
      if (response.success) {
        setCart(response.data.items || []);
      }
    } catch (error: any) {
      console.error('Failed to load cart:', error);
      if (error.response?.status !== 401) {
        Alert.alert('Feil', 'Kunne ikke laste handlekurv');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }

    try {
      setUpdating(true);
      const item = cart.find(item => item.productId === productId);
      if (!item) {
        Alert.alert('Feil', 'Vare ikke funnet i handlekurv');
        return;
      }
      await api.updateCartItem(item.id, quantity);
      await loadCart();
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke oppdatere antall');
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (productId: string) => {
    try {
      setUpdating(true);
      const item = cart.find(item => item.productId === productId);
      if (!item) {
        Alert.alert('Feil', 'Vare ikke funnet i handlekurv');
        return;
      }
      await api.removeFromCart(item.id);
      await loadCart();
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke fjerne vare');
    } finally {
      setUpdating(false);
    }
  };

  const clearCart = async () => {
    Alert.alert(
      'Tøm handlekurv',
      'Er du sikker på at du vil fjerne alle varer?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Tøm',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await api.clearCart();
              setCart([]);
            } catch (error) {
              Alert.alert('Feil', 'Kunne ikke tømme handlekurv');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price || item.price || 0) * item.quantity, 0);
  };

  const applyDiscountCode = async () => {
    if (!discountCode.trim()) {
      Alert.alert('Feil', 'Vennligst skriv inn en rabattkode');
      return;
    }

    try {
      setValidatingCode(true);
      const orderAmount = calculateTotal();
      const productIds = cart.map(item => item.productId);

      const response = await api.validateDiscountCode(discountCode, orderAmount, productIds);

      if (response.success) {
        setAppliedDiscount(response.data);
        Alert.alert('Suksess', `Rabattkode "${discountCode}" aktivert!`);
      }
    } catch (error: any) {
      Alert.alert(
        'Ugyldig rabattkode',
        error.response?.data?.message || 'Rabattkoden er ugyldig eller utløpt'
      );
      setAppliedDiscount(null);
    } finally {
      setValidatingCode(false);
    }
  };

  const removeDiscountCode = () => {
    setDiscountCode('');
    setAppliedDiscount(null);
  };

  const getFinalTotal = () => {
    const subtotal = calculateTotal();
    if (appliedDiscount) {
      return appliedDiscount.finalAmount;
    }
    return subtotal;
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Tom handlekurv', 'Legg til varer før du går til kassen');
      return;
    }
    navigation.navigate('Checkout');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (cart.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.screenHeader, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <Container>
              <View style={styles.headerContent}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Handlekurv</Text>
              </View>
            </Container>
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={100} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Ingen varer i handlekurven</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Legg til produkter fra butikken for å komme i gang
            </Text>
            <TouchableOpacity
              style={[styles.shopButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
            >
              <Ionicons name="storefront-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.shopButtonText}>Fortsett å handle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.screenHeader, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <Container>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Handlekurv</Text>
          </View>
        </Container>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Container>
          <View style={styles.header}>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart} disabled={updating}>
                <Text style={[styles.clearButton, { color: colors.danger }]}>Tøm kurv</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.itemsContainer}>
            {cart.map((item) => (
              <View key={item.id} style={[styles.cartItem, { backgroundColor: colors.cardBg }]}>
                {item.product.images && item.product.images.length > 0 && (
                  <Image
                    source={{ uri: item.product.images[0] }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.itemDetails}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.product.name}</Text>
                  <Text style={[styles.itemPrice, { color: colors.textSecondary }]}>
                    {`${(item.product.price || item.price || 0).toLocaleString('nb-NO')} kr`}
                  </Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={[styles.quantityButton, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
                      onPress={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      disabled={updating}
                    >
                      <Ionicons name="remove" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.quantityText, { color: colors.text }]}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.quantityButton, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
                      onPress={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      disabled={updating}
                    >
                      <Ionicons name="add" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemTotal, { color: colors.text }]}>
                    {`${((item.product.price || item.price || 0) * item.quantity).toLocaleString('nb-NO')} kr`}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeItem(item.productId)}
                    disabled={updating}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Discount Code Section */}
          <View style={[styles.discountCard, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.discountTitle, { color: colors.text }]}>Har du en rabattkode?</Text>
            {appliedDiscount ? (
              <View style={[styles.appliedDiscountContainer, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
                <View style={styles.appliedDiscountHeader}>
                  <Ionicons name="pricetag" size={20} color={colors.success} />
                  <Text style={[styles.appliedDiscountCode, { color: colors.text }]}>{discountCode}</Text>
                  <TouchableOpacity onPress={removeDiscountCode}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.appliedDiscountText, { color: colors.success }]}>
                  {`Rabatt: -${(appliedDiscount.discountAmount || 0).toLocaleString('nb-NO')} kr`}
                </Text>
              </View>
            ) : (
              <View style={styles.discountInputContainer}>
                <TextInput
                  style={[styles.discountInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                  placeholder="Skriv inn rabattkode"
                  placeholderTextColor={colors.textLight}
                  value={discountCode}
                  onChangeText={setDiscountCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.applyDiscountButton, { backgroundColor: validatingCode ? colors.primary + '80' : colors.primary }]}
                  onPress={applyDiscountCode}
                  disabled={validatingCode}
                >
                  {validatingCode ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.applyDiscountText}>Bruk</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Delsum</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {`${calculateTotal().toLocaleString('nb-NO')} kr`}
              </Text>
            </View>
            {appliedDiscount && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.success }]}>
                  Rabatt ({discountCode})
                </Text>
                <Text style={[styles.summaryValue, { color: colors.success, fontWeight: '600' }]}>
                  {`-${(appliedDiscount.discountAmount || 0).toLocaleString('nb-NO')} kr`}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Frakt</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>Beregnes ved betaling</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {`${getFinalTotal().toLocaleString('nb-NO')} kr`}
              </Text>
            </View>
          </View>
        </Container>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
        <Container>
          <View style={styles.footerContent}>
            <View>
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.footerTotal, { color: colors.text }]}>
                {`${getFinalTotal().toLocaleString('nb-NO')} kr`}
              </Text>
              {appliedDiscount && (
                <Text style={[styles.footerSavings, { color: colors.success }]}>
                  {`Du sparer ${(appliedDiscount.discountAmount || 0).toLocaleString('nb-NO')} kr`}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, { backgroundColor: updating ? colors.primary + '80' : colors.primary }]}
              onPress={handleCheckout}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.checkoutButtonText}>Gå til kassen</Text>
              )}
            </TouchableOpacity>
          </View>
        </Container>
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  screenHeader: {
    borderBottomWidth: 1,
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
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  shopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemsContainer: {
    gap: 16,
  },
  cartItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  removeButton: {
    padding: 8,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
  },
  totalRow: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  footerTotal: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  checkoutButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  discountCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  discountInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  applyDiscountButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 80,
  },
  applyDiscountText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  appliedDiscountContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  appliedDiscountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  appliedDiscountCode: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  appliedDiscountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerSavings: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
