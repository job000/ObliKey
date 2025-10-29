import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ShoppingCart,
  Star,
  Package,
  Calendar,
  Clock,
  Check,
  X,
  Image as ImageIcon,
  Eye,
  TrendingUp
} from 'lucide-react';
import { api } from '../services/api';
import Layout from '../components/Layout';
import { useCart } from '../contexts/CartContext';
import ProductImageCarousel from '../components/ProductImageCarousel';

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

export const ShopPage: React.FC = () => {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
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
        search: searchTerm || undefined
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
      case 'PHYSICAL_PRODUCT': return <Package className="w-5 h-5" />;
      case 'PT_SERVICE': return <Calendar className="w-5 h-5" />;
      case 'MEMBERSHIP': return <Star className="w-5 h-5" />;
      case 'DIGITAL': return <ImageIcon className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const openProductModal = async (product: Product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);

    // Track product view
    try {
      await api.trackProductView(product.id);
    } catch (error) {
      console.error('Failed to track product view:', error);
      // Don't block user experience if tracking fails
    }
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
      type: product.type
    });

    alert(`${product.name} lagt til i handlekurven!`);
  };

  const featuredProducts = products.filter(p => p.featured);
  const regularProducts = products.filter(p => !p.featured);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Vår Butikk
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Utforsk vårt utvalg av produkter og tjenester
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Søk produkter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">Alle kategorier</option>
                <option value="PHYSICAL_PRODUCT">Fysiske produkter</option>
                <option value="PT_SERVICE">PT-tjenester</option>
                <option value="MEMBERSHIP">Medlemskap</option>
                <option value="DIGITAL">Digitale produkter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Laster produkter...</p>
          </div>
        )}

        {/* Featured Products */}
        {!loading && featuredProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
              Fremhevede produkter
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => openProductModal(product)}
                  getTypeLabel={getTypeLabel}
                  getTypeIcon={getTypeIcon}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Products */}
        {!loading && regularProducts.length > 0 && (
          <div>
            {featuredProducts.length > 0 && (
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Alle produkter</h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => openProductModal(product)}
                  getTypeLabel={getTypeLabel}
                  getTypeIcon={getTypeIcon}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ingen produkter funnet</h3>
            <p className="text-gray-600">Prøv å endre søket eller filteret</p>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              {/* Close Button */}
              <button
                onClick={closeProductModal}
                className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Image Gallery */}
                <div className="p-6 bg-gray-50">
                  <ProductImageCarousel
                    images={selectedProduct.images}
                    productName={selectedProduct.name}
                  />
                </div>

                {/* Product Details */}
                <div className="p-8">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    {getTypeIcon(selectedProduct.type)}
                    <span>{getTypeLabel(selectedProduct.type)}</span>
                  </div>

                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {selectedProduct.name}
                  </h2>

                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {selectedProduct.price.toLocaleString()} {selectedProduct.currency}
                    </span>
                    {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                      <span className="text-xl text-gray-500 line-through">
                        {selectedProduct.compareAtPrice.toLocaleString()} {selectedProduct.currency}
                      </span>
                    )}
                  </div>

                  {/* Discount Badge */}
                  {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                    <div className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium mb-6">
                      Spar {Math.round((1 - selectedProduct.price / selectedProduct.compareAtPrice) * 100)}%
                    </div>
                  )}

                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {selectedProduct.description}
                  </p>

                  {/* Product Details */}
                  <div className="space-y-3 mb-6">
                    {selectedProduct.type === 'PT_SERVICE' && (
                      <>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <span>{selectedProduct.sessionCount} økter inkludert</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <span>Gyldig i {selectedProduct.validityDays} dager</span>
                        </div>
                      </>
                    )}

                    {selectedProduct.trackInventory && (
                      <div className="flex items-center gap-2">
                        {selectedProduct.stock! > 0 ? (
                          <>
                            <Check className="w-5 h-5 text-green-600" />
                            <span className="text-green-600 font-medium">
                              {selectedProduct.stock} på lager
                            </span>
                          </>
                        ) : (
                          <>
                            <X className="w-5 h-5 text-red-600" />
                            <span className="text-red-600 font-medium">Utsolgt</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => handleAddToCart(selectedProduct)}
                      disabled={selectedProduct.trackInventory && selectedProduct.stock === 0}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {selectedProduct.trackInventory && selectedProduct.stock === 0 ? 'Utsolgt' : 'Legg til i handlekurv'}
                    </button>

                    <button
                      onClick={closeProductModal}
                      className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Fortsett å handle
                    </button>
                  </div>

                  {/* Additional Info */}
                  {selectedProduct.sku && (
                    <p className="text-sm text-gray-500 mt-6">
                      Varenummer: {selectedProduct.sku}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

// Product Card Component
interface ProductCardProps {
  product: Product;
  onClick: () => void;
  getTypeLabel: (type: string) => string;
  getTypeIcon: (type: string) => JSX.Element;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, getTypeLabel, getTypeIcon }) => {
  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Product Image */}
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-gray-400" />
          </div>
        )}

        {/* Image Count Indicator */}
        {product.images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white rounded text-xs flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {product.images.length}
          </div>
        )}

        {/* Featured Badge */}
        {product.featured && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-medium flex items-center gap-1">
            <Star className="w-4 h-4 fill-white" />
            Fremhevet
          </div>
        )}

        {/* Discount Badge */}
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <div className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
            -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
          </div>
        )}

        {/* Out of Stock Overlay */}
        {product.trackInventory && product.stock === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="px-4 py-2 bg-white text-gray-900 font-bold rounded-lg">
              UTSOLGT
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          {getTypeIcon(product.type)}
          <span>{getTypeLabel(product.type)}</span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {product.description}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {product.price.toLocaleString()} {product.currency}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-sm text-gray-500 line-through">
              {product.compareAtPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* PT Service Details */}
        {product.type === 'PT_SERVICE' && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {product.sessionCount} økter
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Gyldig i {product.validityDays} dager
            </p>
          </div>
        )}

        {/* Stock Info */}
        {product.trackInventory && product.stock! > 0 && product.stock! <= 5 && (
          <p className="mt-3 text-xs text-orange-600 font-medium">
            Kun {product.stock} igjen på lager
          </p>
        )}
      </div>
    </div>
  );
};
