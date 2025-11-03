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
import { useTheme } from '../contexts/ThemeContext';
import Container from '../components/Container';
import { api } from '../services/api';

interface TenantOption {
  id: string;
  name: string;
  subdomain: string;
}

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
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
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Container maxWidth={500}>
            <View style={styles.content}>
              <View style={styles.tenantSelectionHeader}>
                <Ionicons name="business-outline" size={48} color={colors.primary} />
                <Text style={[styles.title, { color: colors.primary }]}>Velg organisasjon</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Du har tilgang til flere organisasjoner. Velg hvilken du vil logge inn på:
                </Text>
              </View>

              <View style={[styles.form, { backgroundColor: colors.cardBg }]}>
                {tenants.map((tenant) => (
                  <TouchableOpacity
                    key={tenant.id}
                    style={[styles.tenantCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                    onPress={() => handleSelectTenant(tenant.id)}
                    disabled={loading}
                  >
                    <View style={[styles.tenantIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="business" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.tenantInfo}>
                      <Text style={[styles.tenantName, { color: colors.text }]}>{tenant.name}</Text>
                      <Text style={[styles.tenantSubdomain, { color: colors.textSecondary }]}>@{tenant.subdomain}</Text>
                    </View>
                    {loading ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
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
                  <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>Tilbake til innlogging</Text>
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Container maxWidth={500}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.primary }]}>Otico</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Logg inn på din konto</Text>

            <View style={[styles.form, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.label, { color: colors.text }]}>E-post eller brukernavn</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.cardBg, color: colors.text }]}
                placeholder="din@epost.no eller brukernavn"
                placeholderTextColor={colors.textLight}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                autoComplete="username"
              />

              <Text style={[styles.label, { color: colors.text }]}>Passord</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colors.cardBg, color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textLight}
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
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Glemt passord?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
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
                <Text style={[styles.registerText, { color: colors.textSecondary }]}>Har du ikke en konto? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={[styles.registerLink, { color: colors.primary }]}>Registrer deg</Text>
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
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
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
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    paddingRight: 48,
    fontSize: 16,
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
    fontSize: 14,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 14,
  },
  registerLink: {
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
    borderWidth: 1,
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
    marginBottom: 4,
  },
  tenantSubdomain: {
    fontSize: 14,
  },
  backButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
