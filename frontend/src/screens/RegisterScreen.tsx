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
  Modal,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Container from '../components/Container';
import { api } from '../services/api';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
}

export default function RegisterScreen({ navigation, route }: any) {
  const { colors } = useTheme();
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
  const [tenantModalVisible, setTenantModalVisible] = useState(false);
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
    // Dismiss keyboard immediately
    Keyboard.dismiss();

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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Container maxWidth={500}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.primary }]}>Opprett konto</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Bli medlem i Otico</Text>

            <View style={[styles.form, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.label, { color: colors.text }]}>Fornavn *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.cardBg, color: colors.text }]}
                placeholder="Ola"
                placeholderTextColor={colors.textLight}
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="name-given"
              />

              <Text style={[styles.label, { color: colors.text }]}>Etternavn *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.cardBg, color: colors.text }]}
                placeholder="Nordmann"
                placeholderTextColor={colors.textLight}
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="name-family"
              />

              <Text style={[styles.label, { color: colors.text }]}>Brukernavn *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.cardBg, color: colors.text }]}
                placeholder="olanordmann"
                placeholderTextColor={colors.textLight}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                autoComplete="username-new"
              />

              <Text style={[styles.label, { color: colors.text }]}>Velg ditt gym *</Text>
              {loadingTenants ? (
                <View style={[styles.loadingContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Laster gyms...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.tenantSelector, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
                  onPress={() => setTenantModalVisible(true)}
                >
                  <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
                  <Text style={[
                    styles.tenantSelectorText,
                    { color: formData.tenantId ? colors.text : colors.textLight }
                  ]}>
                    {formData.tenantId
                      ? tenants.find(t => t.id === formData.tenantId)?.name
                      : 'Velg et gym'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              <Text style={[styles.label, { color: colors.text }]}>E-post *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.cardBg, color: colors.text }]}
                placeholder="ola@example.com"
                placeholderTextColor={colors.textLight}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
              />

              <Text style={[styles.label, { color: colors.text }]}>Telefon</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.cardBg, color: colors.text }]}
                placeholder="12345678"
                placeholderTextColor={colors.textLight}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
              />

              <Text style={[styles.label, { color: colors.text }]}>Passord *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colors.cardBg, color: colors.text }]}
                  placeholder="Minimum 8 tegn, én stor bokstav"
                  placeholderTextColor={colors.textLight}
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
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>Minimum 8 tegn med minst én stor bokstav</Text>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
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
                <Text style={[styles.loginText, { color: colors.textSecondary }]}>Har du allerede en konto? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={[styles.loginLink, { color: colors.primary }]}>Logg inn</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Container>
      </ScrollView>

      {/* Tenant Selection Modal */}
      <Modal
        visible={tenantModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTenantModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Velg ditt gym</Text>
              <TouchableOpacity
                onPress={() => setTenantModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={tenants}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.tenantItem,
                    { borderBottomColor: colors.border },
                    formData.tenantId === item.id && { backgroundColor: colors.primary + '10' }
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, tenantId: item.id });
                    setTenantModalVisible(false);
                  }}
                >
                  <View style={styles.tenantInfo}>
                    <Text style={[
                      styles.tenantName,
                      { color: formData.tenantId === item.id ? colors.primary : colors.text }
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={[
                      styles.tenantSubdomain,
                      { color: formData.tenantId === item.id ? colors.primary : colors.textSecondary }
                    ]}>
                      {item.subdomain}.oblikey.no
                    </Text>
                  </View>
                  {formData.tenantId === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="business-outline" size={48} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>Ingen gyms tilgjengelig</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 4,
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
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
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
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
  },
  tenantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  tenantSelectorText: {
    flex: 1,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
});
