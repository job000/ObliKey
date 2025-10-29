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
  TextInput,
  Switch,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Container from '../components/Container';

interface TenantSettings {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  organizationNumber: string;
  website: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  enableNotifications: boolean;
  currency: string;
  timezone: string;
}

export default function SettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'business' | 'system'>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.getTenantSettings();
      if (response.success) {
        setSettings(response.data);
      } else {
        // Mock data for demonstration
        setSettings({
          businessName: 'ObliKey Gym',
          email: 'kontakt@oblikey.no',
          phone: '+47 123 45 678',
          address: 'Gymveien 1, 0123 Oslo',
          organizationNumber: '123456789',
          website: 'https://oblikey.no',
          allowRegistration: true,
          requireEmailVerification: false,
          enableNotifications: true,
          currency: 'NOK',
          timezone: 'Europe/Oslo',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Set mock data on error
      setSettings({
        businessName: 'ObliKey Gym',
        email: 'kontakt@oblikey.no',
        phone: '+47 123 45 678',
        address: 'Gymveien 1, 0123 Oslo',
        organizationNumber: '123456789',
        website: 'https://oblikey.no',
        allowRegistration: true,
        requireEmailVerification: false,
        enableNotifications: true,
        currency: 'NOK',
        timezone: 'Europe/Oslo',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSettings();
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await api.updateTenantSettings(settings);
      if (response.success) {
        Alert.alert('Suksess', 'Innstillinger lagret');
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke lagre innstillinger');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof TenantSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Kunne ikke laste innstillinger</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Innstillinger</Text>
              <Text style={styles.subtitle}>System- og tenant-innstillinger</Text>
            </View>
          </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'general' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('general')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'general' && styles.tabTextActive,
              ]}
            >
              Generelt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'business' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('business')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'business' && styles.tabTextActive,
              ]}
            >
              Bedrift
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'system' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('system')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'system' && styles.tabTextActive,
              ]}
            >
              System
            </Text>
          </TouchableOpacity>
        </View>

        {/* General Tab */}
        {activeTab === 'general' && (
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bedriftsinformasjon</Text>
              <View style={styles.card}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Bedriftsnavn</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.businessName}
                    onChangeText={(text) => updateSetting('businessName', text)}
                    placeholder="Navn på bedriften"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>E-post</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.email}
                    onChangeText={(text) => updateSetting('email', text)}
                    placeholder="kontakt@bedrift.no"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Telefon</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.phone}
                    onChangeText={(text) => updateSetting('phone', text)}
                    placeholder="+47 123 45 678"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Adresse</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.address}
                    onChangeText={(text) => updateSetting('address', text)}
                    placeholder="Gateadresse, Postnummer Sted"
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tilgangskontroll</Text>
              <View style={styles.card}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Tillat registrering</Text>
                    <Text style={styles.switchDescription}>
                      Tillat nye brukere å registrere seg
                    </Text>
                  </View>
                  <Switch
                    value={settings.allowRegistration}
                    onValueChange={(value) =>
                      updateSetting('allowRegistration', value)
                    }
                    trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                    thumbColor={settings.allowRegistration ? '#3B82F6' : '#F3F4F6'}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>E-post verifisering</Text>
                    <Text style={styles.switchDescription}>
                      Krev e-postbekreftelse ved registrering
                    </Text>
                  </View>
                  <Switch
                    value={settings.requireEmailVerification}
                    onValueChange={(value) =>
                      updateSetting('requireEmailVerification', value)
                    }
                    trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                    thumbColor={
                      settings.requireEmailVerification ? '#3B82F6' : '#F3F4F6'
                    }
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Business Tab */}
        {activeTab === 'business' && (
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bedriftsdetaljer</Text>
              <View style={styles.card}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Organisasjonsnummer</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.organizationNumber}
                    onChangeText={(text) =>
                      updateSetting('organizationNumber', text)
                    }
                    placeholder="123456789"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nettside</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.website}
                    onChangeText={(text) => updateSetting('website', text)}
                    placeholder="https://bedrift.no"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Valuta</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.currency}
                    onChangeText={(text) => updateSetting('currency', text)}
                    placeholder="NOK"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tidssone</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.timezone}
                    onChangeText={(text) => updateSetting('timezone', text)}
                    placeholder="Europe/Oslo"
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Systeminnstillinger</Text>
              <View style={styles.card}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Varslinger</Text>
                    <Text style={styles.switchDescription}>
                      Aktiver push-varslinger
                    </Text>
                  </View>
                  <Switch
                    value={settings.enableNotifications}
                    onValueChange={(value) =>
                      updateSetting('enableNotifications', value)
                    }
                    trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                    thumbColor={settings.enableNotifications ? '#3B82F6' : '#F3F4F6'}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hurtighandlinger</Text>
              <View style={styles.actionsCard}>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => navigation.navigate('UserManagement')}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="people-outline" size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.actionText}>Brukeradministrasjon</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => navigation.navigate('ProductsManagement')}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="cube-outline" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.actionText}>Produktadministrasjon</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => navigation.navigate('Analytics')}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="stats-chart-outline" size={24} color="#8B5CF6" />
                  </View>
                  <Text style={styles.actionText}>Rapporter & Analyse</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Lagre innstillinger</Text>
            </>
          )}
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>ObliKey v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2025 Boost System</Text>
        </View>
      </Container>
    </ScrollView>
    </SafeAreaView>
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
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 24,
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
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tabTextActive: {
    color: '#FFF',
  },
  content: {
    gap: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appInfoText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
});
