import React, { useState, useEffect } from 'react';
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
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';
import { useCart } from '../contexts/CartContext';

interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  sku?: string;
  stock?: number;
  trackInventory: boolean;
  slug: string;
  featured: boolean;
  images: ProductImage[];
}

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  notes?: string;
  createdAt: string;
}

export default function WishlistScreen({ navigation }: any) {
  const { addItem } = useCart();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await api.getWishlist();
      if (response.success && response.data) {
        setWishlistItems(response.data.items || []);
      }
    } catch (error: any) {
      console.error('Failed to load wishlist:', error);
      if (error.response?.status !== 401) {
        Alert.alert('Feil', 'Kunne ikke laste ønskeliste');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      setRemoving(itemId);
      await api.removeFromWishlist(itemId);
      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
      Alert.alert('Suksess', 'Fjernet fra ønskeliste');
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke fjerne fra ønskeliste');
    } finally {
      setRemoving(null);
    }
  };

  const addToCart = async (product: Product) => {
    const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];

    try {
      await addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        image: primaryImage?.url,
        type: product.type,
      });

      Alert.alert('Suksess', `${product.name} lagt til i handlekurven!`);
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke legge til i handlekurv');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PHYSICAL_PRODUCT': return 'Fysisk produkt';
      case 'PT_SERVICE': return 'PT-tjeneste';
      case 'MEMBERSHIP': return 'Medlemskap';
      case 'DIGITAL': return 'Digitalt';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PHYSICAL_PRODUCT': return 'cube-outline';
      case 'PT_SERVICE': return 'calendar-outline';
      case 'MEMBERSHIP': return 'star-outline';
      case 'DIGITAL': return 'download-outline';
      default: return 'cube-outline';
    }
  };

  const renderWishlistItem = (item: WishlistItem) => {
    const product = item.product;
    const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount
      ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
      : 0;
    const isRemoving = removing === item.id;
    const isOutOfStock = product.trackInventory && product.stock === 0;

    return (
      <View key={item.id} style={styles.wishlistItem}>
        {/* Product Image */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => navigation.navigate('Shop')}
        >
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage.url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={48} color="#9CA3AF" />
            </View>
          )}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{`-${discountPercent}%`}</Text>
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>UTSOLGT</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Product Info */}
        <View style={styles.itemDetails}>
          <View style={styles.productType}>
            <Ionicons name={getTypeIcon(product.type)} size={14} color="#6B7280" />
            <Text style={styles.productTypeText}>{getTypeLabel(product.type)}</Text>
          </View>

          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          <Text style={styles.productDescription} numberOfLines={2}>
            {product.description}
          </Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {`${product.price.toLocaleString('nb-NO')} ${product.currency}`}
            </Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>
                {`${product.compareAtPrice!.toLocaleString('nb-NO')}`}
              </Text>
            )}
          </View>

          {/* Stock Warning */}
          {product.trackInventory && product.stock! > 0 && product.stock! <= 5 && (
            <Text style={styles.stockWarning}>
              {`Kun ${product.stock} igjen på lager`}
            </Text>
          )}

          {item.notes && (
            <Text style={styles.notes}>
              {`Notat: ${item.notes}`}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.addToCartButton, isOutOfStock && styles.buttonDisabled]}
              onPress={() => addToCart(product)}
              disabled={isOutOfStock}
            >
              <Ionicons name="cart-outline" size={16} color={isOutOfStock ? '#9CA3AF' : '#3B82F6'} />
              <Text style={[styles.addToCartText, isOutOfStock && styles.buttonTextDisabled]}>
                {isOutOfStock ? 'Utsolgt' : 'Legg til i kurv'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.removeButton, isRemoving && styles.buttonDisabled]}
              onPress={() => removeFromWishlist(item.id)}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.removeText}>Fjern</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Laster ønskeliste...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Container>
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Ønskelisten er tom</Text>
              <Text style={styles.emptySubtitle}>
                Legg til produkter du ønsker deg fra butikken
              </Text>
              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => navigation.navigate('Shop')}
              >
                <Text style={styles.shopButtonText}>Gå til butikken</Text>
              </TouchableOpacity>
            </View>
          </Container>
        </View>
      </SafeAreaView>
    );
  }

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
            <View>
              <Text style={styles.headerTitle}>Min ønskeliste</Text>
              <Text style={styles.headerSubtitle}>
                {`${wishlistItems.length} ${wishlistItems.length === 1 ? 'produkt' : 'produkter'}`}
              </Text>
            </View>
          </View>
        </Container>
      </View>
      <ScrollView>
        <Container>

          <View style={styles.listContainer}>
            {wishlistItems.map(renderWishlistItem)}
          </View>
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
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    gap: 16,
    paddingBottom: 24,
  },
  wishlistItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageContainer: {
    width: 140,
    height: 140,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  outOfStockOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontWeight: 'bold',
    color: '#111827',
    fontSize: 12,
  },
  itemDetails: {
    flex: 1,
    padding: 12,
  },
  productType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  productTypeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  comparePrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  stockWarning: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
    marginBottom: 6,
  },
  notes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  addToCartText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    minWidth: 90,
  },
  removeText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
});
