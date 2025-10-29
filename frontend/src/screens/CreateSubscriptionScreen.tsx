import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  email: string;
}

interface Feature {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  isCore: boolean;
}

export default function CreateSubscriptionScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);

  // Form state
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [planType, setPlanType] = useState('BASIC');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [customPrice, setCustomPrice] = useState('');
  const [trialEndDate, setTrialEndDate] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [billingEmail, setBillingEmail] = useState('');
  const [billingName, setBillingName] = useState('');
  const [notes, setNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isWeb = Platform.OS === 'web';

  const planTypes = [
    { value: 'TRIAL', label: 'Prøveversjon', defaultPrice: 0 },
    { value: 'BASIC', label: 'Basic', defaultPrice: 499 },
    { value: 'PREMIUM', label: 'Premium', defaultPrice: 999 },
    { value: 'ENTERPRISE', label: 'Enterprise', defaultPrice: 1999 },
    { value: 'CUSTOM', label: 'Tilpasset', defaultPrice: 0 },
  ];

  const billingCycles = [
    { value: 'MONTHLY', label: 'Månedlig' },
    { value: 'QUARTERLY', label: 'Kvartalsvis' },
    { value: 'ANNUAL', label: 'Årlig' },
  ];

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigation.goBack();
      return;
    }
    loadData();
  }, [user]);

  useEffect(() => {
    // Set default price when plan type changes
    const selectedPlan = planTypes.find(p => p.value === planType);
    if (selectedPlan && planType !== 'CUSTOM') {
      setCustomPrice(selectedPlan.defaultPrice.toString());
    }
  }, [planType]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [tenantsResponse, featuresResponse] = await Promise.all([
        api.getAllTenants({ limit: 1000 }),
        api.getAllFeatures().catch(() => ({ data: [] })),
      ]);

      // Only show tenants without active subscriptions
      const availableTenants = tenantsResponse.data?.tenants?.filter(
        (tenant: any) => !tenant.subscription || tenant.subscription.status === 'CANCELLED'
      ) || [];

      setTenants(availableTenants);
      setFeatures(featuresResponse.data || []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      Alert.alert('Feil', 'Kunne ikke laste data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedTenantId) {
      newErrors.tenant = 'Vennligst velg en tenant';
    }

    if (!customPrice || parseFloat(customPrice) < 0) {
      newErrors.price = 'Vennligst angi en gyldig pris';
    }

    if (planType === 'TRIAL' && !trialEndDate) {
      newErrors.trialEnd = 'Vennligst angi sluttdato for prøveperioden';
    }

    if (!billingEmail) {
      newErrors.billingEmail = 'Vennligst angi faktura e-post';
    } else if (!/\S+@\S+\.\S+/.test(billingEmail)) {
      newErrors.billingEmail = 'Vennligst angi en gyldig e-postadresse';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSubscription = async () => {
    if (!validateForm()) {
      Alert.alert('Valideringsfeil', 'Vennligst fyll ut alle påkrevde felter');
      return;
    }

    try {
      setSaving(true);

      const subscriptionData: any = {
        tenantId: selectedTenantId,
        tier: planType,
        interval: billingCycle,
        price: parseFloat(customPrice),
        currency: 'NOK',
        billingEmail,
        billingName: billingName || undefined,
        notes: notes || undefined,
      };

      if (planType === 'TRIAL' && trialEndDate) {
        subscriptionData.trialDays = Math.ceil(
          (new Date(trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      if (selectedFeatures.length > 0) {
        subscriptionData.customFeatures = { featureIds: selectedFeatures };
      }

      await api.createSubscription(subscriptionData);

      Alert.alert('Suksess', 'Abonnementet er opprettet', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      console.error('Failed to create subscription:', err);
      Alert.alert('Feil', err.response?.data?.message || 'Kunne ikke opprette abonnement');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const renderTenantPicker = () => {
    const selectedTenant = tenants.find(t => t.id === selectedTenantId);

    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Tenant <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerPlaceholder}>
            {selectedTenant ? selectedTenant.name : 'Velg tenant...'}
          </Text>
        </View>
        {errors.tenant && <Text style={styles.errorText}>{errors.tenant}</Text>}

        <ScrollView style={styles.optionsList} nestedScrollEnabled>
          {tenants.map(tenant => (
            <TouchableOpacity
              key={tenant.id}
              style={[
                styles.option,
                selectedTenantId === tenant.id && styles.optionSelected,
              ]}
              onPress={() => {
                setSelectedTenantId(tenant.id);
                setBillingEmail(tenant.email);
                setErrors(prev => ({ ...prev, tenant: '' }));
              }}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{tenant.name}</Text>
                <Text style={styles.optionSubtitle}>{tenant.subdomain}</Text>
              </View>
              {selectedTenantId === tenant.id && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.contentContainerWeb]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Opprett Nytt Abonnement</Text>
            <Text style={styles.subtitle}>Konfigurer abonnement for en tenant</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.card}>
          {/* Tenant Selection */}
          {renderTenantPicker()}

          {/* Plan Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Plan Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.optionsGrid}>
              {planTypes.map(plan => (
                <TouchableOpacity
                  key={plan.value}
                  style={[
                    styles.planOption,
                    planType === plan.value && styles.planOptionSelected,
                  ]}
                  onPress={() => setPlanType(plan.value)}
                >
                  <Text
                    style={[
                      styles.planOptionText,
                      planType === plan.value && styles.planOptionTextSelected,
                    ]}
                  >
                    {plan.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Billing Cycle */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Faktureringssyklus <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.optionsGrid}>
              {billingCycles.map(cycle => (
                <TouchableOpacity
                  key={cycle.value}
                  style={[
                    styles.planOption,
                    billingCycle === cycle.value && styles.planOptionSelected,
                  ]}
                  onPress={() => setBillingCycle(cycle.value)}
                >
                  <Text
                    style={[
                      styles.planOptionText,
                      billingCycle === cycle.value && styles.planOptionTextSelected,
                    ]}
                  >
                    {cycle.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Pris (NOK) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.price && styles.inputError]}
              value={customPrice}
              onChangeText={(text) => {
                setCustomPrice(text);
                setErrors(prev => ({ ...prev, price: '' }));
              }}
              placeholder="0"
              keyboardType="numeric"
            />
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          </View>

          {/* Trial End Date (only for TRIAL plan) */}
          {planType === 'TRIAL' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Prøveperiode Sluttdato <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.trialEnd && styles.inputError]}
                value={trialEndDate}
                onChangeText={(text) => {
                  setTrialEndDate(text);
                  setErrors(prev => ({ ...prev, trialEnd: '' }));
                }}
                placeholder="YYYY-MM-DD"
              />
              {errors.trialEnd && <Text style={styles.errorText}>{errors.trialEnd}</Text>}
              <Text style={styles.helpText}>Format: YYYY-MM-DD (f.eks. 2024-12-31)</Text>
            </View>
          )}

          {/* Billing Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Faktura E-post <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.billingEmail && styles.inputError]}
              value={billingEmail}
              onChangeText={(text) => {
                setBillingEmail(text);
                setErrors(prev => ({ ...prev, billingEmail: '' }));
              }}
              placeholder="faktura@firma.no"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.billingEmail && <Text style={styles.errorText}>{errors.billingEmail}</Text>}
          </View>

          {/* Billing Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Faktureringsnavn (valgfritt)</Text>
            <TextInput
              style={styles.input}
              value={billingName}
              onChangeText={setBillingName}
              placeholder="Firma AS"
            />
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notater (valgfritt)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Interne notater om abonnementet..."
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Features Selection */}
          {features.length > 0 && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Velg Funksjoner (valgfritt)</Text>
              <View style={styles.featuresList}>
                {features.map(feature => (
                  <TouchableOpacity
                    key={feature.id}
                    style={[
                      styles.featureItem,
                      selectedFeatures.includes(feature.id) && styles.featureItemSelected,
                    ]}
                    onPress={() => toggleFeature(feature.id)}
                  >
                    <View style={styles.featureContent}>
                      <Text
                        style={[
                          styles.featureName,
                          selectedFeatures.includes(feature.id) && styles.featureNameSelected,
                        ]}
                      >
                        {feature.name}
                      </Text>
                      {feature.description && (
                        <Text style={styles.featureDescription}>{feature.description}</Text>
                      )}
                      <Text style={styles.featureCategory}>{feature.category}</Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        selectedFeatures.includes(feature.id) && styles.checkboxSelected,
                      ]}
                    >
                      {selectedFeatures.includes(feature.id) && (
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleCreateSubscription}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Opprett Abonnement</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  contentContainerWeb: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    padding: 8,
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
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 24,
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
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#EF4444',
  },
  helpText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  pickerContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  pickerPlaceholder: {
    fontSize: 14,
    color: '#6B7280',
  },
  optionsList: {
    maxHeight: 200,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planOption: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  planOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  planOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  planOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  featureItemSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  featureContent: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  featureNameSelected: {
    color: '#3B82F6',
  },
  featureDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  featureCategory: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
