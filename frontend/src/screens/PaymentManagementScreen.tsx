import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface PaymentConfig {
  id: string;
  provider: 'VIPPS' | 'STRIPE' | 'CARD';
  enabled: boolean;
  testMode: boolean;
  displayName: string;
  sortOrder: number;
  vippsMerchantSerialNumber?: string;
}

interface VippsCredentials {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
}

interface StripeCredentials {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

export default function PaymentManagementScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'VIPPS' | 'STRIPE' | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Vipps credentials
  const [vippsClientId, setVippsClientId] = useState('');
  const [vippsClientSecret, setVippsClientSecret] = useState('');
  const [vippsSubscriptionKey, setVippsSubscriptionKey] = useState('');
  const [vippsMSN, setVippsMSN] = useState('');

  // Stripe credentials
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');

  // Common settings
  const [testMode, setTestMode] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    loadPaymentConfigs();
  }, []);

  const loadPaymentConfigs = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/config`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setConfigs(data.data);
      }
    } catch (error) {
      console.error('Load payment configs error:', error);
      Alert.alert('Feil', 'Kunne ikke laste betalingskonfigurasjoner');
    } finally {
      setLoading(false);
    }
  };

  const openConfigModal = (provider: 'VIPPS' | 'STRIPE') => {
    setSelectedProvider(provider);

    // Find existing config if any
    const existingConfig = configs.find(c => c.provider === provider);
    if (existingConfig) {
      setEnabled(existingConfig.enabled);
      setTestMode(existingConfig.testMode);
      setDisplayName(existingConfig.displayName);
      if (provider === 'VIPPS' && existingConfig.vippsMerchantSerialNumber) {
        setVippsMSN(existingConfig.vippsMerchantSerialNumber);
      }
    } else {
      setEnabled(false);
      setTestMode(true);
      setDisplayName(provider === 'VIPPS' ? 'Vipps' : 'Stripe');
    }

    // Reset credential fields
    setVippsClientId('');
    setVippsClientSecret('');
    setVippsSubscriptionKey('');
    setVippsMSN('');
    setStripeSecretKey('');
    setStripePublishableKey('');
    setStripeWebhookSecret('');

    setShowModal(true);
  };

  const saveConfiguration = async () => {
    if (!selectedProvider) return;

    let credentials: any;

    if (selectedProvider === 'VIPPS') {
      if (!vippsClientId || !vippsClientSecret || !vippsSubscriptionKey || !vippsMSN) {
        Alert.alert('Feil', 'Alle Vipps-felt må fylles ut');
        return;
      }
      credentials = {
        clientId: vippsClientId,
        clientSecret: vippsClientSecret,
        subscriptionKey: vippsSubscriptionKey,
        merchantSerialNumber: vippsMSN,
      };
    } else {
      if (!stripeSecretKey || !stripePublishableKey) {
        Alert.alert('Feil', 'Secret Key og Publishable Key må fylles ut');
        return;
      }
      credentials = {
        secretKey: stripeSecretKey,
        publishableKey: stripePublishableKey,
        webhookSecret: stripeWebhookSecret || undefined,
      };
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/payments/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selectedProvider,
          enabled,
          testMode,
          credentials,
          displayName,
          sortOrder: 0,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Suksess', data.message || 'Konfigurasjon lagret');
        setShowModal(false);
        loadPaymentConfigs();
      } else {
        Alert.alert('Feil', data.error || 'Kunne ikke lagre konfigurasjon');
      }
    } catch (error) {
      console.error('Save config error:', error);
      Alert.alert('Feil', 'Kunne ikke lagre konfigurasjon');
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = async (provider: string, newEnabled: boolean) => {
    try {
      const response = await fetch(`${API_URL}/payments/config/${provider}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newEnabled }),
      });

      const data = await response.json();
      if (data.success) {
        loadPaymentConfigs();
      } else {
        Alert.alert('Feil', data.error || 'Kunne ikke endre status');
      }
    } catch (error) {
      console.error('Toggle provider error:', error);
      Alert.alert('Feil', 'Kunne ikke endre status');
    }
  };

  const testConnection = async (provider: string) => {
    setTesting(provider);
    try {
      const response = await fetch(`${API_URL}/payments/config/${provider}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Suksess', data.message);
      } else {
        Alert.alert('Feil', data.message || data.error);
      }
    } catch (error) {
      console.error('Test connection error:', error);
      Alert.alert('Feil', 'Kunne ikke teste tilkobling');
    } finally {
      setTesting(null);
    }
  };

  const deleteConfiguration = async (provider: string) => {
    Alert.alert(
      'Bekreft sletting',
      `Er du sikker på at du vil slette ${provider}-konfigurasjonen?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/payments/config/${provider}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${user?.token}`,
                },
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('Suksess', data.message);
                loadPaymentConfigs();
              } else {
                Alert.alert('Feil', data.error);
              }
            } catch (error) {
              console.error('Delete config error:', error);
              Alert.alert('Feil', 'Kunne ikke slette konfigurasjon');
            }
          },
        },
      ]
    );
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'VIPPS') return 'phone-portrait';
    if (provider === 'STRIPE') return 'card';
    return 'card-outline';
  };

  const getProviderColor = (provider: string) => {
    if (provider === 'VIPPS') return '#FF5B24';
    if (provider === 'STRIPE') return '#635BFF';
    return '#6B7280';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Laster...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Betalingsadministrasjon</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.primaryLight + '33' }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primaryDark }]}>
            Konfigurer betalingsleverandører for din butikk. Credentials lagres kryptert.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tilgjengelige betalingsleverandører</Text>

          {['VIPPS', 'STRIPE'].map((providerName) => {
            const config = configs.find(c => c.provider === providerName);
            const providerColor = getProviderColor(providerName);

            return (
              <View key={providerName} style={[styles.providerCard, { backgroundColor: colors.cardBg }]}>
                <View style={styles.providerHeader}>
                  <View style={[styles.providerIcon, { backgroundColor: providerColor + '15' }]}>
                    <Ionicons name={getProviderIcon(providerName) as any} size={24} color={providerColor} />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={[styles.providerName, { color: colors.text }]}>{config?.displayName || providerName}</Text>
                    <Text style={[styles.providerStatus, { color: colors.textSecondary }]}>
                      {config ? (
                        <>
                          {config.enabled ? '✓ Aktivert' : '○ Deaktivert'}
                          {' • '}
                          {config.testMode ? 'Test-modus' : 'Produksjon'}
                        </>
                      ) : (
                        'Ikke konfigurert'
                      )}
                    </Text>
                  </View>
                  {config && (
                    <Switch
                      value={config.enabled}
                      onValueChange={(value) => toggleProvider(providerName, value)}
                      trackColor={{ false: colors.border, true: providerColor }}
                    />
                  )}
                </View>

                {config && config.provider === 'VIPPS' && config.vippsMerchantSerialNumber && (
                  <View style={styles.providerDetail}>
                    <Text style={[styles.providerDetailLabel, { color: colors.textSecondary }]}>MSN:</Text>
                    <Text style={[styles.providerDetailValue, { color: colors.text }]}>{config.vippsMerchantSerialNumber}</Text>
                  </View>
                )}

                <View style={styles.providerActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.configButton, { backgroundColor: colors.primary }]}
                    onPress={() => openConfigModal(providerName as any)}
                  >
                    <Ionicons name="settings-outline" size={18} color={colors.cardBg} />
                    <Text style={[styles.actionButtonText, { color: colors.cardBg }]}>
                      {config ? 'Oppdater' : 'Konfigurer'}
                    </Text>
                  </TouchableOpacity>

                  {config && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.testButton, { backgroundColor: colors.success }]}
                        onPress={() => testConnection(providerName)}
                        disabled={testing === providerName}
                      >
                        {testing === providerName ? (
                          <ActivityIndicator size="small" color={colors.cardBg} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={18} color={colors.cardBg} />
                            <Text style={[styles.actionButtonText, { color: colors.cardBg }]}>Test</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton, { backgroundColor: colors.danger }]}
                        onPress={() => deleteConfiguration(providerName)}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.cardBg} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Configuration Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Konfigurer {selectedProvider === 'VIPPS' ? 'Vipps' : 'Stripe'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
            <View style={styles.formSection}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Generelle innstillinger</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Visningsnavn</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={selectedProvider === 'VIPPS' ? 'Vipps' : 'Stripe'}
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <Text style={[styles.label, { color: colors.text }]}>Test-modus</Text>
                  <Switch value={testMode} onValueChange={setTestMode} />
                </View>
                <View style={styles.formGroupHalf}>
                  <Text style={[styles.label, { color: colors.text }]}>Aktivert</Text>
                  <Switch value={enabled} onValueChange={setEnabled} />
                </View>
              </View>
            </View>

            {selectedProvider === 'VIPPS' && (
              <View style={styles.formSection}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>Vipps ePay API Credentials</Text>
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  Hent disse verdiene fra portal.vipps.no
                </Text>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Client ID *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={vippsClientId}
                    onChangeText={setVippsClientId}
                    placeholder="client-id-fra-vipps"
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Client Secret *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={vippsClientSecret}
                    onChangeText={setVippsClientSecret}
                    placeholder="client-secret-fra-vipps"
                    placeholderTextColor={colors.textLight}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Subscription Key (Primary) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={vippsSubscriptionKey}
                    onChangeText={setVippsSubscriptionKey}
                    placeholder="Ocp-Apim-Subscription-Key"
                    placeholderTextColor={colors.textLight}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Merchant Serial Number (MSN) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={vippsMSN}
                    onChangeText={setVippsMSN}
                    placeholder="123456"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            {selectedProvider === 'STRIPE' && (
              <View style={styles.formSection}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>Stripe API Credentials</Text>
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  Hent disse verdiene fra Stripe Dashboard
                </Text>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Secret Key *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={stripeSecretKey}
                    onChangeText={setStripeSecretKey}
                    placeholder="sk_test_... eller sk_live_..."
                    placeholderTextColor={colors.textLight}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Publishable Key *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={stripePublishableKey}
                    onChangeText={setStripePublishableKey}
                    placeholder="pk_test_... eller pk_live_..."
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Webhook Secret (valgfri)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={stripeWebhookSecret}
                    onChangeText={setStripeWebhookSecret}
                    placeholder="whsec_..."
                    placeholderTextColor={colors.textLight}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.borderLight }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Avbryt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveConfiguration}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.cardBg} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: colors.cardBg }]}>Lagre konfigurasjon</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  providerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  providerStatus: {
    fontSize: 14,
  },
  providerDetail: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  providerDetailLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  providerDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  providerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  configButton: {
    flex: 2,
  },
  testButton: {
  },
  deleteButton: {
    flex: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 14,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
