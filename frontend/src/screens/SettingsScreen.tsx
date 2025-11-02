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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
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
  // PT Settings
  ptEnabled: boolean;
  ptCancellationHours: number;
  ptCancellationRefundEnabled: boolean;
  ptNoShowRefundEnabled: boolean;
  // Workout Settings
  workoutEnabled: boolean;
}

export default function SettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, themeMode, setThemeMode } = useTheme();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'business' | 'system'>('general');

  // Time picker states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Color picker states
  const [showPrimaryColorPicker, setShowPrimaryColorPicker] = useState(false);
  const [showSecondaryColorPicker, setShowSecondaryColorPicker] = useState(false);

  // Predefined color palette
  const colorPalette = [
    { name: 'Blå', value: '#3B82F6' },
    { name: 'Grønn', value: '#10B981' },
    { name: 'Lilla', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Rød', value: '#EF4444' },
    { name: 'Oransje', value: '#F59E0B' },
    { name: 'Turkis', value: '#14B8A6' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Mørk Blå', value: '#1E40AF' },
    { name: 'Mørk Grønn', value: '#059669' },
    { name: 'Gull', value: '#D97706' },
    { name: 'Koral', value: '#F97316' },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Load cached colors from AsyncStorage first
      const [cachedPrimaryColor, cachedSecondaryColor] = await Promise.all([
        AsyncStorage.getItem('@primaryColor'),
        AsyncStorage.getItem('@secondaryColor'),
      ]);

      const response = await api.getTenantSettings();
      if (response.success) {
        setSettings({
          ...response.data,
          // Override with cached colors if available
          primaryColor: cachedPrimaryColor || response.data.primaryColor || '#3B82F6',
          secondaryColor: cachedSecondaryColor || response.data.secondaryColor || '#10B981',
        });
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
          primaryColor: cachedPrimaryColor || '#3B82F6',
          secondaryColor: cachedSecondaryColor || '#10B981',
          companyVatNumber: '',
          companyRegNumber: '',
          ptEnabled: false,
          ptCancellationHours: 24,
          ptCancellationRefundEnabled: true,
          ptNoShowRefundEnabled: false,
          workoutEnabled: false,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Load from AsyncStorage if API fails
      const [cachedPrimaryColor, cachedSecondaryColor] = await Promise.all([
        AsyncStorage.getItem('@primaryColor'),
        AsyncStorage.getItem('@secondaryColor'),
      ]);

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
        primaryColor: cachedPrimaryColor || '#3B82F6',
        secondaryColor: cachedSecondaryColor || '#10B981',
        companyVatNumber: '',
        companyRegNumber: '',
        ptEnabled: false,
        ptCancellationHours: 24,
        ptCancellationRefundEnabled: true,
        ptNoShowRefundEnabled: false,
        workoutEnabled: false,
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

  const updateSetting = async (key: keyof TenantSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });

      // Save colors to AsyncStorage immediately for persistence
      if (key === 'primaryColor') {
        await AsyncStorage.setItem('@primaryColor', value);
      } else if (key === 'secondaryColor') {
        await AsyncStorage.setItem('@secondaryColor', value);
      }
    }
  };

  const selectColorFromPalette = async (colorType: 'primary' | 'secondary', color: string) => {
    if (colorType === 'primary') {
      await updateSetting('primaryColor', color);
      setShowPrimaryColorPicker(false);
    } else {
      await updateSetting('secondaryColor', color);
      setShowSecondaryColorPicker(false);
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Kunne ikke laste innstillinger</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Innstillinger</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>System- og tenant-innstillinger</Text>
            </View>
          </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              activeTab === 'general' && [styles.tabActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('general')}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.text },
                activeTab === 'general' && styles.tabTextActive,
              ]}
            >
              Generelt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              activeTab === 'business' && [styles.tabActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('business')}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.text },
                activeTab === 'business' && styles.tabTextActive,
              ]}
            >
              Bedrift
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              activeTab === 'system' && [styles.tabActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('system')}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.text },
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
            {/* Theme Selection Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Utseende</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Tema</Text>
                  <View style={styles.themeButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.themeButton,
                        themeMode === 'light' && [styles.themeButtonActive, { backgroundColor: colors.primary }],
                        themeMode !== 'light' && { backgroundColor: colors.borderLight },
                      ]}
                      onPress={() => setThemeMode('light')}
                    >
                      <Ionicons
                        name="sunny"
                        size={20}
                        color={themeMode === 'light' ? '#FFF' : colors.textSecondary}
                      />
                      <Text style={[
                        styles.themeButtonText,
                        themeMode === 'light' ? styles.themeButtonTextActive : { color: colors.textSecondary }
                      ]}>
                        Lys
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.themeButton,
                        themeMode === 'dark' && [styles.themeButtonActive, { backgroundColor: colors.primary }],
                        themeMode !== 'dark' && { backgroundColor: colors.borderLight },
                      ]}
                      onPress={() => setThemeMode('dark')}
                    >
                      <Ionicons
                        name="moon"
                        size={20}
                        color={themeMode === 'dark' ? '#FFF' : colors.textSecondary}
                      />
                      <Text style={[
                        styles.themeButtonText,
                        themeMode === 'dark' ? styles.themeButtonTextActive : { color: colors.textSecondary }
                      ]}>
                        Mørk
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.themeButton,
                        themeMode === 'system' && [styles.themeButtonActive, { backgroundColor: colors.primary }],
                        themeMode !== 'system' && { backgroundColor: colors.borderLight },
                      ]}
                      onPress={() => setThemeMode('system')}
                    >
                      <Ionicons
                        name="phone-portrait-outline"
                        size={20}
                        color={themeMode === 'system' ? '#FFF' : colors.textSecondary}
                      />
                      <Text style={[
                        styles.themeButtonText,
                        themeMode === 'system' ? styles.themeButtonTextActive : { color: colors.textSecondary }
                      ]}>
                        System
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking-innstillinger</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                {/* Start Time Picker */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Åpningstid</Text>
                  <TouchableOpacity
                    style={[styles.timePickerButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                    <Text style={[styles.timePickerText, { color: colors.text }]}>
                      {settings.businessHoursStart}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                </View>

                {/* End Time Picker */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Stengetid</Text>
                  <TouchableOpacity
                    style={[styles.timePickerButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                    <Text style={[styles.timePickerText, { color: colors.text }]}>
                      {settings.businessHoursEnd}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Avbestillingsfrist (timer)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.bookingCancellation)}
                    onChangeText={(text) => updateSetting('bookingCancellation', parseInt(text) || 0)}
                    placeholder="24"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Maks bookinger per bruker</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.maxBookingsPerUser)}
                    onChangeText={(text) => updateSetting('maxBookingsPerUser', parseInt(text) || 0)}
                    placeholder="10"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Betalingsinnstillinger</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Krev betaling</Text>
                    <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                      Krev betaling for bookinger
                    </Text>
                  </View>
                  <Switch
                    value={settings.requirePayment}
                    onValueChange={(value) =>
                      updateSetting('requirePayment', value)
                    }
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={settings.requirePayment ? colors.primary : colors.borderLight}
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Bedriftsdetaljer</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>MVA-nummer</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={settings.companyVatNumber || ''}
                    onChangeText={(text) =>
                      updateSetting('companyVatNumber', text)
                    }
                    placeholder="NO123456789MVA"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Organisasjonsnummer</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={settings.companyRegNumber || ''}
                    onChangeText={(text) => updateSetting('companyRegNumber', text)}
                    placeholder="123456789"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Valuta</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={settings.currency}
                    onChangeText={(text) => updateSetting('currency', text)}
                    placeholder="NOK"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Tidssone</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={settings.timezone}
                    onChangeText={(text) => updateSetting('timezone', text)}
                    placeholder="Europe/Oslo"
                    placeholderTextColor={colors.textLight}
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Varslingsinnstillinger</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>E-post varsler</Text>
                    <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                      Send e-post varslinger til brukere
                    </Text>
                  </View>
                  <Switch
                    value={settings.emailNotifications}
                    onValueChange={(value) =>
                      updateSetting('emailNotifications', value)
                    }
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={settings.emailNotifications ? colors.primary : colors.borderLight}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>SMS varsler</Text>
                    <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                      Send SMS varslinger til brukere
                    </Text>
                  </View>
                  <Switch
                    value={settings.smsNotifications}
                    onValueChange={(value) =>
                      updateSetting('smsNotifications', value)
                    }
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={settings.smsNotifications ? colors.primary : colors.borderLight}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Design & Branding</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Primærfarge</Text>
                  <View style={styles.colorInputRow}>
                    <TouchableOpacity
                      style={[styles.colorPreview, { backgroundColor: settings.primaryColor }]}
                      onPress={() => setShowPrimaryColorPicker(true)}
                    >
                      <Ionicons name="color-palette-outline" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, styles.colorTextInput, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                      value={settings.primaryColor}
                      onChangeText={(text) => updateSetting('primaryColor', text)}
                      placeholder="#3B82F6"
                      placeholderTextColor={colors.textLight}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Sekundærfarge</Text>
                  <View style={styles.colorInputRow}>
                    <TouchableOpacity
                      style={[styles.colorPreview, { backgroundColor: settings.secondaryColor }]}
                      onPress={() => setShowSecondaryColorPicker(true)}
                    >
                      <Ionicons name="color-palette-outline" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, styles.colorTextInput, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                      value={settings.secondaryColor}
                      onChangeText={(text) => updateSetting('secondaryColor', text)}
                      placeholder="#10B981"
                      placeholderTextColor={colors.textLight}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>PT-Innstillinger</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Aktiver PT-funksjonen</Text>
                    <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                      Slå på/av personlig treningsfunksjonalitet
                    </Text>
                  </View>
                  <Switch
                    value={settings.ptEnabled}
                    onValueChange={(value) =>
                      updateSetting('ptEnabled', value)
                    }
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={settings.ptEnabled ? colors.primary : colors.borderLight}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Kreditt-refusjon ved avlysning</Text>
                    <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                      Refunder automatisk PT-timer når økter avlyses
                    </Text>
                  </View>
                  <Switch
                    value={settings.ptCancellationRefundEnabled}
                    onValueChange={(value) =>
                      updateSetting('ptCancellationRefundEnabled', value)
                    }
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={settings.ptCancellationRefundEnabled ? colors.primary : colors.borderLight}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Refunder ved "Møter ikke"</Text>
                    <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                      Gi kreditt tilbake når PT/Admin markerer kunde som møtte ikke
                    </Text>
                  </View>
                  <Switch
                    value={settings.ptNoShowRefundEnabled}
                    onValueChange={(value) =>
                      updateSetting('ptNoShowRefundEnabled', value)
                    }
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={settings.ptNoShowRefundEnabled ? colors.primary : colors.borderLight}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Avlysningsfrist for refusjon (timer)
                  </Text>
                  <Text style={[styles.fieldDescription, { color: colors.textSecondary }]}>
                    Antall timer før økten kunden må avlyse for å få refusjon
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={settings.ptCancellationHours?.toString()}
                    onChangeText={(text) => {
                      const hours = parseInt(text) || 24;
                      updateSetting('ptCancellationHours', hours);
                    }}
                    keyboardType="number-pad"
                    placeholder="24"
                    placeholderTextColor={colors.textLight}
                  />
                  <Text style={[styles.fieldHint, { color: colors.textLight }]}>
                    Anbefalt: 24 timer. PT/Admin får alltid refundert kunden uansett.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Treningsprogram-Innstillinger</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Aktiver Treningsprogram-funksjonen</Text>
                    <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                      Slå på/av treningsprogram med øvelser, tracking og statistikk
                    </Text>
                  </View>
                  <Switch
                    value={settings.workoutEnabled}
                    onValueChange={(value) =>
                      updateSetting('workoutEnabled', value)
                    }
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={settings.workoutEnabled ? colors.primary : colors.borderLight}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Hurtighandlinger</Text>
              <View style={[styles.actionsCard, { backgroundColor: colors.cardBg }]}>
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => navigation.navigate('UserManagement')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.borderLight }]}>
                    <Ionicons name="people-outline" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.text }]}>Brukeradministrasjon</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => navigation.navigate('ProductsManagement')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.borderLight }]}>
                    <Ionicons name="cube-outline" size={24} color={colors.success} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.text }]}>Produktadministrasjon</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => navigation.navigate('Analytics')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.borderLight }]}>
                    <Ionicons name="stats-chart-outline" size={24} color={colors.accent} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.text }]}>Rapporter & Analyse</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            saving && [styles.saveButtonDisabled, { backgroundColor: colors.primaryLight }]
          ]}
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
          <Text style={[styles.appInfoText, { color: colors.textLight }]}>Otico v1.0.0</Text>
          <Text style={[styles.appInfoText, { color: colors.textLight }]}>© 2025 Otico Tech</Text>
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
          <View style={[styles.timePickerModalContent, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.timePickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.timePickerTitle, { color: colors.text }]}>Velg åpningstid</Text>
              <TouchableOpacity
                style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowStartTimePicker(false)}
              >
                <Text style={styles.timePickerDoneText}>Ferdig</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.dateTimePickerContainer, { backgroundColor: colors.cardBg }]}>
              <DateTimePicker
                value={timeStringToDate(settings?.businessHoursStart || '06:00')}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleStartTimeChange}
                textColor={colors.text}
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
          <View style={[styles.timePickerModalContent, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.timePickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.timePickerTitle, { color: colors.text }]}>Velg stengetid</Text>
              <TouchableOpacity
                style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowEndTimePicker(false)}
              >
                <Text style={styles.timePickerDoneText}>Ferdig</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.dateTimePickerContainer, { backgroundColor: colors.cardBg }]}>
              <DateTimePicker
                value={timeStringToDate(settings?.businessHoursEnd || '22:00')}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleEndTimeChange}
                textColor={colors.text}
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

    {/* Primary Color Picker Modal */}
    <Modal
      visible={showPrimaryColorPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPrimaryColorPicker(false)}
    >
      <View style={styles.colorModalOverlay}>
        <View style={[styles.colorModalContent, { backgroundColor: colors.cardBg }]}>
          <View style={styles.colorModalHeader}>
            <Text style={[styles.colorModalTitle, { color: colors.text }]}>Velg primærfarge</Text>
            <TouchableOpacity onPress={() => setShowPrimaryColorPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.colorPaletteGrid}>
            {colorPalette.map((color) => (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                  settings?.primaryColor === color.value && styles.colorOptionSelected,
                ]}
                onPress={() => selectColorFromPalette('primary', color.value)}
              >
                {settings?.primaryColor === color.value && (
                  <Ionicons name="checkmark" size={24} color="#FFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.colorNameContainer}>
            {colorPalette.map((color) => (
              <Text
                key={`name-${color.value}`}
                style={[
                  styles.colorName,
                  { color: colors.textSecondary, backgroundColor: colors.borderLight },
                  settings?.primaryColor === color.value && [styles.colorNameSelected, { backgroundColor: colors.primary }],
                ]}
              >
                {color.name}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Modal>

    {/* Secondary Color Picker Modal */}
    <Modal
      visible={showSecondaryColorPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSecondaryColorPicker(false)}
    >
      <View style={styles.colorModalOverlay}>
        <View style={[styles.colorModalContent, { backgroundColor: colors.cardBg }]}>
          <View style={styles.colorModalHeader}>
            <Text style={[styles.colorModalTitle, { color: colors.text }]}>Velg sekundærfarge</Text>
            <TouchableOpacity onPress={() => setShowSecondaryColorPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.colorPaletteGrid}>
            {colorPalette.map((color) => (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                  settings?.secondaryColor === color.value && styles.colorOptionSelected,
                ]}
                onPress={() => selectColorFromPalette('secondary', color.value)}
              >
                {settings?.secondaryColor === color.value && (
                  <Ionicons name="checkmark" size={24} color="#FFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.colorNameContainer}>
            {colorPalette.map((color) => (
              <Text
                key={`name-${color.value}`}
                style={[
                  styles.colorName,
                  { color: colors.textSecondary, backgroundColor: colors.borderLight },
                  settings?.secondaryColor === color.value && [styles.colorNameSelected, { backgroundColor: colors.primary }],
                ]}
              >
                {color.name}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Modal>
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
  // Color Picker Styles
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorTextInput: {
    flex: 1,
  },
  colorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  colorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  colorModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 24,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  colorNameContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  colorName: {
    fontSize: 12,
    color: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  colorNameSelected: {
    backgroundColor: '#3B82F6',
    color: '#FFF',
    fontWeight: '600',
  },
  fieldDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  fieldHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Theme Button Styles
  themeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  themeButtonActive: {
    // backgroundColor set dynamically
  },
  themeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeButtonTextActive: {
    color: '#FFF',
  },
});
