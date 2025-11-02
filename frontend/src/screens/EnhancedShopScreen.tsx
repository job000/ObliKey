import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import Container from '../components/Container';
import { useCart } from '../contexts/CartContext';
import { useModules } from '../contexts/ModuleContext';

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
  type: 'PHYSICAL_PRODUCT' | 'PT_SERVICE' | 'MEMBERSHIP' | 'DIGITAL';
  status: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  sku?: string;
  stock?: number;
  trackInventory: boolean;
  sessionCount?: number;
  validityDays?: number;
  slug: string;
  featured: boolean;
  images: ProductImage[];
  _count?: {
    wishlistItems: number;
    reviews: number;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  isActive: boolean;
  productCount?: number;
  children?: Category[];
}

interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  price?: number;
  stock?: number;
  isActive: boolean;
  attributes: Array<{
    attributeName: string;
    valueName: string;
  }>;
}

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  userName: string;
  createdAt: string;
  helpfulCount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
}

interface ProductRating {
  averageRating: number;
  totalReviews: number;
  distribution: { [key: number]: number };
}

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
}

export default function EnhancedShopScreen({ route }: any) {
  const { addItem } = useCart();
  const { modules } = useModules();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<ProductRating | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => {
    loadCategories();
    loadWishlist();
    // Handle route params for filtering (e.g., from PT Sessions screen)
    if (route?.params?.filter) {
      // Map PT_SESSION to PT_SERVICE for consistency
      const filter = route.params.filter === 'PT_SESSION' ? 'PT_SERVICE' : route.params.filter;
      setFilterType(filter);
    }
  }, [route?.params]);

  useEffect(() => {
    loadProducts();
  }, [filterType, searchTerm, selectedCategory]);

  // Refresh products when screen gains focus (e.g., after unpublishing in admin)
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [filterType, searchTerm, selectedCategory])
  );

  const loadCategories = async () => {
    try {
      const response = await api.getCategories(true);
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error: any) {
      // Silently handle errors if module is not enabled
      if (error?.response?.status === 403) {
        console.log('[EnhancedShop] Categories module not enabled for this tenant');
      } else {
        console.error('Failed to load categories:', error);
      }
      setCategories([]);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts({
        type: filterType || undefined,
        status: 'PUBLISHED',
        search: searchTerm || undefined,
        categoryId: selectedCategory || undefined,
      });
      setProducts(response.data);
    } catch (error: any) {
      // Silently handle errors if module is not enabled
      if (error?.response?.status === 403) {
        console.log('[EnhancedShop] Products module not enabled for this tenant');
      } else {
        console.error('Failed to load products:', error);
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = async () => {
    try {
      const response = await api.getWishlist();
      if (response.success && response.data) {
        setWishlist(response.data.items || []);
      }
    } catch (error: any) {
      // Silently handle errors if module is not enabled
      if (error?.response?.status === 403) {
        console.log('[EnhancedShop] Wishlist module not enabled for this tenant');
      } else {
        console.error('Failed to load wishlist:', error);
      }
      setWishlist([]);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.productId === productId);
  };

  const toggleWishlist = async (product: Product) => {
    const inWishlist = isInWishlist(product.id);

    try {
      if (inWishlist) {
        const wishlistItem = wishlist.find(item => item.productId === product.id);
        if (wishlistItem) {
          await api.removeFromWishlist(wishlistItem.id);
          // Update local state immediately for better UX
          setWishlist(wishlist.filter(item => item.id !== wishlistItem.id));
        }
      } else {
        const response = await api.addToWishlist(product.id);
        // Update local state immediately for better UX
        if (response.success && response.data) {
          setWishlist([...wishlist, response.data]);
        }
      }
    } catch (error: any) {
      // Silently handle errors if module is not enabled
      if (error?.response?.status === 403) {
        console.log('[EnhancedShop] Wishlist module not enabled for this tenant');
        Alert.alert('Info', 'Ønskeliste-funksjonen er ikke aktivert for denne butikken');
      } else {
        console.error('Failed to toggle wishlist:', error);
        Alert.alert('Feil', 'Kunne ikke oppdatere ønskeliste');
        // Reload wishlist to sync with server
        await loadWishlist();
      }
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

  const openProductModal = async (product: Product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
    setSelectedVariant(null);

    // Load variants
    try {
      const variantsResponse = await api.getProductVariants(product.id);
      if (variantsResponse.success) {
        setVariants(variantsResponse.data);
        if (variantsResponse.data.length > 0) {
          setSelectedVariant(variantsResponse.data[0]);
        }
      }
    } catch (error: any) {
      // Silently handle errors if module is not enabled
      if (error?.response?.status === 403) {
        console.log('[EnhancedShop] Variants module not enabled for this tenant');
      } else {
        console.error('Failed to load variants:', error);
      }
      setVariants([]);
    }

    // Load reviews
    try {
      const reviewsResponse = await api.getProductReviews(product.id);
      if (reviewsResponse.success && reviewsResponse.data) {
        setReviews(reviewsResponse.data.reviews || []);
        setRating(reviewsResponse.data.rating);
      }
    } catch (error: any) {
      // Silently handle errors if module is not enabled
      if (error?.response?.status === 403) {
        console.log('[EnhancedShop] Reviews module not enabled for this tenant');
      } else {
        console.error('Failed to load reviews:', error);
      }
      setReviews([]);
      setRating(null);
    }
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setCurrentImageIndex(0);
    setVariants([]);
    setSelectedVariant(null);
    setReviews([]);
    setRating(null);
  };

  const nextImage = () => {
    if (selectedProduct && selectedProduct.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedProduct.images.length);
    }
  };

  const prevImage = () => {
    if (selectedProduct && selectedProduct.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedProduct.images.length - 1 : prev - 1
      );
    }
  };

  const handleAddToCart = async (product: Product) => {
    try {
      const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
      const finalPrice = selectedVariant?.price || product.price;

      await addItem({
        productId: product.id,
        name: product.name,
        price: finalPrice,
        currency: product.currency,
        image: primaryImage?.url,
        type: product.type,
        variantId: selectedVariant?.id,
      });

      Alert.alert('Suksess', `${product.name} lagt til i handlekurven!`);
      closeProductModal();
    } catch (error: any) {
      if (error?.response?.status === 403) {
        console.log('[EnhancedShop] Cart module not enabled for this tenant');
        Alert.alert('Feil', 'Handlekurv-funksjonen er ikke aktivert');
      } else {
        console.error('Failed to add to cart:', error);
        Alert.alert('Feil', 'Kunne ikke legge til produkt i handlekurven');
      }
    }
  };

  const handleQuickAddToCart = async (product: Product) => {
    try {
      // Check if product is out of stock
      if (product.trackInventory && product.stock === 0) {
        Alert.alert('Utsolgt', 'Dette produktet er dessverre utsolgt');
        return;
      }

      const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];

      await addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        image: primaryImage?.url,
        type: product.type,
      });

      Alert.alert('Suksess', `${product.name} lagt til i handlekurven!`);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        console.log('[EnhancedShop] Cart module not enabled for this tenant');
        Alert.alert('Feil', 'Handlekurv-funksjonen er ikke aktivert');
      } else {
        console.error('Failed to quick add to cart:', error);
        Alert.alert('Feil', 'Kunne ikke legge til produkt i handlekurven');
      }
    }
  };

  const featuredProducts = products.filter(p => p.featured);
  const regularProducts = products.filter(p => !p.featured);

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <View key={i} style={[styles.starContainer, i < 5 && styles.starSpacing]}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={size}
            color={i <= rating ? '#EAB308' : '#D1D5DB'}
          />
        </View>
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  const renderProductCard = (product: Product) => {
    const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount
      ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
      : 0;
    const inWishlist = isInWishlist(product.id);

    return (
      <View key={product.id} style={styles.productCard}>
        <TouchableOpacity onPress={() => openProductModal(product)}>
          {/* Product Image */}
          <View style={styles.productImageContainer}>
            {primaryImage ? (
              <Image
                source={{ uri: primaryImage.url }}
                style={styles.productImage as any}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
              </View>
            )}

            {/* Image Count */}
            {product.images.length > 1 && (
              <View style={styles.imageCount}>
                <Ionicons name="images-outline" size={12} color="#FFF" />
                <Text style={styles.imageCountText}>{`${product.images.length}`}</Text>
              </View>
            )}

            {/* Featured Badge */}
            {!!product.featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#FFF" />
                <Text style={styles.featuredText}>Fremhevet</Text>
              </View>
            )}

            {/* Discount Badge */}
            {!!hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{`-${discountPercent}%`}</Text>
              </View>
            )}

            {/* Out of Stock Overlay */}
            {!!product.trackInventory && product.stock === 0 && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockText}>UTSOLGT</Text>
              </View>
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
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
              {!!hasDiscount && (
                <Text style={styles.comparePrice}>
                  {`${product.compareAtPrice!.toLocaleString('nb-NO')}`}
                </Text>
              )}
            </View>

            {/* PT Service Details */}
            {product.type === 'PT_SERVICE' && (
              <View style={styles.ptDetails}>
                <View style={styles.ptDetailRow}>
                  <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                  <Text style={styles.ptDetail}>{`${product.sessionCount} økter`}</Text>
                </View>
                <View style={styles.ptDetailRow}>
                  <Ionicons name="time-outline" size={12} color="#6B7280" />
                  <Text style={styles.ptDetail}>{`Gyldig i ${product.validityDays} dager`}</Text>
                </View>
              </View>
            )}

            {/* Stock Warning */}
            {!!product.trackInventory && product.stock! > 0 && product.stock! <= 5 && (
              <Text style={styles.stockWarning}>
                {`Kun ${product.stock} igjen på lager`}
              </Text>
            )}

            {/* Stats */}
            {((product._count?.wishlistItems ?? 0) > 0 || (product._count?.reviews ?? 0) > 0) && (
              <View style={styles.productStats}>
                {(product._count?.wishlistItems ?? 0) > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="heart" size={12} color="#EF4444" />
                    <Text style={styles.statText}>{`${product._count?.wishlistItems ?? 0}`}</Text>
                  </View>
                )}
                {(product._count?.reviews ?? 0) > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble" size={12} color="#3B82F6" />
                    <Text style={styles.statText}>{`${product._count?.reviews ?? 0}`}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Wishlist Button */}
        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={() => toggleWishlist(product)}
        >
          <Ionicons
            name={inWishlist ? 'heart' : 'heart-outline'}
            size={24}
            color={inWishlist ? '#EF4444' : '#6B7280'}
          />
        </TouchableOpacity>

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => handleQuickAddToCart(product)}
          disabled={!!product.trackInventory && product.stock === 0}
        >
          <Ionicons
            name="cart-outline"
            size={20}
            color={product.trackInventory && product.stock === 0 ? '#9CA3AF' : '#FFF'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <Container>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Vår Butikk</Text>
            <Text style={styles.subtitle}>
              Utforsk vårt utvalg av produkter og tjenester
            </Text>
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              <TouchableOpacity
                style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.categoryChipText, selectedCategory === null && styles.categoryChipTextActive]}>
                  Alle
                </Text>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  {!!category.icon && (
                    <View>
                      <Ionicons name={category.icon as any} size={16} color={selectedCategory === category.id ? '#FFF' : '#6B7280'} />
                    </View>
                  )}
                  <Text style={[styles.categoryChipText, selectedCategory === category.id && styles.categoryChipTextActive]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Search and Filter */}
          <View style={styles.searchFilter}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Søk produkter..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            <View style={styles.filterButtonsContainer}>
              <TouchableOpacity
                style={[styles.filterButton, filterType === '' && styles.filterButtonActive]}
                onPress={() => setFilterType('')}
              >
                <Text style={[styles.filterButtonText, filterType === '' && styles.filterButtonTextActive]}>
                  Alle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'PHYSICAL_PRODUCT' && styles.filterButtonActive]}
                onPress={() => setFilterType('PHYSICAL_PRODUCT')}
              >
                <Text style={[styles.filterButtonText, filterType === 'PHYSICAL_PRODUCT' && styles.filterButtonTextActive]}>
                  Produkter
                </Text>
              </TouchableOpacity>
              {modules.pt && (
                <TouchableOpacity
                  style={[styles.filterButton, filterType === 'PT_SERVICE' && styles.filterButtonActive]}
                  onPress={() => setFilterType('PT_SERVICE')}
                >
                  <Text style={[styles.filterButtonText, filterType === 'PT_SERVICE' && styles.filterButtonTextActive]}>
                    PT-tjenester
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'MEMBERSHIP' && styles.filterButtonActive]}
                onPress={() => setFilterType('MEMBERSHIP')}
              >
                <Text style={[styles.filterButtonText, filterType === 'MEMBERSHIP' && styles.filterButtonTextActive]}>
                  Medlemskap
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Laster produkter...</Text>
            </View>
          )}

          {/* Featured Products */}
          {!loading && featuredProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="star" size={24} color="#EAB308" />
                <Text style={styles.sectionTitle}>Fremhevede produkter</Text>
              </View>
              <View style={styles.productGrid}>
                {featuredProducts.map(renderProductCard)}
              </View>
            </View>
          )}

          {/* Regular Products */}
          {!loading && regularProducts.length > 0 && (
            <View style={styles.section}>
              {featuredProducts.length > 0 && (
                <Text style={styles.sectionTitle}>Alle produkter</Text>
              )}
              <View style={styles.productGrid}>
                {regularProducts.map(renderProductCard)}
              </View>
            </View>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Ingen produkter funnet</Text>
              <Text style={styles.emptyText}>Prøv å endre søket eller filteret</Text>
            </View>
          )}
        </Container>
      </ScrollView>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal
          visible={!!selectedProduct}
          animationType="slide"
          onRequestClose={closeProductModal}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <StatusBar barStyle="dark-content" />
            <ScrollView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeProductModal} style={styles.closeButton}>
                  <Ionicons name="close" size={28} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.wishlistButtonHeader}
                  onPress={() => selectedProduct && toggleWishlist(selectedProduct)}
                >
                  <Ionicons
                    name={isInWishlist(selectedProduct.id) ? 'heart' : 'heart-outline'}
                    size={28}
                    color={isInWishlist(selectedProduct.id) ? '#EF4444' : '#6B7280'}
                  />
                </TouchableOpacity>
              </View>

            {/* Image Gallery */}
            <View style={styles.imageGallery}>
              {selectedProduct.images.length > 0 ? (
                <>
                  <Image
                    source={{ uri: selectedProduct.images[currentImageIndex].url }}
                    style={styles.modalImage as any}
                    resizeMode="contain"
                  />
                  {selectedProduct.images.length > 1 && (
                    <>
                      <TouchableOpacity style={styles.prevButton} onPress={prevImage}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.nextButton} onPress={nextImage}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={styles.imageIndicator}>
                        {`${currentImageIndex + 1} / ${selectedProduct.images.length}`}
                      </Text>
                    </>
                  )}
                </>
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="image-outline" size={64} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Product Details */}
            <Container>
              <View style={styles.modalContent}>
                <View style={styles.productType}>
                  <Ionicons name={getTypeIcon(selectedProduct.type)} size={18} color="#6B7280" />
                  <Text style={styles.productTypeText}>{getTypeLabel(selectedProduct.type)}</Text>
                </View>

                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>

                {/* Rating */}
                {rating && rating.totalReviews > 0 && (
                  <View style={styles.ratingContainer}>
                    <View>
                      {renderStars(Math.round(rating.averageRating), 20)}
                    </View>
                    <Text style={styles.ratingText}>
                      {`${rating.averageRating.toFixed(1)} (${rating.totalReviews} anmeldelser)`}
                    </Text>
                  </View>
                )}

                {/* Variants */}
                {variants.length > 0 && (
                  <View style={styles.variantsContainer}>
                    <Text style={styles.variantsTitle}>Velg variant:</Text>
                    <View style={styles.variantsList}>
                      {variants.map((variant) => {
                        const variantText = variant.attributes.map((attr, idx) => `${idx > 0 ? ', ' : ''}${attr.valueName}`).join('');
                        return (
                          <TouchableOpacity
                            key={variant.id}
                            style={[
                              styles.variantChip,
                              selectedVariant?.id === variant.id && styles.variantChipActive
                            ]}
                            onPress={() => setSelectedVariant(variant)}
                          >
                            <Text
                              style={[
                                styles.variantChipText,
                                selectedVariant?.id === variant.id && styles.variantChipTextActive
                              ]}
                            >
                              {variantText}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={styles.modalPriceContainer}>
                  <Text style={styles.modalPrice}>
                    {`${(selectedVariant?.price || selectedProduct.price).toLocaleString('nb-NO')} ${selectedProduct.currency}`}
                  </Text>
                  {!!selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                    <Text style={styles.modalComparePrice}>
                      {`${selectedProduct.compareAtPrice.toLocaleString('nb-NO')} ${selectedProduct.currency}`}
                    </Text>
                  )}
                </View>

                {!!selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>
                      {`Spar ${Math.round((1 - selectedProduct.price / selectedProduct.compareAtPrice) * 100)}%`}
                    </Text>
                  </View>
                )}

                <Text style={styles.modalDescription}>{selectedProduct.description}</Text>

                {/* Product Details */}
                {selectedProduct.type === 'PT_SERVICE' && (
                  <View style={styles.detailsList}>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                      <Text style={styles.detailText}>{`${selectedProduct.sessionCount} økter inkludert`}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={20} color="#3B82F6" />
                      <Text style={styles.detailText}>{`Gyldig i ${selectedProduct.validityDays} dager`}</Text>
                    </View>
                  </View>
                )}

                {selectedProduct.trackInventory && (
                  <View style={styles.detailItem}>
                    {selectedProduct.stock! > 0 ? (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={[styles.detailText, { color: '#10B981' }]}>
                          {`${selectedProduct.stock} på lager`}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                        <Text style={[styles.detailText, { color: '#EF4444' }]}>Utsolgt</Text>
                      </>
                    )}
                  </View>
                )}

                {/* Reviews Section */}
                <View style={styles.reviewsSection}>
                  <Text style={styles.reviewsTitle}>Anmeldelser</Text>

                  {reviews.length === 0 ? (
                    <Text style={styles.noReviewsText}>Ingen anmeldelser ennå.</Text>
                  ) : (
                    reviews.map((review) => (
                      <View key={review.id} style={styles.reviewCard}>
                        {renderStars(review.rating)}
                        {review.title && (
                          <Text style={styles.reviewTitle}>{review.title}</Text>
                        )}
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                        <View style={styles.reviewFooter}>
                          <Text style={styles.reviewAuthor}>{review.userName}</Text>
                          <Text style={styles.reviewDate}>
                            {new Date(review.createdAt).toLocaleDateString('nb-NO')}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                  style={[
                    styles.addToCartButton,
                    (selectedProduct.trackInventory && selectedProduct.stock === 0) && styles.disabledButton
                  ]}
                  onPress={() => handleAddToCart(selectedProduct)}
                  disabled={selectedProduct.trackInventory && selectedProduct.stock === 0}
                >
                  <Ionicons name="cart-outline" size={20} color="#FFF" />
                  <Text style={styles.addToCartText}>
                    {selectedProduct.trackInventory && selectedProduct.stock === 0
                      ? 'Utsolgt'
                      : 'Legg til i handlekurv'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={closeProductModal}
                >
                  <Text style={styles.continueButtonText}>Fortsett å handle</Text>
                </TouchableOpacity>

                {selectedProduct.sku && (
                  <Text style={styles.skuText}>{`Varenummer: ${selectedProduct.sku}`}</Text>
                )}
              </View>
            </Container>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const cardWidth = isWeb ? '31%' : width < 768 ? width - 32 : (width - 64) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  searchFilter: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: cardWidth,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
    marginBottom: 16,
  },
  productImageContainer: {
    height: 200,
    backgroundColor: '#F3F4F6',
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
  imageCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  imageCountText: {
    color: '#FFF',
    fontSize: 12,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    fontWeight: 'bold',
    color: '#111827',
  },
  productInfo: {
    padding: 16,
  },
  productType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productTypeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  comparePrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  ptDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ptDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ptDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  stockWarning: {
    marginTop: 8,
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
  },
  productStats: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addToCartButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF',
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
  },
  wishlistButtonHeader: {
    padding: 8,
  },
  imageGallery: {
    height: 400,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  prevButton: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  nextButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  variantsContainer: {
    marginBottom: 16,
  },
  variantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  variantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  variantChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 8,
  },
  variantChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  variantChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  variantChipTextActive: {
    color: '#3B82F6',
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 16,
  },
  modalPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalComparePrice: {
    fontSize: 20,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  savingsText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailsList: {
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#374151',
  },
  reviewsSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  reviewsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 8,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  reviewAuthor: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  continueButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  continueButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  skuText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  starContainer: {},
  starSpacing: {
    marginRight: 2,
  },
  starsRow: {
    flexDirection: 'row',
  },
});
