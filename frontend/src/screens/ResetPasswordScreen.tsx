import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';

export default function ResetPasswordScreen({ navigation, route }: any) {
  const [token, setToken] = useState(route?.params?.token || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (): boolean => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert(
        'Ugyldig passord',
        'Passordet må være minst 8 tegn langt'
      );
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Feil', 'Passordene stemmer ikke overens');
      return false;
    }

    if (!token) {
      Alert.alert('Feil', 'Ingen tilbakestillingstoken funnet');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;

    try {
      setLoading(true);

      const response = await api.resetPassword(token, newPassword);

      if (response.success) {
        Alert.alert(
          'Passord endret',
          'Passordet ditt har blitt tilbakestilt. Du kan nå logge inn med ditt nye passord.',
          [
            {
              text: 'Gå til innlogging',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Feil',
          response.error || 'Kunne ikke tilbakestille passord'
        );
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      Alert.alert(
        'Feil',
        error.response?.data?.error ||
          'Kunne ikke tilbakestille passord. Vennligst prøv igjen.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (): {
    label: string;
    color: string;
    strength: number;
  } => {
    if (!newPassword) return { label: '', color: '#D1D5DB', strength: 0 };

    let strength = 0;

    if (newPassword.length >= 8) strength += 1;
    if (newPassword.length >= 12) strength += 1;
    if (/[a-z]/.test(newPassword)) strength += 1;
    if (/[A-Z]/.test(newPassword)) strength += 1;
    if (/[0-9]/.test(newPassword)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(newPassword)) strength += 1;

    if (strength <= 2) return { label: 'Svakt', color: '#EF4444', strength };
    if (strength <= 4) return { label: 'Middels', color: '#F59E0B', strength };
    return { label: 'Sterkt', color: '#10B981', strength };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Container>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={48} color="#3B82F6" />
            </View>
            <Text style={styles.title}>Tilbakestill passord</Text>
            <Text style={styles.subtitle}>
              Opprett et nytt, sterkt passord for kontoen din
            </Text>
          </View>

          <View style={styles.form}>
            {/* Token Input (if not provided via route) */}
            {!route?.params?.token && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tilbakestillingskode</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="key"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Skriv inn koden du mottok"
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={styles.helperText}>
                  Koden ble sendt til deg via e-post
                </Text>
              </View>
            )}

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nytt passord</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Minst 8 tegn"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              {newPassword && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarContainer}>
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          width: `${(passwordStrength.strength / 6) * 100}%`,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
              )}

              <View style={styles.requirements}>
                <Text style={styles.requirementsTitle}>Krav til passord:</Text>
                <View style={styles.requirement}>
                  <Ionicons
                    name={newPassword.length >= 8 ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={newPassword.length >= 8 ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.requirementText}>Minst 8 tegn</Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons
                    name={/[A-Z]/.test(newPassword) ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={/[A-Z]/.test(newPassword) ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.requirementText}>Minst én stor bokstav</Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons
                    name={/[0-9]/.test(newPassword) ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={/[0-9]/.test(newPassword) ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.requirementText}>Minst ett tall</Text>
                </View>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bekreft passord</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Skriv inn passordet på nytt"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword && newPassword !== confirmPassword && (
                <Text style={styles.errorText}>Passordene stemmer ikke overens</Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>Tilbakestill passord</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="arrow-back" size={16} color="#3B82F6" />
              <Text style={styles.backToLoginText}>Tilbake til innlogging</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Container>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
  },
  strengthContainer: {
    gap: 8,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 13,
    fontWeight: '600',
  },
  requirements: {
    gap: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#6B7280',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
});
