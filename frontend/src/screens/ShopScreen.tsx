import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
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
}

export default function ShopScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadProducts();
  }, [filterType, searchTerm]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts({
        type: filterType || undefined,
        status: 'PUBLISHED',
        search: searchTerm || undefined,
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
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

    // TODO: Backend endpoint not implemented yet
    // try {
    //   await api.trackProductView(product.id);
    // } catch (error) {
    //   console.error('Failed to track product view:', error);
    // }
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setCurrentImageIndex(0);
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

  const handleAddToCart = (product: Product) => {
    const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      image: primaryImage?.url,
      type: product.type,
    });

    Alert.alert('Suksess', `${product.name} lagt til i handlekurven!`);
    closeProductModal();
  };

  const featuredProducts = products.filter(p => p.featured);
  const regularProducts = products.filter(p => !p.featured);

  const renderProductCard = (product: Product) => {
    const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount
      ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
      : 0;

    return (
      <TouchableOpacity
        key={product.id}
        style={styles.productCard}
        onPress={() => openProductModal(product)}
      >
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
              <Ionicons name="image-outline" size={48} color={colors.textLight} />
            </View>
          )}

          {/* Image Count */}
          {product.images.length > 1 && (
            <View style={styles.imageCount}>
              <Ionicons name="images-outline" size={12} color={colors.cardBg} />
              <Text style={styles.imageCountText}>{`${product.images.length}`}</Text>
            </View>
          )}

          {/* Featured Badge */}
          {product.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color={colors.cardBg} />
              <Text style={styles.featuredText}>Fremhevet</Text>
            </View>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{`-${discountPercent}%`}</Text>
            </View>
          )}

          {/* Out of Stock Overlay */}
          {product.trackInventory && product.stock === 0 && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>UTSOLGT</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.productType}>
            <Ionicons name={getTypeIcon(product.type)} size={14} color={colors.textSecondary} />
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
              {`${product.price.toLocaleString()} ${product.currency}`}
            </Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>
                {`${product.compareAtPrice!.toLocaleString()}`}
              </Text>
            )}
          </View>

          {/* PT Service Details */}
          {product.type === 'PT_SERVICE' && (
            <View style={styles.ptDetails}>
              <View style={styles.ptDetailRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.ptDetail}>{`${product.sessionCount} økter`}</Text>
              </View>
              <View style={styles.ptDetailRow}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.ptDetail}>{`Gyldig i ${product.validityDays} dager`}</Text>
              </View>
            </View>
          )}

          {/* Stock Warning */}
          {product.trackInventory && product.stock! > 0 && product.stock! <= 5 && (
            <Text style={styles.stockWarning}>
              {`Kun ${product.stock} igjen på lager`}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
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
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Vår Butikk</Text>
            </View>
          </Container>
        </View>
        <ScrollView>
        <Container>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              Utforsk vårt utvalg av produkter og tjenester
            </Text>
          </View>

          {/* Search and Filter */}
          <View style={styles.searchFilter}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.textLight} style={styles.searchIcon} />
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
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'PT_SERVICE' && styles.filterButtonActive]}
                onPress={() => setFilterType('PT_SERVICE')}
              >
                <Text style={[styles.filterButtonText, filterType === 'PT_SERVICE' && styles.filterButtonTextActive]}>
                  PT-tjenester
                </Text>
              </TouchableOpacity>
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
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Laster produkter...</Text>
            </View>
          )}

          {/* Featured Products */}
          {!loading && featuredProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="star" size={24} color={colors.warning} />
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
              <Ionicons name="cube-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>Ingen produkter funnet</Text>
              <Text style={styles.emptyText}>Prøv å endre søket eller filteret</Text>
            </View>
          )}
        </Container>
      </ScrollView>
      </View>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal
          visible={!!selectedProduct}
          animationType="slide"
          onRequestClose={closeProductModal}
        >
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeProductModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={colors.text} />
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
                        <Ionicons name="chevron-back" size={24} color={colors.cardBg} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.nextButton} onPress={nextImage}>
                        <Ionicons name="chevron-forward" size={24} color={colors.cardBg} />
                      </TouchableOpacity>
                      <Text style={styles.imageIndicator}>
                        {`${currentImageIndex + 1} / ${selectedProduct.images.length}`}
                      </Text>
                    </>
                  )}
                </>
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="image-outline" size={64} color={colors.textLight} />
                </View>
              )}
            </View>

            {/* Product Details */}
            <Container>
              <View style={styles.modalContent}>
                <View style={styles.productType}>
                  <Ionicons name={getTypeIcon(selectedProduct.type)} size={18} color={colors.textSecondary} />
                  <Text style={styles.productTypeText}>{getTypeLabel(selectedProduct.type)}</Text>
                </View>

                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>

                <View style={styles.modalPriceContainer}>
                  <Text style={styles.modalPrice}>
                    {`${selectedProduct.price.toLocaleString()} ${selectedProduct.currency}`}
                  </Text>
                  {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                    <Text style={styles.modalComparePrice}>
                      {`${selectedProduct.compareAtPrice.toLocaleString()} ${selectedProduct.currency}`}
                    </Text>
                  )}
                </View>

                {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
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
                      <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                      <Text style={styles.detailText}>{`${selectedProduct.sessionCount} økter inkludert`}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={20} color={colors.primary} />
                      <Text style={styles.detailText}>{`Gyldig i ${selectedProduct.validityDays} dager`}</Text>
                    </View>
                  </View>
                )}

                {selectedProduct.trackInventory && (
                  <View style={styles.detailItem}>
                    {selectedProduct.stock! > 0 ? (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <Text style={[styles.detailText, { color: colors.success }]}>
                          {`${selectedProduct.stock} på lager`}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color={colors.danger} />
                        <Text style={[styles.detailText, { color: colors.danger }]}>Utsolgt</Text>
                      </>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                <TouchableOpacity
                  style={[
                    styles.addToCartButton,
                    (selectedProduct.trackInventory && selectedProduct.stock === 0) && styles.disabledButton
                  ]}
                  onPress={() => handleAddToCart(selectedProduct)}
                  disabled={selectedProduct.trackInventory && selectedProduct.stock === 0}
                >
                  <Ionicons name="cart-outline" size={20} color={colors.cardBg} />
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
        </Modal>
      )}
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const cardWidth = isWeb ? '31%' : width < 768 ? width - 32 : (width - 64) / 2;

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
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
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
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
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
    gap: 8,
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
    gap: 16,
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
    gap: 4,
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
    gap: 4,
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
    zIndex: 10,
    elevation: 5,
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
    gap: 4,
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
    gap: 4,
  },
  ptDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeButton: {
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
    gap: 12,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#374151',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
});
