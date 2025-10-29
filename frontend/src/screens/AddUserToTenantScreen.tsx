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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function AddUserToTenantScreen({ navigation, route }: any) {
  const { tenantId, tenantName } = route.params;
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'CUSTOMER' as 'ADMIN' | 'CUSTOMER',
    phone: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isWeb = Platform.OS === 'web';

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Fornavn er påkrevd';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Etternavn er påkrevd';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'E-post er påkrevd';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ugyldig e-postadresse';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Passord er påkrevd';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Passord må være minst 8 tegn';
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
      const response = await api.createUserForTenant(tenantId, {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        phone: formData.phone.trim() || undefined,
      });

      Alert.alert('Suksess', 'Bruker opprettet', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err: any) {
      console.error('Failed to create user:', err);
      const errorMessage = err.response?.data?.message || 'Kunne ikke opprette bruker';

      // Check for email conflict
      if (errorMessage.includes('email') || errorMessage.includes('already exists')) {
        setErrors({ ...errors, email: 'Denne e-postadressen er allerede i bruk i denne tenanten' });
      } else {
        Alert.alert('Feil', errorMessage);
      }
    } finally {
      setCreating(false);
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
          <Text style={styles.title}>Legg til Bruker</Text>
          <Text style={styles.subtitle}>
            Opprett ny bruker for {tenantName}
          </Text>
        </View>
      </View>

      {/* Form Card */}
      <View style={[styles.card, isWeb && styles.webCard]}>
        {/* First Name Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Fornavn <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            value={formData.firstName}
            onChangeText={(text) => {
              setFormData({ ...formData, firstName: text });
              if (errors.firstName) setErrors({ ...errors, firstName: '' });
            }}
            placeholder="Ola"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          <Text style={styles.helpText}>Brukerens fornavn</Text>
        </View>

        {/* Last Name Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Etternavn <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.lastName && styles.inputError]}
            value={formData.lastName}
            onChangeText={(text) => {
              setFormData({ ...formData, lastName: text });
              if (errors.lastName) setErrors({ ...errors, lastName: '' });
            }}
            placeholder="Nordmann"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          <Text style={styles.helpText}>Brukerens etternavn</Text>
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
            placeholder="bruker@eksempel.no"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          <Text style={styles.helpText}>Brukerens e-postadresse for innlogging</Text>
        </View>

        {/* Password Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Passord <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            value={formData.password}
            onChangeText={(text) => {
              setFormData({ ...formData, password: text });
              if (errors.password) setErrors({ ...errors, password: '' });
            }}
            placeholder="Minimum 8 tegn"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          <Text style={styles.helpText}>Minimum 8 tegn</Text>
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
          <Text style={styles.helpText}>Valgfri telefonnummer</Text>
        </View>

        {/* Role Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Rolle <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === 'CUSTOMER' && styles.roleButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, role: 'CUSTOMER' })}
            >
              <Ionicons
                name="person"
                size={20}
                color={formData.role === 'CUSTOMER' ? '#FFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.roleButtonText,
                  formData.role === 'CUSTOMER' && styles.roleButtonTextActive,
                ]}
              >
                Kunde
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === 'ADMIN' && styles.roleButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, role: 'ADMIN' })}
            >
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={formData.role === 'ADMIN' ? '#FFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.roleButtonText,
                  formData.role === 'ADMIN' && styles.roleButtonTextActive,
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helpText}>
            {formData.role === 'ADMIN'
              ? 'Admin har tilgang til å administrere tenanten'
              : 'Kunde har tilgang til å bruke systemet'}
          </Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={[styles.infoCard, isWeb && styles.webCard]}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoTitle}>Om brukeropprettelse</Text>
        </View>
        <View style={styles.infoList}>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.infoItemText}>
              Brukeren får en e-post med påloggingsinformasjon
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.infoItemText}>
              Brukeren kan logge inn på subdomain: {tenantName}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.infoItemText}>
              Admin brukere kan administrere tenanten
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
              <Ionicons name="person-add" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Opprett Bruker</Text>
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
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  roleButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#FFF',
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
