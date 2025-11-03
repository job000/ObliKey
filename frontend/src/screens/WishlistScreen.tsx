import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Container from '../components/Container';
import { api } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';

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
  price: number;
  currency: string;
  type: string;
  images: ProductImage[];
  compareAtPrice?: number;
  stock?: number;
  trackInventory: boolean;
}

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  createdAt: string;
}

export default function WishlistScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { addItem } = useCart();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWishlist();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWishlist();
    }, [])
  );

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await api.getWishlist();

      if (response.success && response.data) {
        setWishlistItems(response.data.items || []);
      }
    } catch (error: any) {
      console.error('Failed to load wishlist:', error);
      if (error?.response?.status !== 403) {
        Alert.alert('Feil', 'Kunne ikke laste ønskeliste');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRemoveFromWishlist = async (itemId: string) => {
    try {
      await api.removeFromWishlist(itemId);
      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error: any) {
      console.error('Failed to remove from wishlist:', error);
      Alert.alert('Feil', 'Kunne ikke fjerne fra ønskeliste');
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    const product = item.product;

    if (product.trackInventory && product.stock === 0) {
      Alert.alert('Utsolgt', 'Dette produktet er dessverre utsolgt');
      return;
    }

    try {
      const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];

      await addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        image: primaryImage?.url,
        type: product.type,
      });

      Alert.alert(
        'Lagt til i handlekurven',
        'Vil du fjerne produktet fra ønskelisten?',
        [
          { text: 'Nei', style: 'cancel' },
          {
            text: 'Ja',
            onPress: () => handleRemoveFromWishlist(item.id),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      Alert.alert('Feil', 'Kunne ikke legge til i handlekurven');
    }
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => {
    const product = item.product;
    const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount
      ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
      : 0;
    const isOutOfStock = product.trackInventory && product.stock === 0;

    return (
      <View style={[styles.wishlistItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => {
            /* Navigate to product detail */
          }}
        >
          <View style={styles.imageContainer}>
            {primaryImage ? (
              <Image source={{ uri: primaryImage.url }} style={styles.productImage} resizeMode="cover" />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: colors.background }]}>
                <Ionicons name="image-outline" size={32} color={colors.textLight} />
              </View>
            )}
            {hasDiscount && (
              <View style={[styles.discountBadge, { backgroundColor: colors.danger }]}>
                <Text style={[styles.discountText, { color: colors.cardBg }]}>{`-${discountPercent}%`}</Text>
              </View>
            )}
            {isOutOfStock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={[styles.outOfStockText, { backgroundColor: colors.cardBg, color: colors.text }]}>UTSOLGT</Text>
              </View>
            )}
          </View>

          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={[styles.productDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {product.description}
            </Text>

            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: colors.text }]}>
                {`${product.price.toLocaleString('nb-NO')} ${product.currency}`}
              </Text>
              {hasDiscount && (
                <Text style={[styles.comparePrice, { color: colors.textLight }]}>
                  {`${product.compareAtPrice!.toLocaleString('nb-NO')}`}
                </Text>
              )}
            </View>

            {product.trackInventory && product.stock! > 0 && product.stock! <= 5 && (
              <Text style={[styles.stockWarning, { color: colors.warning }]}>
                {`Kun ${product.stock} igjen på lager`}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.addToCartButton, { backgroundColor: colors.primary }]}
            onPress={() => handleAddToCart(item)}
            disabled={isOutOfStock}
          >
            <Ionicons name="cart-outline" size={20} color={colors.cardBg} />
            <Text style={[styles.actionButtonText, { color: colors.cardBg }]}>
              {isOutOfStock ? 'Utsolgt' : 'Legg i handlekurv'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => handleRemoveFromWishlist(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[styles.actionButtonText, { color: colors.danger }]}>Fjern</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.addedDate, { color: colors.textLight }]}>
          Lagt til: {new Date(item.createdAt).toLocaleDateString('nb-NO')}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <Container title="Min Ønskeliste">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Laster ønskeliste...</Text>
        </View>
      </Container>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <Container title="Min Ønskeliste">
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={colors.textLight} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Din ønskeliste er tom</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Legg til produkter fra butikken for å se dem her
          </Text>
          <TouchableOpacity
            style={[styles.shopButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Shop')}
          >
            <Ionicons name="storefront-outline" size={20} color={colors.cardBg} />
            <Text style={[styles.shopButtonText, { color: colors.cardBg }]}>Gå til butikk</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  return (
    <Container title="Min Ønskeliste">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {wishlistItems.length} {wishlistItems.length === 1 ? 'produkt' : 'produkter'}
          </Text>
          <TouchableOpacity
            style={[styles.shopButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Shop')}
          >
            <Ionicons name="storefront-outline" size={16} color={colors.cardBg} />
            <Text style={[styles.shopButtonText, { color: colors.cardBg, fontSize: 14 }]}>Butikk</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={wishlistItems}
          renderItem={renderWishlistItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadWishlist} tintColor={colors.primary} />
          }
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  wishlistItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    padding: 12,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
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
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  outOfStockOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '700',
    fontSize: 10,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  comparePrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  stockWarning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  addToCartButton: {},
  removeButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addedDate: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
