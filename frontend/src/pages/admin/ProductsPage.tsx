import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Save,
  X,
  Check,
  Star
} from 'lucide-react';
import { api } from '../../services/api';
import Layout from '../../components/Layout';

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
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
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
  sortOrder: number;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'PHYSICAL_PRODUCT' as Product['type'],
    price: 0,
    compareAtPrice: 0,
    currency: 'NOK',
    sku: '',
    stock: 0,
    trackInventory: false,
    sessionCount: 1,
    validityDays: 30,
    slug: '',
    featured: false,
    sortOrder: 0
  });

  useEffect(() => {
    loadProducts();
  }, [filterType, filterStatus, searchTerm]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts({
        type: filterType || undefined,
        // Only show ARCHIVED if explicitly selected, otherwise exclude them
        status: filterStatus ? filterStatus : undefined,
        search: searchTerm || undefined
      });

      // Filter out ARCHIVED products unless explicitly showing them
      const filteredProducts = filterStatus === 'ARCHIVED'
        ? response.data
        : response.data.filter((p: any) => p.status !== 'ARCHIVED');

      setProducts(filteredProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      const response = await api.createProduct(formData);
      setProducts([response.data, ...products]);
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke opprette produkt');
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const response = await api.updateProduct(editingProduct.id, formData);
      setProducts(products.map(p => p.id === editingProduct.id ? response.data : p));
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke oppdatere produkt');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette dette produktet? Det vil arkiveres og fjernes fra listen.')) return;

    try {
      await api.deleteProduct(id);
      // Remove from local state immediately
      setProducts(products.filter(p => p.id !== id));
      alert('Produkt slettet!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke slette produkt');
      // Reload if error to ensure consistency
      await loadProducts();
    }
  };

  const handlePublishProduct = async (id: string) => {
    try {
      const response = await api.publishProduct(id);
      setProducts(products.map(p => p.id === id ? response.data : p));
      alert('Produkt publisert!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke publisere produkt');
    }
  };

  const handleUnpublishProduct = async (id: string) => {
    try {
      const response = await api.unpublishProduct(id);
      setProducts(products.map(p => p.id === id ? response.data : p));
      alert('Produkt avpublisert! Det er nå skjult for kunder.');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke avpublisere produkt');
    }
  };

  const handleImageUpload = async (productId: string, files: FileList) => {
    try {
      setUploadingImages(true);
      const filesArray = Array.from(files);

      console.log('Starting image upload for product:', productId);
      console.log('Number of files:', filesArray.length);

      // Validate file sizes (max 5MB each)
      const maxSize = 5 * 1024 * 1024;
      for (const file of filesArray) {
        if (file.size > maxSize) {
          throw new Error(`Filen "${file.name}" er for stor. Maksimal størrelse er 5MB.`);
        }
        if (!file.type.startsWith('image/')) {
          throw new Error(`Filen "${file.name}" er ikke et bilde.`);
        }
      }

      // Upload all images sequentially for better error tracking
      for (let index = 0; index < filesArray.length; index++) {
        const file = filesArray[index];
        console.log(`Uploading file ${index + 1}/${filesArray.length}:`, file.name);

        try {
          const uploadResponse = await api.uploadImage(file);
          console.log('Upload response:', uploadResponse);

          if (!uploadResponse.data || !uploadResponse.data.url) {
            throw new Error('Upload-responsen manglet URL');
          }

          const imageData = {
            url: uploadResponse.data.url,
            sortOrder: index,
            isPrimary: index === 0
          };
          console.log('Adding product image with data:', imageData);

          await api.addProductImage(productId, imageData);
        } catch (err: any) {
          console.error(`Feil ved opplasting av ${file.name}:`, err);
          throw new Error(`Kunne ikke laste opp ${file.name}: ${err.message || err.response?.data?.error || 'Ukjent feil'}`);
        }
      }

      await loadProducts();
      alert(`${filesArray.length} bilde(r) lastet opp!`);
    } catch (error: any) {
      console.error('Image upload error:', error);
      const errorMessage = error.message || error.response?.data?.error || 'Kunne ikke laste opp bilder';
      alert(errorMessage);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette bildet?')) return;

    try {
      await api.deleteProductImage(imageId);
      await loadProducts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke slette bilde');
    }
  };

  const handleSetPrimaryImage = async (productId: string, imageId: string) => {
    try {
      await api.updateProductImage(imageId, { isPrimary: true });
      await loadProducts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Kunne ikke sette primærbilde');
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      type: product.type,
      price: product.price,
      compareAtPrice: product.compareAtPrice || 0,
      currency: product.currency,
      sku: product.sku || '',
      stock: product.stock || 0,
      trackInventory: product.trackInventory,
      sessionCount: product.sessionCount || 1,
      validityDays: product.validityDays || 30,
      slug: product.slug,
      featured: product.featured,
      sortOrder: product.sortOrder
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'PHYSICAL_PRODUCT',
      price: 0,
      compareAtPrice: 0,
      currency: 'NOK',
      sku: '',
      stock: 0,
      trackInventory: false,
      sessionCount: 1,
      validityDays: 30,
      slug: '',
      featured: false,
      sortOrder: 0
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Produktadministrasjon</h1>
        <p className="text-gray-600">Administrer produkter, tjenester og medlemskap</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Søk produkter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle typer</option>
            <option value="PHYSICAL_PRODUCT">Fysisk produkt</option>
            <option value="PT_SERVICE">PT-tjeneste</option>
            <option value="MEMBERSHIP">Medlemskap</option>
            <option value="DIGITAL">Digitalt</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle statuser</option>
            <option value="PUBLISHED">Publisert</option>
            <option value="DRAFT">Utkast</option>
            <option value="ARCHIVED">Arkivert</option>
          </select>

          <button
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nytt produkt
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laster produkter...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ingen produkter</h3>
          <p className="text-gray-600">Kom i gang ved å opprette ditt første produkt</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Product Image */}
              <div className="relative h-48 bg-gray-100">
                {product.images.find(img => img.isPrimary)?.url ? (
                  <img
                    src={product.images.find(img => img.isPrimary)?.url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}

                {/* Status Badge */}
                <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                  {product.status === 'PUBLISHED' ? 'Publisert' : product.status === 'DRAFT' ? 'Utkast' : 'Arkivert'}
                </span>

                {/* Featured Badge */}
                {product.featured && (
                  <Star className="absolute top-2 left-2 w-6 h-6 text-yellow-500 fill-yellow-500" />
                )}

                {/* Image Upload Overlay */}
                <label className={`absolute bottom-2 right-2 p-2 bg-white rounded-lg shadow-sm ${uploadingImages ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}>
                  {uploadingImages ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-5 h-5 text-gray-600" />
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleImageUpload(product.id, e.target.files)}
                    disabled={uploadingImages}
                  />
                </label>
              </div>

              {/* Product Details */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600">{getTypeLabel(product.type)}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-gray-900">{product.price.toLocaleString()} {product.currency}</span>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="text-sm text-gray-500 line-through">{product.compareAtPrice.toLocaleString()} {product.currency}</span>
                  )}
                </div>

                {/* Stock Info */}
                {product.trackInventory && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Lager: <span className={product.stock! > 0 ? 'text-green-600' : 'text-red-600'}>
                        {product.stock} stk
                      </span>
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Rediger
                  </button>

                  {product.status === 'DRAFT' && (
                    <button
                      onClick={() => handlePublishProduct(product.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Publiser
                    </button>
                  )}

                  {product.status === 'PUBLISHED' && (
                    <button
                      onClick={() => handleUnpublishProduct(product.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <EyeOff className="w-4 h-4" />
                      Avpubliser
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Slett produkt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Image Gallery */}
                {product.images.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">{product.images.length} bilder</p>
                    <div className="grid grid-cols-4 gap-2">
                      {product.images.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.url}
                            alt={image.altText || product.name}
                            className="w-full h-16 object-cover rounded cursor-pointer"
                            onClick={() => handleSetPrimaryImage(product.id, image.id)}
                          />
                          {image.isPrimary && (
                            <Star className="absolute top-1 left-1 w-3 h-3 text-yellow-500 fill-yellow-500" />
                          )}
                          <button
                            onClick={() => handleDeleteImage(image.id)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingProduct ? 'Rediger produkt' : 'Nytt produkt'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="F.eks. 10 PT-økter"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Detaljert beskrivelse av produktet..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Product['type'] })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="PHYSICAL_PRODUCT">Fysisk produkt</option>
                      <option value="PT_SERVICE">PT-tjeneste</option>
                      <option value="MEMBERSHIP">Medlemskap</option>
                      <option value="DIGITAL">Digitalt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pris ({formData.currency})</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sammenlign pris (valgfritt)</label>
                    <input
                      type="number"
                      value={formData.compareAtPrice}
                      onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU (valgfritt)</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.trackInventory}
                        onChange={(e) => setFormData({ ...formData, trackInventory: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Spor lager</span>
                    </label>
                  </div>

                  {formData.trackInventory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lagerbeholdning</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  )}
                </div>

                {formData.type === 'PT_SERVICE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Antall økter</label>
                      <input
                        type="number"
                        value={formData.sessionCount}
                        onChange={(e) => setFormData({ ...formData, sessionCount: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gyldig i (dager)</label>
                      <input
                        type="number"
                        value={formData.validityDays}
                        onChange={(e) => setFormData({ ...formData, validityDays: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL-vennlig)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="produkt-navn"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Fremhevet</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sorteringsrekkefølge</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    {editingProduct ? 'Oppdater' : 'Opprett'}
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
