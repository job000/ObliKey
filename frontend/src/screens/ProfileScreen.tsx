import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModules } from '../contexts/ModuleContext';
import { api } from '../services/api';
import Container from '../components/Container';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, updateUser } = useAuth();
  const { colors } = useTheme();
  const { modules } = useModules();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? new Date(user.dateOfBirth) : new Date()
  );

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const response = await api.updateProfile(formData);
      if (response.success) {
        updateUser(response.data);
        Alert.alert('Suksess', 'Profil oppdatert');
        setEditing(false);
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke oppdatere profil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Feil', 'Passordene stemmer ikke overens');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      Alert.alert('Feil', 'Nytt passord må være minst 8 tegn');
      return;
    }

    try {
      setLoading(true);
      await api.updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      Alert.alert('Suksess', 'Passord oppdatert');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke oppdatere passord');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logg ut', 'Er du sikker på at du vil logge ut?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logg ut',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Superadministrator';
      case 'ADMIN':
        return 'Administrator';
      case 'TRAINER':
        return 'Trener';
      case 'CUSTOMER':
        return 'Kunde';
      default:
        return role;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Velg dato...';
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setFormData({ ...formData, dateOfBirth: selectedDate.toISOString().split('T')[0] });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.screenHeader, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <Container>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Min Profil</Text>
            {!editing && (
              <TouchableOpacity
                style={[styles.editButton, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
                <Text style={[styles.editButtonText, { color: colors.primary }]}>Rediger</Text>
              </TouchableOpacity>
            )}
            {editing && <View style={{ width: 80 }} />}
          </View>
        </Container>
      </View>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <Container>

          {/* User Info Card */}
          <View style={[styles.userCard, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={48} color={colors.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>{getRoleText(user?.role || '')}</Text>
              </View>
            </View>
          </View>

          {/* Profile Form */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personlig informasjon</Text>
            <View style={[styles.formCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Fornavn</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: editing ? colors.cardBg : colors.background, borderColor: colors.border, color: colors.text },
                    !editing && { color: colors.textSecondary }
                  ]}
                  value={formData.firstName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, firstName: text })
                  }
                  editable={editing}
                  placeholder="Fornavn"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Etternavn</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: editing ? colors.cardBg : colors.background, borderColor: colors.border, color: colors.text },
                    !editing && { color: colors.textSecondary }
                  ]}
                  value={formData.lastName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, lastName: text })
                  }
                  editable={editing}
                  placeholder="Etternavn"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Telefon</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: editing ? colors.cardBg : colors.background, borderColor: colors.border, color: colors.text },
                    !editing && { color: colors.textSecondary }
                  ]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  editable={editing}
                  placeholder="Telefonnummer"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Fødselsdato</Text>
                {editing ? (
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
                      {formatDate(formData.dateOfBirth)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textSecondary }]}
                    value={formatDate(formData.dateOfBirth)}
                    editable={false}
                  />
                )}
              </View>

              {editing && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={() => {
                      setEditing(false);
                      setFormData({
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        phone: user?.phone || '',
                        dateOfBirth: user?.dateOfBirth || '',
                      });
                    }}
                    disabled={loading}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      { backgroundColor: colors.primary },
                      loading && { backgroundColor: colors.primary + '60' }
                    ]}
                    onPress={handleUpdateProfile}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Lagre</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Change Password */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Endre passord</Text>
            <View style={[styles.formCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Nåværende passord</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                  value={passwordData.currentPassword}
                  onChangeText={(text) =>
                    setPasswordData({ ...passwordData, currentPassword: text })
                  }
                  secureTextEntry
                  placeholder="Skriv inn nåværende passord"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Nytt passord</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                  value={passwordData.newPassword}
                  onChangeText={(text) =>
                    setPasswordData({ ...passwordData, newPassword: text })
                  }
                  secureTextEntry
                  placeholder="Minimum 8 tegn"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Bekreft nytt passord</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) =>
                    setPasswordData({ ...passwordData, confirmPassword: text })
                  }
                  secureTextEntry
                  placeholder="Gjenta nytt passord"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.updateButton,
                  { backgroundColor: colors.primary },
                  loading && { backgroundColor: colors.primary + '60' }
                ]}
                onPress={handleUpdatePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.updateButtonText}>Oppdater passord</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Handlinger</Text>
            <View style={[styles.actionsCard, { backgroundColor: colors.cardBg }]}>
              {modules.shop && (
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => navigation.navigate('PurchaseHistory')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="receipt-outline" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.text }]}>Kjøpshistorikk</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              )}

              {modules.classes && (
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => navigation.navigate('Classes', { filter: 'my' })}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.accentLight }]}>
                    <Ionicons name="calendar-outline" size={24} color={colors.accent} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.text }]}>Mine bookinger</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              )}

              {modules.pt && (
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => navigation.navigate('PTShop')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="fitness-outline" size={24} color={colors.warning} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.text }]}>PT-Timer</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              )}

              {modules.chat && (
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => navigation.navigate('Chat')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.accentLight }]}>
                    <Ionicons name="chatbubbles-outline" size={24} color={colors.accent} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.text }]}>Chat</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => navigation.navigate('Support')}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="help-circle-outline" size={24} color={colors.success} />
                </View>
                <Text style={[styles.actionText, { color: colors.text }]}>Support</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>

              {(user?.role === 'ADMIN' || user?.role === 'TRAINER') && (
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => navigation.navigate('Admin')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="settings-outline" size={24} color={colors.warning} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.text }]}>Administrasjon</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionItem, { borderBottomColor: colors.borderLight }]}
                onPress={handleLogout}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.danger + '20' }]}>
                  <Ionicons name="log-out-outline" size={24} color={colors.danger} />
                </View>
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  Logg ut
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={[styles.appInfoText, { color: colors.textLight }]}>Otico v1.0.0</Text>
            <Text style={[styles.appInfoText, { color: colors.textLight }]}>© 2025 Otico Tech</Text>
          </View>
        </Container>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  screenHeader: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  formCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 16,
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
  },
  inputDisabled: {
    // Colors applied inline based on editing state
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  dateButtonText: {
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    // Color applied inline
  },
  updateButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  actionsCard: {
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
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appInfoText: {
    fontSize: 12,
    marginBottom: 4,
  },
});
