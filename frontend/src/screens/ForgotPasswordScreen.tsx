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
} from 'react-native';
import Container from '../components/Container';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Feil', 'Vennligst skriv inn e-postadressen din');
      return;
    }

    try {
      setLoading(true);
      await api.forgotPassword(email);
      Alert.alert(
        'E-post sendt!',
        'Vi har sendt deg en e-post med instruksjoner for å tilbakestille passordet ditt.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke sende e-post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Container maxWidth={500}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.primary }]}>Glemt passord</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
            </Text>

            <View style={[styles.form, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.label, { color: colors.text }]}>E-post</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.cardBg, color: colors.text }]}
                placeholder="din@epost.no"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Send tilbakestillingslenke</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={[styles.backButtonText, { color: colors.primary }]}>Tilbake til innlogging</Text>
              </TouchableOpacity>
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
    paddingHorizontal: 16,
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
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
