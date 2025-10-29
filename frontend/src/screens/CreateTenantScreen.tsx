import React, { useState } from 'react';
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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function CreateTenantScreen({ navigation }: any) {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    email: '',
    phone: '',
    address: '',
    active: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isWeb = Platform.OS === 'web';

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Tenant navn er påkrevd';
    }

    // Subdomain validation
    if (!formData.subdomain.trim()) {
      newErrors.subdomain = 'Subdomain er påkrevd';
    } else if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
      newErrors.subdomain = 'Subdomain kan kun inneholde små bokstaver, tall og bindestreker';
    } else if (formData.subdomain.length < 3) {
      newErrors.subdomain = 'Subdomain må være minst 3 tegn';
    } else if (formData.subdomain.startsWith('-') || formData.subdomain.endsWith('-')) {
      newErrors.subdomain = 'Subdomain kan ikke starte eller slutte med bindestrek';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'E-post er påkrevd';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ugyldig e-postadresse';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setCreating(true);
      const response = await api.createTenant({
        name: formData.name.trim(),
        subdomain: formData.subdomain.trim().toLowerCase(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        active: formData.active,
      });

      Alert.alert('Suksess', 'Tenant opprettet', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err: any) {
      console.error('Failed to create tenant:', err);
      console.error('Error response:', JSON.stringify(err.response?.data, null, 2));

      // Backend returns 'error' not 'message'
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Kunne ikke opprette tenant';

      // Check for subdomain conflict
      if (errorMessage.includes('subdomain') || errorMessage.includes('unique') || errorMessage.includes('taken')) {
        setErrors({ ...errors, subdomain: 'Dette subdomainet er allerede i bruk' });
      } else {
        Alert.alert('Feil', errorMessage);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSubdomainChange = (text: string) => {
    // Auto-convert to lowercase and remove invalid characters
    const cleaned = text.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, subdomain: cleaned });

    // Clear subdomain error when user types
    if (errors.subdomain) {
      setErrors({ ...errors, subdomain: '' });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Opprett Ny Tenant</Text>
          <Text style={styles.subtitle}>Fyll ut informasjonen nedenfor for å opprette en ny tenant</Text>
        </View>
      </View>

      {/* Form Card */}
      <View style={[styles.card, isWeb && styles.webCard]}>
        {/* Name Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Tenant Navn <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={(text) => {
              setFormData({ ...formData, name: text });
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            placeholder="Eksempel AS"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          <Text style={styles.helpText}>Firmanavn eller organisasjonsnavn</Text>
        </View>

        {/* Subdomain Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Subdomain <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.inputContainer, errors.subdomain && styles.inputError]}>
            <TextInput
              style={styles.subdomainInput}
              value={formData.subdomain}
              onChangeText={handleSubdomainChange}
              placeholder="eksempel"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.subdomainSuffix}>.oblikey.no</Text>
          </View>
          {errors.subdomain && <Text style={styles.errorText}>{errors.subdomain}</Text>}
          <Text style={styles.helpText}>
            Kun små bokstaver, tall og bindestreker. Minimum 3 tegn.
          </Text>
          {formData.subdomain && !errors.subdomain && (
            <View style={styles.preview}>
              <Ionicons name="link" size={16} color="#10B981" />
              <Text style={styles.previewText}>
                https://{formData.subdomain}.oblikey.no
              </Text>
            </View>
          )}
        </View>

        {/* Email Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            E-post <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={formData.email}
            onChangeText={(text) => {
              setFormData({ ...formData, email: text });
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            placeholder="kontakt@eksempel.no"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          <Text style={styles.helpText}>Primær kontakt e-post for tenanten</Text>
        </View>

        {/* Phone Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="+47 123 45 678"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
          <Text style={styles.helpText}>Valgfri kontakt telefonnummer</Text>
        </View>

        {/* Address Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Adresse</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Gateadresse 123&#10;0123 Oslo"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
          <Text style={styles.helpText}>Valgfri forretningsadresse</Text>
        </View>

        {/* Active Switch */}
        <View style={styles.field}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Aktiver tenant umiddelbart</Text>
              <Text style={styles.helpText}>
                Tenanten vil kunne logge inn og bruke systemet
              </Text>
            </View>
            <Switch
              value={formData.active}
              onValueChange={(value) => setFormData({ ...formData, active: value })}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor="#FFF"
            />
          </View>
        </View>
      </View>

      {/* Info Card */}
      <View style={[styles.infoCard, isWeb && styles.webCard]}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoTitle}>Hva skjer etter opprettelse?</Text>
        </View>
        <View style={styles.infoList}>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.infoItemText}>Tenant opprettes med unikt subdomain</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.infoItemText}>Database isolasjon konfigureres automatisk</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.infoItemText}>
              Du kan legge til abonnement og features i neste steg
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.infoItemText}>
              Admin brukere kan opprettes av tenanten selv
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={[styles.actions, isWeb && styles.webActions]}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={creating}
        >
          <Text style={styles.cancelButtonText}>Avbryt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.createButton, creating && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Opprett Tenant</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  webCard: {
    padding: 32,
  },
  field: {
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
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
  },
  subdomainInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  subdomainSuffix: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  previewText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  switchLabel: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoItemText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  webActions: {
    justifyContent: 'flex-end',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
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
  createButton: {
    backgroundColor: '#3B82F6',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
