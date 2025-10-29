import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import Container from '../components/Container';
import type { Product } from '../types';

export default function ProductsManagementScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    type: 'PHYSICAL_PRODUCT' as 'PHYSICAL_PRODUCT' | 'DIGITAL' | 'PT_SERVICE' | 'MEMBERSHIP',
    stock: '',
    trackInventory: true,
    sessionCount: '',
    validityDays: '',
  });
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts();
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const openAddModal = () => {
    setEditMode(false);
    setSelectedProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      type: 'PHYSICAL_PRODUCT',
      stock: '',
      trackInventory: true,
      sessionCount: '',
      validityDays: '',
    });
    setSelectedImages([]);
    setModalVisible(true);
  };

  const openEditModal = (product: any) => {
    setEditMode(true);
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      type: product.type || 'PHYSICAL_PRODUCT',
      stock: product.stock?.toString() || '0',
      trackInventory: product.trackInventory !== false,
      sessionCount: product.sessionCount?.toString() || '',
      validityDays: product.validityDays?.toString() || '',
    });
    setSelectedImages(product.images?.map((img: any) => img.url) || []);
    setModalVisible(true);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImages([...selectedImages, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke velge bilde');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      Alert.alert('Feil', 'Navn og pris er påkrevd');
      return;
    }

    try {
      const productData: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        type: formData.type,
        stock: parseInt(formData.stock) || 0,
        trackInventory: formData.trackInventory,
      };

      // Add PT service specific fields
      if (formData.type === 'PT_SERVICE') {
        productData.sessionCount = parseInt(formData.sessionCount) || 1;
        productData.validityDays = parseInt(formData.validityDays) || 365;
      }

      if (editMode && selectedProduct) {
        const response = await api.updateProduct(selectedProduct.id, productData);
        if (response.success) {
          // Add images if there are new ones
          if (selectedImages.length > 0) {
            for (const imageUrl of selectedImages) {
              if (!imageUrl.startsWith('http')) {
                // This is a new image (local URI), skip for now
                // In production, you'd upload to a service like Cloudinary or S3
                continue;
              }
            }
          }

          await loadProducts();
          Alert.alert('Suksess', 'Produkt oppdatert');
        }
      } else {
        const response = await api.createProduct(productData);
        if (response.success) {
          // Add images after product creation
          if (selectedImages.length > 0) {
            for (let i = 0; i < selectedImages.length; i++) {
              const imageUrl = selectedImages[i];
              if (imageUrl.startsWith('http')) {
                // This is a URL, add it directly
                try {
                  await api.addProductImage(response.data.id, {
                    url: imageUrl,
                    sortOrder: i,
                    isPrimary: i === 0,
                  });
                } catch (err) {
                  console.error('Failed to add image:', err);
                }
              }
              // For local URIs, you'd need to upload to cloud storage first
            }
          }

          await loadProducts();
          Alert.alert('Suksess', 'Produkt opprettet');
        }
      }

      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke lagre produkt');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Slett produkt',
      'Er du sikker på at du vil slette dette produktet?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProduct(productId);
              setProducts(products.filter((p) => p.id !== productId));
              Alert.alert('Suksess', 'Produkt slettet');
            } catch (error: any) {
              Alert.alert(
                'Feil',
                error.response?.data?.error || 'Kunne ikke slette produkt'
              );
            }
          },
        },
      ]
    );
  };

  const handlePublishProduct = async (productId: string) => {
    try {
      await api.publishProduct(productId);
      await loadProducts();
      Alert.alert('Suksess', 'Produkt publisert');
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke publisere produkt');
    }
  };

  const handleUnpublishProduct = async (productId: string) => {
    try {
      await api.unpublishProduct(productId);
      await loadProducts();
      Alert.alert('Suksess', 'Produkt avpublisert');
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke avpublisere produkt');
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'PHYSICAL_PRODUCT':
        return 'Fysisk produkt';
      case 'DIGITAL':
        return 'Digitalt produkt';
      case 'PT_SERVICE':
        return 'PT-tjeneste';
      case 'MEMBERSHIP':
        return 'Medlemskap';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PHYSICAL_PRODUCT':
        return '#3B82F6';
      case 'DIGITAL':
        return '#10B981';
      case 'PT_SERVICE':
        return '#F59E0B';
      case 'MEMBERSHIP':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getProductStats = () => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + p.price * (p.stock || 0), 0);
    const lowStock = products.filter((p) => (p.stock || 0) < 10).length;
    const outOfStock = products.filter((p) => (p.stock || 0) === 0).length;

    return { totalProducts, totalValue, lowStock, outOfStock };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const stats = getProductStats();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Produktadministrasjon</Text>
            <Text style={styles.subtitle}>Administrer produkter og priser</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Nytt</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="cube-outline" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Produkter</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E9D5FF' }]}>
              <Ionicons name="cash-outline" size={24} color="#A855F7" />
            </View>
            <Text style={styles.statValue}>
              {stats.totalValue.toLocaleString('nb-NO', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.statLabel}>Lagerverdi (kr)</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{stats.lowStock}</Text>
            <Text style={styles.statLabel}>Lavt lager</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle-outline" size={24} color="#EF4444" />
            </View>
            <Text style={styles.statValue}>{stats.outOfStock}</Text>
            <Text style={styles.statLabel}>Utsolgt</Text>
          </View>
        </View>

        {/* Products List */}
        <View style={styles.productsList}>
          {products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Ingen produkter funnet</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                <Text style={styles.emptyButtonText}>Legg til produkt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {product.description}
                    </Text>
                    <View style={styles.productMeta}>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor:
                              getTypeColor((product as any).type || 'PHYSICAL_PRODUCT') + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            { color: getTypeColor((product as any).type || 'PHYSICAL_PRODUCT') },
                          ]}
                        >
                          {getTypeText((product as any).type || 'PHYSICAL_PRODUCT')}
                        </Text>
                      </View>
                      {(product as any).trackInventory !== false && (
                        <Text style={styles.stockText}>
                          Lager: {product.stock || 0}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.productActions}>
                    <Text style={styles.productPrice}>
                      {`${product.price.toLocaleString('nb-NO')} kr`}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  {(product as any).status === 'PUBLISHED' ? (
                    <TouchableOpacity
                      style={styles.unpublishButton}
                      onPress={() => handleUnpublishProduct(product.id)}
                    >
                      <Ionicons name="eye-off-outline" size={18} color="#F59E0B" />
                      <Text style={styles.unpublishButtonText}>Avpubliser</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.publishButton}
                      onPress={() => handlePublishProduct(product.id)}
                    >
                      <Ionicons name="eye-outline" size={18} color="#10B981" />
                      <Text style={styles.publishButtonText}>Publiser</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(product)}
                  >
                    <Ionicons name="create-outline" size={18} color="#3B82F6" />
                    <Text style={styles.editButtonText}>Rediger</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteProduct(product.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Slett</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </Container>
      </ScrollView>

      {/* Add/Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? 'Rediger produkt' : 'Nytt produkt'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Produktnavn *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Eks: Proteinpulver 1kg"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Beskrivelse</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Beskrivelse av produktet"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Pris (kr) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.price}
                  onChangeText={(text) =>
                    setFormData({ ...formData, price: text })
                  }
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Produkttype</Text>
                <View style={styles.categoryButtons}>
                  {(['PHYSICAL_PRODUCT', 'DIGITAL', 'PT_SERVICE', 'MEMBERSHIP'] as const).map(
                    (type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.categoryButton,
                          formData.type === type &&
                            styles.categoryButtonActive,
                          {
                            borderColor: getTypeColor(type),
                          },
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, type })
                        }
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            formData.type === type && {
                              color: getTypeColor(type),
                              fontWeight: 'bold',
                            },
                          ]}
                        >
                          {getTypeText(type)}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>

              {formData.type === 'PT_SERVICE' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Antall økter</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.sessionCount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, sessionCount: text })
                      }
                      placeholder="1"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Gyldig i (dager)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.validityDays}
                      onChangeText={(text) =>
                        setFormData({ ...formData, validityDays: text })
                      }
                      placeholder="365"
                      keyboardType="number-pad"
                    />
                  </View>
                </>
              )}

              {formData.type === 'PHYSICAL_PRODUCT' && (
                <View style={styles.formGroup}>
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity
                      onPress={() =>
                        setFormData({ ...formData, trackInventory: !formData.trackInventory })
                      }
                      style={styles.checkbox}
                    >
                      <Ionicons
                        name={formData.trackInventory ? 'checkbox' : 'square-outline'}
                        size={24}
                        color="#3B82F6"
                      />
                      <Text style={styles.checkboxLabel}>Spor lagerbeholdning</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {(formData.type === 'PHYSICAL_PRODUCT' && formData.trackInventory) && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Lager</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.stock}
                    onChangeText={(text) =>
                      setFormData({ ...formData, stock: text })
                    }
                    placeholder="0"
                    keyboardType="number-pad"
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Bilder</Text>
                <View style={styles.imagesContainer}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.imagePreview}>
                      <Image source={{ uri }} style={styles.imagePreviewImg} />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addImageBtn}
                    onPress={pickImage}
                  >
                    <Ionicons name="add" size={32} color="#6B7280" />
                    <Text style={styles.addImageText}>Legg til bilde</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helpText}>
                  Du kan også legge inn bilde-URL direkte nedenfor
                </Text>
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="https://..."
                  autoCapitalize="none"
                  onChangeText={(text) => {
                    if (text && text.startsWith('http')) {
                      setSelectedImages([...selectedImages, text]);
                    }
                  }}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProduct}
              >
                <Text style={styles.saveButtonText}>
                  {editMode ? 'Oppdater produkt' : 'Opprett produkt'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? '23%' : '47%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  productsList: {
    gap: 12,
    paddingBottom: 24,
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stockText: {
    fontSize: 13,
    color: '#6B7280',
  },
  productActions: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  publishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  publishButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  unpublishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  unpublishButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
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
    backgroundColor: '#FFF',
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    minWidth: '47%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2.5,
    alignItems: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryButtonActive: {
    backgroundColor: '#F9FAFB',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  checkboxRow: {
    marginVertical: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    position: 'relative',
  },
  imagePreviewImg: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addImageText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
});
