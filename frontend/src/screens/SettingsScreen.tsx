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
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Container from '../components/Container';

interface TenantSettings {
  businessHoursStart: string;
  businessHoursEnd: string;
  bookingCancellation: number;
  maxBookingsPerUser: number;
  requirePayment: boolean;
  currency: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  primaryColor: string;
  secondaryColor: string;
  companyVatNumber?: string;
  companyRegNumber?: string;
}

export default function SettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'business' | 'system'>('general');

  // Time picker states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

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
          businessHoursStart: '06:00',
          businessHoursEnd: '22:00',
          bookingCancellation: 24,
          maxBookingsPerUser: 10,
          requirePayment: false,
          currency: 'NOK',
          timezone: 'Europe/Oslo',
          emailNotifications: true,
          smsNotifications: false,
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          companyVatNumber: '',
          companyRegNumber: '',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Set mock data on error
      setSettings({
        businessHoursStart: '06:00',
        businessHoursEnd: '22:00',
        bookingCancellation: 24,
        maxBookingsPerUser: 10,
        requirePayment: false,
        currency: 'NOK',
        timezone: 'Europe/Oslo',
        emailNotifications: true,
        smsNotifications: false,
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        companyVatNumber: '',
        companyRegNumber: '',
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

  // Helper function to convert "HH:mm" string to Date object
  const timeStringToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Helper function to convert Date object to "HH:mm" string
  const dateToTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Handle start time change
  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedDate && settings) {
      const timeString = dateToTimeString(selectedDate);
      updateSetting('businessHoursStart', timeString);
    }
  };

  // Handle end time change
  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedDate && settings) {
      const timeString = dateToTimeString(selectedDate);
      updateSetting('businessHoursEnd', timeString);
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
              <Text style={styles.sectionTitle}>Booking-innstillinger</Text>
              <View style={styles.card}>
                {/* Start Time Picker */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Åpningstid</Text>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color="#3B82F6" />
                    <Text style={styles.timePickerText}>
                      {settings.businessHoursStart}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* End Time Picker */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Stengetid</Text>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color="#3B82F6" />
                    <Text style={styles.timePickerText}>
                      {settings.businessHoursEnd}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Avbestillingsfrist (timer)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(settings.bookingCancellation)}
                    onChangeText={(text) => updateSetting('bookingCancellation', parseInt(text) || 0)}
                    placeholder="24"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Maks bookinger per bruker</Text>
                  <TextInput
                    style={styles.input}
                    value={String(settings.maxBookingsPerUser)}
                    onChangeText={(text) => updateSetting('maxBookingsPerUser', parseInt(text) || 0)}
                    placeholder="10"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Betalingsinnstillinger</Text>
              <View style={styles.card}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Krev betaling</Text>
                    <Text style={styles.switchDescription}>
                      Krev betaling for bookinger
                    </Text>
                  </View>
                  <Switch
                    value={settings.requirePayment}
                    onValueChange={(value) =>
                      updateSetting('requirePayment', value)
                    }
                    trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                    thumbColor={settings.requirePayment ? '#3B82F6' : '#F3F4F6'}
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
                  <Text style={styles.label}>MVA-nummer</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.companyVatNumber || ''}
                    onChangeText={(text) =>
                      updateSetting('companyVatNumber', text)
                    }
                    placeholder="NO123456789MVA"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Organisasjonsnummer</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.companyRegNumber || ''}
                    onChangeText={(text) => updateSetting('companyRegNumber', text)}
                    placeholder="123456789"
                    keyboardType="number-pad"
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
              <Text style={styles.sectionTitle}>Varslingsinnstillinger</Text>
              <View style={styles.card}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>E-post varsler</Text>
                    <Text style={styles.switchDescription}>
                      Send e-post varslinger til brukere
                    </Text>
                  </View>
                  <Switch
                    value={settings.emailNotifications}
                    onValueChange={(value) =>
                      updateSetting('emailNotifications', value)
                    }
                    trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                    thumbColor={settings.emailNotifications ? '#3B82F6' : '#F3F4F6'}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>SMS varsler</Text>
                    <Text style={styles.switchDescription}>
                      Send SMS varslinger til brukere
                    </Text>
                  </View>
                  <Switch
                    value={settings.smsNotifications}
                    onValueChange={(value) =>
                      updateSetting('smsNotifications', value)
                    }
                    trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                    thumbColor={settings.smsNotifications ? '#3B82F6' : '#F3F4F6'}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Design & Branding</Text>
              <View style={styles.card}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Primærfarge</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.primaryColor}
                    onChangeText={(text) => updateSetting('primaryColor', text)}
                    placeholder="#3B82F6"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Sekundærfarge</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.secondaryColor}
                    onChangeText={(text) => updateSetting('secondaryColor', text)}
                    placeholder="#10B981"
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

    {/* Time Picker Modals for iOS */}
    {Platform.OS === 'ios' && showStartTimePicker && (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showStartTimePicker}
        onRequestClose={() => setShowStartTimePicker(false)}
      >
        <View style={styles.timePickerModalOverlay}>
          <View style={styles.timePickerModalContent}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Velg åpningstid</Text>
              <TouchableOpacity
                style={styles.timePickerDoneButton}
                onPress={() => setShowStartTimePicker(false)}
              >
                <Text style={styles.timePickerDoneText}>Ferdig</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateTimePickerContainer}>
              <DateTimePicker
                value={timeStringToDate(settings?.businessHoursStart || '06:00')}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleStartTimeChange}
                textColor="#000000"
              />
            </View>
          </View>
        </View>
      </Modal>
    )}

    {Platform.OS === 'ios' && showEndTimePicker && (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEndTimePicker}
        onRequestClose={() => setShowEndTimePicker(false)}
      >
        <View style={styles.timePickerModalOverlay}>
          <View style={styles.timePickerModalContent}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Velg stengetid</Text>
              <TouchableOpacity
                style={styles.timePickerDoneButton}
                onPress={() => setShowEndTimePicker(false)}
              >
                <Text style={styles.timePickerDoneText}>Ferdig</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateTimePickerContainer}>
              <DateTimePicker
                value={timeStringToDate(settings?.businessHoursEnd || '22:00')}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleEndTimeChange}
                textColor="#000000"
              />
            </View>
          </View>
        </View>
      </Modal>
    )}

    {/* Time Pickers for Android (shows directly) */}
    {Platform.OS === 'android' && showStartTimePicker && (
      <DateTimePicker
        value={timeStringToDate(settings?.businessHoursStart || '06:00')}
        mode="time"
        is24Hour={true}
        display="default"
        onChange={handleStartTimeChange}
      />
    )}

    {Platform.OS === 'android' && showEndTimePicker && (
      <DateTimePicker
        value={timeStringToDate(settings?.businessHoursEnd || '22:00')}
        mode="time"
        is24Hour={true}
        display="default"
        onChange={handleEndTimeChange}
      />
    )}
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
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF',
    gap: 8,
  },
  timePickerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
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
  // Time Picker Modal Styles
  timePickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timePickerModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area for home indicator
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  timePickerDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  timePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  dateTimePickerContainer: {
    height: 260,
    width: '100%',
    backgroundColor: '#FFF',
    paddingVertical: 20,
  },
});
