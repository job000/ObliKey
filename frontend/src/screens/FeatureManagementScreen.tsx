import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

interface Feature {
  id: string;
  name: string;
  key: string;
  description?: string;
  category: string;
  active: boolean;
  createdAt: string;
}

interface FeaturePack {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency?: string;
  interval: string;
  active: boolean;
  features: Array<{
    id: string;
    feature: Feature;
  }>;
  createdAt: string;
}

export default function FeatureManagementScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'features' | 'packs'>('features');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featurePacks, setFeaturePacks] = useState<FeaturePack[]>([]);

  // Modal states
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [editingPack, setEditingPack] = useState<FeaturePack | null>(null);

  // Form states
  const [featureForm, setFeatureForm] = useState({
    name: '',
    key: '',
    description: '',
    category: '',
    active: true,
  });

  const [packForm, setPackForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: 0,
    currency: 'NOK',
    interval: 'MONTHLY',
    active: true,
    featureIds: [] as string[],
  });

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [featuresRes, packsRes] = await Promise.all([
        api.getAllFeatures(),
        api.getAllFeaturePacks(),
      ]);
      setFeatures(featuresRes.data);
      setFeaturePacks(packsRes.data);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      Alert.alert('Feil', 'Kunne ikke laste data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateFeature = () => {
    setEditingFeature(null);
    setFeatureForm({
      name: '',
      key: '',
      description: '',
      category: '',
      active: true,
    });
    setShowFeatureModal(true);
  };

  const handleEditFeature = (feature: Feature) => {
    setEditingFeature(feature);
    setFeatureForm({
      name: feature.name,
      key: feature.key,
      description: feature.description || '',
      category: feature.category,
      active: feature.active,
    });
    setShowFeatureModal(true);
  };

  const handleSaveFeature = async () => {
    if (!featureForm.name.trim() || !featureForm.key.trim() || !featureForm.category.trim()) {
      Alert.alert('Feil', 'Navn, nøkkel og kategori er påkrevd');
      return;
    }

    try {
      if (editingFeature) {
        await api.updateFeature(editingFeature.id, featureForm);
        Alert.alert('Suksess', 'Feature oppdatert');
      } else {
        await api.createFeature(featureForm);
        Alert.alert('Suksess', 'Feature opprettet');
      }
      setShowFeatureModal(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to save feature:', err);
      console.error('Error response:', JSON.stringify(err.response?.data, null, 2));

      // Backend returns 'error' not 'message'
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Kunne ikke lagre feature';
      Alert.alert('Feil', errorMessage);
    }
  };

  const handleDeleteFeature = (featureId: string) => {
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette denne featuren?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteFeature(featureId);
              Alert.alert('Suksess', 'Feature slettet');
              loadData();
            } catch (err: any) {
              Alert.alert('Feil', 'Kunne ikke slette feature');
            }
          },
        },
      ]
    );
  };

  const handleCreatePack = () => {
    setEditingPack(null);
    setPackForm({
      name: '',
      slug: '',
      description: '',
      price: 0,
      currency: 'NOK',
      interval: 'MONTHLY',
      active: true,
      featureIds: [],
    });
    setShowPackModal(true);
  };

  const handleEditPack = (pack: FeaturePack) => {
    setEditingPack(pack);
    setPackForm({
      name: pack.name,
      slug: pack.slug,
      description: pack.description || '',
      price: pack.price,
      currency: pack.currency || 'NOK',
      interval: pack.interval,
      active: pack.active,
      featureIds: pack.features.map(f => f.feature.id),
    });
    setShowPackModal(true);
  };

  const handleSavePack = async () => {
    if (!packForm.name.trim() || !packForm.slug.trim()) {
      Alert.alert('Feil', 'Navn og slug er påkrevd');
      return;
    }

    if (packForm.price < 0) {
      Alert.alert('Feil', 'Pris må være 0 eller høyere');
      return;
    }

    try {
      if (editingPack) {
        await api.updateFeaturePack(editingPack.id, packForm);
        Alert.alert('Suksess', 'Feature pack oppdatert');
      } else {
        await api.createFeaturePack(packForm);
        Alert.alert('Suksess', 'Feature pack opprettet');
      }
      setShowPackModal(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to save pack:', err);
      console.error('Error response:', JSON.stringify(err.response?.data, null, 2));

      // Backend returns 'error' not 'message'
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Kunne ikke lagre feature pack';
      Alert.alert('Feil', errorMessage);
    }
  };

  const handleDeletePack = (packId: string) => {
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette denne feature packen?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteFeaturePack(packId);
              Alert.alert('Suksess', 'Feature pack slettet');
              loadData();
            } catch (err: any) {
              Alert.alert('Feil', 'Kunne ikke slette feature pack');
            }
          },
        },
      ]
    );
  };

  const toggleFeatureInPack = (featureId: string) => {
    setPackForm({
      ...packForm,
      featureIds: packForm.featureIds.includes(featureId)
        ? packForm.featureIds.filter(id => id !== featureId)
        : [...packForm.featureIds, featureId],
    });
  };

  const renderFeatureModal = () => (
    <Modal
      visible={showFeatureModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFeatureModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isWeb && styles.modalContentWeb]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingFeature ? 'Rediger Feature' : 'Ny Feature'}
            </Text>
            <TouchableOpacity onPress={() => setShowFeatureModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Navn <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={featureForm.name}
                onChangeText={(text) => setFeatureForm({ ...featureForm, name: text })}
                placeholder="E-handel"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Nøkkel <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={featureForm.key}
                onChangeText={(text) =>
                  setFeatureForm({ ...featureForm, key: text.toLowerCase().replace(/\s+/g, '_') })
                }
                placeholder="shop"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <Text style={styles.helpText}>Brukes i kode for feature toggling</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Kategori <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={featureForm.category}
                onChangeText={(text) => setFeatureForm({ ...featureForm, category: text })}
                placeholder="commerce"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Beskrivelse</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={featureForm.description}
                onChangeText={(text) => setFeatureForm({ ...featureForm, description: text })}
                placeholder="Gir tilgang til e-handelsfunksjonalitet..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Aktiv</Text>
                <Switch
                  value={featureForm.active}
                  onValueChange={(value) => setFeatureForm({ ...featureForm, active: value })}
                  trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowFeatureModal(false)}
            >
              <Text style={styles.cancelButtonText}>Avbryt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSaveFeature}
            >
              <Text style={styles.saveButtonText}>
                {editingFeature ? 'Oppdater' : 'Opprett'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPackModal = () => (
    <Modal
      visible={showPackModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPackModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isWeb && styles.modalContentWeb]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPack ? 'Rediger Feature Pack' : 'Ny Feature Pack'}
            </Text>
            <TouchableOpacity onPress={() => setShowPackModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Navn <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={packForm.name}
                onChangeText={(text) => setPackForm({ ...packForm, name: text })}
                placeholder="Premium Pakke"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Slug <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={packForm.slug}
                onChangeText={(text) =>
                  setPackForm({ ...packForm, slug: text.toLowerCase().replace(/\s+/g, '-') })
                }
                placeholder="premium-pack"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <Text style={styles.helpText}>URL-vennlig identifikator (f.eks. basic, premium, enterprise)</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Pris <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={packForm.price.toString()}
                onChangeText={(text) => setPackForm({ ...packForm, price: parseFloat(text) || 0 })}
                placeholder="299"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>Pris i {packForm.currency}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Intervall <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={packForm.interval}
                onChangeText={(text) => setPackForm({ ...packForm, interval: text.toUpperCase() })}
                placeholder="MONTHLY"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
              <Text style={styles.helpText}>MONTHLY, YEARLY, QUARTERLY, etc.</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Beskrivelse</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={packForm.description}
                onChangeText={(text) => setPackForm({ ...packForm, description: text })}
                placeholder="Beskrivelse av pakken..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Aktiv</Text>
                <Switch
                  value={packForm.active}
                  onValueChange={(value) => setPackForm({ ...packForm, active: value })}
                  trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Inkluderte Features</Text>
              <View style={styles.featureList}>
                {features.map((feature) => (
                  <TouchableOpacity
                    key={feature.id}
                    style={[
                      styles.featureCheckbox,
                      packForm.featureIds.includes(feature.id) && styles.featureCheckboxSelected,
                    ]}
                    onPress={() => toggleFeatureInPack(feature.id)}
                  >
                    <View style={styles.featureCheckboxContent}>
                      <View>
                        <Text style={styles.featureCheckboxName}>{feature.name}</Text>
                        <Text style={styles.featureCheckboxKey}>{feature.key}</Text>
                      </View>
                      {packForm.featureIds.includes(feature.id) && (
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowPackModal(false)}
            >
              <Text style={styles.cancelButtonText}>Avbryt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSavePack}
            >
              <Text style={styles.saveButtonText}>
                {editingPack ? 'Oppdater' : 'Opprett'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderFeatures = () => (
    <View>
      {features.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>Ingen features funnet</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={handleCreateFeature}>
            <Text style={styles.emptyStateButtonText}>Opprett første feature</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {features.map((feature) => (
            <View key={feature.id} style={[styles.card, isWeb && styles.featureCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.featureIcon}>
                  <Ionicons name="cube" size={20} color="#3B82F6" />
                </View>
                <View style={styles.cardHeaderActions}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleEditFeature(feature)}
                  >
                    <Ionicons name="pencil" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDeleteFeature(feature.id)}
                  >
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.featureName}>{feature.name}</Text>
              <View style={styles.featureKeyContainer}>
                <Text style={styles.featureKey}>{feature.key}</Text>
              </View>

              {feature.description && (
                <Text style={styles.featureDescription} numberOfLines={2}>
                  {feature.description}
                </Text>
              )}

              <View style={styles.featureMeta}>
                <View style={styles.featureCategory}>
                  <Ionicons name="pricetag" size={14} color="#8B5CF6" />
                  <Text style={styles.featureCategoryText}>{feature.category}</Text>
                </View>
                <View
                  style={[
                    styles.featureStatus,
                    feature.active ? styles.statusActive : styles.statusInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      feature.active ? styles.statusDotActive : styles.statusDotInactive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      feature.active ? styles.statusTextActive : styles.statusTextInactive,
                    ]}
                  >
                    {feature.active ? 'Aktiv' : 'Inaktiv'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderFeaturePacks = () => (
    <View>
      {featurePacks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>Ingen feature packs funnet</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={handleCreatePack}>
            <Text style={styles.emptyStateButtonText}>Opprett første pack</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.packsList}>
          {featurePacks.map((pack) => (
            <View key={pack.id} style={[styles.card, styles.packCard]}>
              <View style={styles.packHeader}>
                <View>
                  <Text style={styles.packName}>{pack.name}</Text>
                  <View style={styles.packTier}>
                    <Ionicons name="cash" size={14} color="#10B981" />
                    <Text style={styles.packTierText}>{pack.price} {pack.currency || 'NOK'} / {pack.interval}</Text>
                  </View>
                </View>
                <View style={styles.packActions}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleEditPack(pack)}
                  >
                    <Ionicons name="pencil" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDeletePack(pack.id)}
                  >
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {pack.description && (
                <Text style={styles.packDescription}>{pack.description}</Text>
              )}

              <View style={styles.packFeatures}>
                <Text style={styles.packFeaturesTitle}>Inkluderte features ({pack.features.length})</Text>
                <View style={styles.packFeaturesList}>
                  {pack.features.map((pf) => (
                    <View key={pf.id} style={styles.packFeatureTag}>
                      <Ionicons name="cube" size={12} color="#3B82F6" />
                      <Text style={styles.packFeatureTagText}>{pf.feature.name}</Text>
                    </View>
                  ))}
                  {pack.features.length === 0 && (
                    <Text style={styles.noFeatures}>Ingen features</Text>
                  )}
                </View>
              </View>

              <View style={styles.packFooter}>
                <View
                  style={[
                    styles.featureStatus,
                    pack.active ? styles.statusActive : styles.statusInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      pack.active ? styles.statusDotActive : styles.statusDotInactive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      pack.active ? styles.statusTextActive : styles.statusTextInactive,
                    ]}
                  >
                    {pack.active ? 'Aktiv' : 'Inaktiv'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Feature Management</Text>
          <Text style={styles.subtitle}>Administrer features og feature packs</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'features' && styles.tabActive]}
          onPress={() => setActiveTab('features')}
        >
          <Ionicons
            name="cube"
            size={20}
            color={activeTab === 'features' ? '#3B82F6' : '#6B7280'}
          />
          <Text
            style={[styles.tabText, activeTab === 'features' && styles.tabTextActive]}
          >
            Features ({features.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'packs' && styles.tabActive]}
          onPress={() => setActiveTab('packs')}
        >
          <Ionicons
            name="albums"
            size={20}
            color={activeTab === 'packs' ? '#3B82F6' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'packs' && styles.tabTextActive]}>
            Feature Packs ({featurePacks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Button */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={activeTab === 'features' ? handleCreateFeature : handleCreatePack}
        >
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.createButtonText}>
            {activeTab === 'features' ? 'Ny Feature' : 'Ny Feature Pack'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.webContent]}
        refreshControl={
          <ActivityIndicator
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {activeTab === 'features' ? renderFeatures() : renderFeaturePacks()}
      </ScrollView>

      {/* Modals */}
      {renderFeatureModal()}
      {renderPackModal()}
    </View>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  actionBar: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  webContent: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureCard: {
    width: '48%',
    minWidth: 280,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  featureKeyContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  featureKey: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#374151',
  },
  featureDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  featureMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  featureCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureCategoryText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  featureStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusActive: {
    backgroundColor: '#F0FDF4',
  },
  statusInactive: {
    backgroundColor: '#FEF2F2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusDotInactive: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextInactive: {
    color: '#EF4444',
  },
  packsList: {
    gap: 16,
  },
  packCard: {
    width: '100%',
  },
  packHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  packTier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packTierText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  packActions: {
    flexDirection: 'row',
    gap: 8,
  },
  packDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  packFeatures: {
    marginBottom: 16,
  },
  packFeaturesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  packFeaturesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  packFeatureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  packFeatureTagText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  noFeatures: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  packFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalContentWeb: {
    maxWidth: 600,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFF',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  featureList: {
    gap: 8,
  },
  featureCheckbox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF',
  },
  featureCheckboxSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  featureCheckboxContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureCheckboxName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  featureCheckboxKey: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#6B7280',
  },
});
