import React, { useState } from 'react';
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
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import Container from '../components/Container';
import { api } from '../services/api';

interface TenantOption {
  id: string;
  name: string;
  subdomain: string;
}

export default function LoginScreen({ navigation }: any) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [showTenantSelection, setShowTenantSelection] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    // Dismiss keyboard immediately
    Keyboard.dismiss();

    if (!identifier || !password) {
      Alert.alert('Feil', 'Vennligst fyll ut alle feltene');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting login with:', identifier);

      // Call API login directly to check if tenant selection is needed
      const response = await api.login(identifier, password);

      // Check if response requires tenant selection
      if (response.data?.requiresTenantSelection) {
        console.log('Multi-tenant user detected, showing tenant selection');
        setTenants(response.data.tenants);
        setShowTenantSelection(true);
      } else {
        // Normal login - call AuthContext login to set user state
        await login(identifier, password);
        console.log('Login successful');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Kunne ikke logge inn';
      Alert.alert('Innlogging feilet', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = async (tenantId: string) => {
    try {
      setLoading(true);
      console.log('Selecting tenant:', tenantId);

      // Call API selectTenant to complete login
      await api.selectTenant(identifier, tenantId);

      // Call AuthContext login to set user state (token is already saved by api.selectTenant)
      await login(identifier, password);
      console.log('Tenant selection and login successful');
    } catch (error: any) {
      console.error('Tenant selection error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Kunne ikke velge organisasjon';
      Alert.alert('Feil ved valg av organisasjon', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // If tenant selection is needed, show tenant selection UI
  if (showTenantSelection) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Container maxWidth={500}>
            <View style={styles.content}>
              <View style={styles.tenantSelectionHeader}>
                <Ionicons name="business-outline" size={48} color="#3B82F6" />
                <Text style={styles.title}>Velg organisasjon</Text>
                <Text style={styles.subtitle}>
                  Du har tilgang til flere organisasjoner. Velg hvilken du vil logge inn på:
                </Text>
              </View>

              <View style={styles.form}>
                {tenants.map((tenant) => (
                  <TouchableOpacity
                    key={tenant.id}
                    style={styles.tenantCard}
                    onPress={() => handleSelectTenant(tenant.id)}
                    disabled={loading}
                  >
                    <View style={styles.tenantIcon}>
                      <Ionicons name="business" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.tenantInfo}>
                      <Text style={styles.tenantName}>{tenant.name}</Text>
                      <Text style={styles.tenantSubdomain}>@{tenant.subdomain}</Text>
                    </View>
                    {loading ? (
                      <ActivityIndicator color="#3B82F6" />
                    ) : (
                      <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setShowTenantSelection(false);
                    setTenants([]);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.backButtonText}>Tilbake til innlogging</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Container maxWidth={500}>
          <View style={styles.content}>
            <Text style={styles.title}>Otico</Text>
            <Text style={styles.subtitle}>Logg inn på din konto</Text>

            <View style={styles.form}>
              <Text style={styles.label}>E-post eller brukernavn</Text>
              <TextInput
                style={styles.input}
                placeholder="din@epost.no eller brukernavn"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                autoComplete="username"
              />

              <Text style={styles.label}>Passord</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  autoComplete="password"
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

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>Glemt passord?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Logg inn</Text>
                )}
              </TouchableOpacity>

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Har du ikke en konto? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerLink}>Registrer deg</Text>
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
    justifyContent: 'center',
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
    marginBottom: 16,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  registerLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  tenantSelectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tenantIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tenantSubdomain: {
    fontSize: 14,
    color: '#6B7280',
  },
  backButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
