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
import { api } from '../services/api';
import Container from '../components/Container';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, updateUser } = useAuth();
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenHeader}>
        <Container>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Min Profil</Text>
            {!editing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="create-outline" size={20} color="#3B82F6" />
                <Text style={styles.editButtonText}>Rediger</Text>
              </TouchableOpacity>
            )}
            {editing && <View style={{ width: 80 }} />}
          </View>
        </Container>
      </View>
      <ScrollView style={styles.container}>
        <Container>

          {/* User Info Card */}
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#3B82F6" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{getRoleText(user?.role || '')}</Text>
              </View>
            </View>
          </View>

          {/* Profile Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personlig informasjon</Text>
            <View style={styles.formCard}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Fornavn</Text>
                <TextInput
                  style={[styles.input, !editing && styles.inputDisabled]}
                  value={formData.firstName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, firstName: text })
                  }
                  editable={editing}
                  placeholder="Fornavn"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Etternavn</Text>
                <TextInput
                  style={[styles.input, !editing && styles.inputDisabled]}
                  value={formData.lastName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, lastName: text })
                  }
                  editable={editing}
                  placeholder="Etternavn"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Telefon</Text>
                <TextInput
                  style={[styles.input, !editing && styles.inputDisabled]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  editable={editing}
                  placeholder="Telefonnummer"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Fødselsdato</Text>
                {editing ? (
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                    <Text style={styles.dateButtonText}>
                      {formatDate(formData.dateOfBirth)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formatDate(formData.dateOfBirth)}
                    editable={false}
                  />
                )}
              </View>

              {editing && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
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
                    <Text style={styles.cancelButtonText}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, loading && styles.buttonDisabled]}
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
            <Text style={styles.sectionTitle}>Endre passord</Text>
            <View style={styles.formCard}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nåværende passord</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.currentPassword}
                  onChangeText={(text) =>
                    setPasswordData({ ...passwordData, currentPassword: text })
                  }
                  secureTextEntry
                  placeholder="Skriv inn nåværende passord"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nytt passord</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.newPassword}
                  onChangeText={(text) =>
                    setPasswordData({ ...passwordData, newPassword: text })
                  }
                  secureTextEntry
                  placeholder="Minimum 8 tegn"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Bekreft nytt passord</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) =>
                    setPasswordData({ ...passwordData, confirmPassword: text })
                  }
                  secureTextEntry
                  placeholder="Gjenta nytt passord"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.updateButton, loading && styles.buttonDisabled]}
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
            <Text style={styles.sectionTitle}>Handlinger</Text>
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigation.navigate('PurchaseHistory')}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="receipt-outline" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.actionText}>Kjøpshistorikk</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigation.navigate('Classes', { filter: 'my' })}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="calendar-outline" size={24} color="#EC4899" />
                </View>
                <Text style={styles.actionText}>Mine bookinger</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigation.navigate('Chat')}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="chatbubbles-outline" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.actionText}>Chat</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigation.navigate('Support')}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="help-circle-outline" size={24} color="#10B981" />
                </View>
                <Text style={styles.actionText}>Support</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {(user?.role === 'ADMIN' || user?.role === 'TRAINER') && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => navigation.navigate('Admin')}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="settings-outline" size={24} color="#F59E0B" />
                  </View>
                  <Text style={styles.actionText}>Administrasjon</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
                <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                </View>
                <Text style={[styles.actionText, { color: '#EF4444' }]}>
                  Logg ut
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>ObliKey v1.0.0</Text>
            <Text style={styles.appInfoText}>© 2025 Boost System</Text>
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
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  screenHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#111827',
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
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
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
    backgroundColor: '#EFF6FF',
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
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
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
  formCard: {
    backgroundColor: '#FFF',
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
    color: '#374151',
    marginBottom: 8,
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
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
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
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
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
    backgroundColor: '#93C5FD',
  },
  updateButton: {
    backgroundColor: '#3B82F6',
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
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
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
});
