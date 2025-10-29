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
  Switch,
  SafeAreaView,
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
}

interface TenantFeature {
  id: string;
  featureId: string;
  enabled: boolean;
  feature: Feature;
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
}

export default function ManageTenantFeaturesScreen({ route, navigation }: any) {
  const { tenantId, tenantName } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeature[]>([]);
  const [featurePacks, setFeaturePacks] = useState<FeaturePack[]>([]);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [featuresRes, tenantFeaturesRes, packsRes] = await Promise.all([
        api.getAllFeatures(),
        api.getTenantFeatures(tenantId),
        api.getAllFeaturePacks(),
      ]);

      setAllFeatures(featuresRes.data || []);
      setTenantFeatures(tenantFeaturesRes.data || []);
      setFeaturePacks(packsRes.data || []);

      console.log('=== Loaded Data ===');
      console.log('All features count:', featuresRes.data?.length);
      console.log('All features IDs:', featuresRes.data?.map((f: Feature) => ({ id: f.id, key: f.key, name: f.name })));
      console.log('\nTenant features count:', tenantFeaturesRes.data?.length);
      console.log('Tenant features data:', tenantFeaturesRes.data?.map((tf: TenantFeature) => ({
        id: tf.id,
        featureId: tf.featureId,
        enabled: tf.enabled,
        featureName: tf.feature?.name
      })));
      console.log('Feature packs count:', packsRes.data?.length);

      // Check for matches
      console.log('\n=== Checking Feature Matches ===');
      featuresRes.data?.forEach((feature: Feature) => {
        const tenantFeature = tenantFeaturesRes.data?.find((tf: TenantFeature) => tf.featureId === feature.id);
        if (tenantFeature) {
          console.log(`✓ Feature "${feature.key}" (${feature.id}): enabled=${tenantFeature.enabled}`);
        } else {
          console.log(`✗ Feature "${feature.key}" (${feature.id}): NO TENANT_FEATURE RECORD`);
        }
      });
    } catch (err: any) {
      console.error('Failed to load data:', err);
      console.error('Error response:', JSON.stringify(err.response?.data, null, 2));

      // Backend returns 'error' not 'message'
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Kunne ikke laste data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFeatureEnabled = (featureId: string): boolean => {
    const tenantFeature = tenantFeatures.find(tf => tf.featureId === featureId);
    return tenantFeature?.enabled || false;
  };

  const handleToggleFeature = async (featureId: string, currentlyEnabled: boolean) => {
    try {
      console.log('=== Toggle Feature ===');
      console.log('Feature ID:', featureId);
      console.log('Currently Enabled:', currentlyEnabled);
      console.log('Will call:', currentlyEnabled ? 'DISABLE' : 'ENABLE');

      setSaving(true);

      if (currentlyEnabled) {
        console.log('Calling disableTenantFeature...');
        const result = await api.disableTenantFeature(tenantId, featureId);
        console.log('Disable result:', result);
      } else {
        console.log('Calling enableTenantFeature...');
        const result = await api.enableTenantFeature(tenantId, featureId);
        console.log('Enable result:', result);
      }

      console.log('Toggle successful, reloading data...');
      await loadData();
      console.log('Data reloaded successfully');
    } catch (err: any) {
      console.error('❌ Failed to toggle feature:', err);
      console.error('Error response:', JSON.stringify(err.response?.data, null, 2));
      console.error('Error status:', err.response?.status);

      // Backend returns 'error' not 'message'
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Kunne ikke endre feature';
      Alert.alert('Feil', errorMessage);
    } finally {
      setSaving(false);
      console.log('Toggle operation finished');
    }
  };

  const handleApplyFeaturePack = async (packId: string, packName: string) => {
    Alert.alert(
      'Bekreft anvendelse',
      `Er du sikker på at du vil anvende "${packName}" på denne tenanten? Dette vil aktivere alle features i pakken.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Anvend',
          onPress: async () => {
            try {
              setSaving(true);
              await api.applyFeaturePackToTenant(tenantId, packId);
              await loadData();
            } catch (err: any) {
              console.error('Failed to apply feature pack:', err);
              console.error('Error response:', JSON.stringify(err.response?.data, null, 2));

              // Backend returns 'error' not 'message'
              const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Kunne ikke anvende feature pack';
              Alert.alert('Feil', errorMessage);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const groupFeaturesByCategory = () => {
    const grouped: { [key: string]: Feature[] } = {};
    allFeatures.forEach((feature) => {
      if (!grouped[feature.category]) {
        grouped[feature.category] = [];
      }
      grouped[feature.category].push(feature);
    });
    return grouped;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster features...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Prøv igjen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groupedFeatures = groupFeaturesByCategory();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, isWeb && styles.webContent]}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Administrer Features</Text>
          <Text style={styles.subtitle}>{tenantName}</Text>
        </View>
      </View>

      {/* Feature Packs Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="albums" size={24} color="#3B82F6" />
          <Text style={styles.sectionTitle}>Feature Packs</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Anvend ferdigdefinerte pakker med features for rask oppsett
        </Text>

        {featurePacks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Ingen feature packs tilgjengelig</Text>
          </View>
        ) : (
          <View style={styles.packsList}>
            {featurePacks.map((pack) => (
              <View key={pack.id} style={styles.packCard}>
                <View style={styles.packHeader}>
                  <View style={styles.packInfo}>
                    <Text style={styles.packName}>{pack.name}</Text>
                    <View style={styles.packTier}>
                      <Ionicons name="cash" size={14} color="#10B981" />
                      <Text style={styles.packTierText}>{pack.price} {pack.currency || 'NOK'} / {pack.interval}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.applyButton, saving && styles.applyButtonDisabled]}
                    onPress={() => handleApplyFeaturePack(pack.id, pack.name)}
                    disabled={saving}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                    <Text style={styles.applyButtonText}>Anvend Pack</Text>
                  </TouchableOpacity>
                </View>

                {pack.description && (
                  <Text style={styles.packDescription}>{pack.description}</Text>
                )}

                <View style={styles.packFeatures}>
                  <Text style={styles.packFeaturesTitle}>
                    Inkluderte features ({pack.features.length})
                  </Text>
                  <View style={styles.packFeaturesList}>
                    {pack.features.map((pf) => (
                      <View key={pf.id} style={styles.packFeatureTag}>
                        <Ionicons name="cube" size={12} color="#3B82F6" />
                        <Text style={styles.packFeatureTagText}>{pf.feature.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Individual Features Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cube" size={24} color="#3B82F6" />
          <Text style={styles.sectionTitle}>Individuelle Features</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Slå på eller av individuelle features for denne tenanten
        </Text>

        {allFeatures.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Ingen features tilgjengelig</Text>
          </View>
        ) : (
          <View style={styles.categoriesList}>
            {Object.keys(groupedFeatures).map((category) => (
              <View key={category} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Ionicons name="pricetag" size={20} color="#8B5CF6" />
                  <Text style={styles.categoryTitle}>{category}</Text>
                </View>

                <View style={styles.featuresList}>
                  {groupedFeatures[category].map((feature) => {
                    const enabled = isFeatureEnabled(feature.id);
                    return (
                      <View key={feature.id} style={styles.featureItem}>
                        <View style={styles.featureInfo}>
                          <View style={styles.featureHeader}>
                            <Text style={styles.featureName}>{feature.name}</Text>
                            <View style={styles.featureKeyContainer}>
                              <Text style={styles.featureKey}>{feature.key}</Text>
                            </View>
                          </View>
                          {feature.description && (
                            <Text style={styles.featureDescription}>
                              {feature.description}
                            </Text>
                          )}
                          {!feature.active && (
                            <View style={styles.inactiveWarning}>
                              <Ionicons name="warning" size={14} color="#F59E0B" />
                              <Text style={styles.inactiveWarningText}>
                                Feature er global inaktiv
                              </Text>
                            </View>
                          )}
                        </View>
                        <Switch
                          value={enabled}
                          onValueChange={() => handleToggleFeature(feature.id, enabled)}
                          trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                          thumbColor="#FFF"
                          disabled={saving || !feature.active}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.summaryTitle}>Oppsummering</Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {tenantFeatures.filter(tf => tf.enabled).length}
            </Text>
            <Text style={styles.summaryLabel}>Aktive Features</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{allFeatures.length}</Text>
            <Text style={styles.summaryLabel}>Totalt Tilgjengelig</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{featurePacks.length}</Text>
            <Text style={styles.summaryLabel}>Feature Packs</Text>
          </View>
        </View>
      </View>
      </ScrollView>
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
  content: {
    padding: 16,
  },
  webContent: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF',
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
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  packsList: {
    gap: 16,
  },
  packCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  packHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packInfo: {
    flex: 1,
  },
  packName: {
    fontSize: 18,
    fontWeight: '700',
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
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  packDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  packFeatures: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  categoriesList: {
    gap: 16,
  },
  categoryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  featureName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  featureKeyContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featureKey: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#6B7280',
  },
  featureDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  inactiveWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  inactiveWarningText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E40AF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#DBEAFE',
  },
});
