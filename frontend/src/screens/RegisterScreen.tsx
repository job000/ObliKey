import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import Container from '../components/Container';
import { api } from '../services/api';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
}

export default function RegisterScreen({ navigation, route }: any) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    username: '',
    tenantId: route.params?.tenantId || '', // Pre-selected from deep link or empty
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();

  // Fetch active tenants on mount
  useEffect(() => {
    loadActiveTenants();
  }, []);

  const loadActiveTenants = async () => {
    try {
      setLoadingTenants(true);
      const response = await api.getActiveTenants();
      if (response.success && response.data) {
        setTenants(response.data);

        // If no tenant pre-selected, set first tenant as default
        if (!formData.tenantId && response.data.length > 0) {
          setFormData(prev => ({ ...prev, tenantId: response.data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
      Alert.alert('Feil', 'Kunne ikke laste inn gyms. Prøv igjen senere.');
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.username) {
      Alert.alert('Feil', 'Vennligst fyll ut alle obligatoriske feltene');
      return;
    }

    if (!formData.tenantId) {
      Alert.alert('Feil', 'Vennligst velg et gym');
      return;
    }

    // Validate password
    if (formData.password.length < 8) {
      Alert.alert('Feil', 'Passord må være minst 8 tegn');
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      Alert.alert('Feil', 'Passord må inneholde minst én stor bokstav');
      return;
    }

    try {
      setLoading(true);
      await register(formData);
      Alert.alert('Suksess!', 'Konto opprettet! Vennligst logg inn.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      Alert.alert('Registrering feilet', error.response?.data?.error || 'Kunne ikke opprette konto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Container maxWidth={500}>
          <View style={styles.content}>
            <Text style={styles.title}>Opprett konto</Text>
            <Text style={styles.subtitle}>Bli medlem i ObliKey</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Fornavn *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ola"
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="name-given"
              />

              <Text style={styles.label}>Etternavn *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nordmann"
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="name-family"
              />

              <Text style={styles.label}>Brukernavn *</Text>
              <TextInput
                style={styles.input}
                placeholder="olanordmann"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                autoComplete="username-new"
              />

              <Text style={styles.label}>Velg ditt gym *</Text>
              {loadingTenants ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.loadingText}>Laster gyms...</Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.tenantId}
                    onValueChange={(itemValue) => setFormData({ ...formData, tenantId: itemValue })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Velg et gym" value="" />
                    {tenants.map((tenant) => (
                      <Picker.Item
                        key={tenant.id}
                        label={tenant.name}
                        value={tenant.id}
                      />
                    ))}
                  </Picker>
                </View>
              )}

              <Text style={styles.label}>E-post *</Text>
              <TextInput
                style={styles.input}
                placeholder="ola@example.com"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
              />

              <Text style={styles.label}>Telefon</Text>
              <TextInput
                style={styles.input}
                placeholder="12345678"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
              />

              <Text style={styles.label}>Passord *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Minimum 8 tegn, én stor bokstav"
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>Minimum 8 tegn med minst én stor bokstav</Text>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Registrer</Text>
                )}
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Har du allerede en konto? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Logg inn</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Container>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 40,
  },
  content: {
    // Container handles padding
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    paddingRight: 48,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -12,
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  picker: {
    height: 50,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
