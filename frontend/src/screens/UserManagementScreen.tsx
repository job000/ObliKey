import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { api, storage } from '../services/api';
import Container from '../components/Container';
import type { User } from '../types';

type UserRole = 'CUSTOMER' | 'TRAINER' | 'ADMIN' | 'SUPER_ADMIN';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

export default function UserManagementScreen({ navigation }: any) {
  const { user: currentUser } = useAuth();
  const { selectedTenant } = useTenant();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Tenant Transfer States
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedTargetTenantId, setSelectedTargetTenantId] = useState<string>('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [selectedTenant]); // Reload when tenant changes OR on first load

  const loadUsers = async () => {
    try {
      setLoading(true);

      // For SUPER_ADMIN without a selected tenant, just set empty users array
      if (isSuperAdmin && !selectedTenant) {
        setUsers([]);
        return;
      }

      // Fetch users - the X-Viewing-As-Tenant header is handled by AuthContext/TenantContext
      const response = await api.getUsers();
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const response = await api.activateUser(userId);
      if (response.success) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, active: true } : u)));
        Alert.alert('Suksess', 'Bruker aktivert');
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke aktivere bruker');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    Alert.alert(
      'Deaktiver bruker',
      'Er du sikker på at du vil deaktivere denne brukeren?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Deaktiver',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deactivateUser(userId);
              if (response.success) {
                setUsers(
                  users.map((u) => (u.id === userId ? { ...u, active: false } : u))
                );
                Alert.alert('Suksess', 'Bruker deaktivert');
              }
            } catch (error: any) {
              Alert.alert(
                'Feil',
                error.response?.data?.error || 'Kunne ikke deaktivere bruker'
              );
            }
          },
        },
      ]
    );
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const response = await api.updateUserRole(userId, newRole);
      if (response.success) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        setModalVisible(false);
        Alert.alert('Suksess', 'Brukerrolle oppdatert');
      }
    } catch (error: any) {
      Alert.alert(
        'Feil',
        error.response?.data?.error || 'Kunne ikke oppdatere rolle'
      );
    }
  };

  const handleDeleteUser = (userId: string) => {
    Alert.alert(
      'Slett bruker',
      'Er du sikker på at du vil slette denne brukeren? Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteUser(userId);
              setUsers(users.filter((u) => u.id !== userId));
              Alert.alert('Suksess', 'Bruker slettet');
            } catch (error: any) {
              Alert.alert(
                'Feil',
                error.response?.data?.error || 'Kunne ikke slette bruker'
              );
            }
          },
        },
      ]
    );
  };

  // Transfer user to another tenant (SUPER_ADMIN only)
  const openTransferModal = async (user: User) => {
    if (!isSuperAdmin) {
      Alert.alert('Ingen tilgang', 'Kun SUPER_ADMIN kan flytte brukere mellom organisasjoner');
      return;
    }

    setSelectedUser(user);
    setTransferModalVisible(true);

    // Load all tenants
    try {
      setLoadingTenants(true);
      const response = await api.getActiveTenants();
      if (response.success && response.data) {
        // Filter out current tenant
        const availableTenants = response.data.filter((t: Tenant) => t.id !== user.tenantId);
        setTenants(availableTenants);
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
      Alert.alert('Feil', 'Kunne ikke laste inn organisasjoner');
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleTransferUser = async () => {
    if (!selectedUser || !selectedTargetTenantId) {
      Alert.alert('Feil', 'Vennligst velg en organisasjon');
      return;
    }

    const targetTenant = tenants.find(t => t.id === selectedTargetTenantId);
    if (!targetTenant) return;

    Alert.alert(
      'Bekreft flytting',
      `Er du sikker på at du vil flytte ${selectedUser.firstName} ${selectedUser.lastName} til ${targetTenant.name}?\n\nAll brukerdata (bookings, medlemskap, bestillinger osv.) vil bli flyttet.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Flytt',
          style: 'destructive',
          onPress: async () => {
            try {
              setTransferring(true);
              const response = await api.transferUserToTenant(selectedUser.id, selectedTargetTenantId);

              if (response.success) {
                const transferredData = response.data?.transfer?.dataTransferred || {};
                const dataCount = Object.values(transferredData).reduce((sum: number, val: any) => sum + (val || 0), 0);

                Alert.alert(
                  'Suksess!',
                  `${selectedUser.firstName} ${selectedUser.lastName} ble flyttet til ${targetTenant.name}.\n\n` +
                  `Overført data:\n` +
                  `• Bookings: ${transferredData.bookings || 0}\n` +
                  `• PT-økter: ${(transferredData.ptSessionsAsCustomer || 0) + (transferredData.ptSessionsAsTrainer || 0)}\n` +
                  `• Medlemskap: ${transferredData.memberships || 0}\n` +
                  `• Bestillinger: ${transferredData.orders || 0}\n` +
                  `• Totalt: ${dataCount} records`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        setTransferModalVisible(false);
                        setSelectedUser(null);
                        setSelectedTargetTenantId('');
                        loadUsers(); // Reload user list
                      }
                    }
                  ]
                );
              }
            } catch (error: any) {
              Alert.alert(
                'Feil',
                error.response?.data?.error || 'Kunne ikke flytte bruker'
              );
            } finally {
              setTransferring(false);
            }
          },
        },
      ]
    );
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Superadmin';
      case 'ADMIN':
        return 'Admin';
      case 'TRAINER':
        return 'Trener';
      case 'CUSTOMER':
        return 'Kunde';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '#EF4444';
      case 'ADMIN':
        return '#F59E0B';
      case 'TRAINER':
        return '#8B5CF6';
      case 'CUSTOMER':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getFilteredUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter((user) => user.role === filterRole);
    }

    return filtered;
  };

  const getUserStats = () => {
    const total = users.length;
    const active = users.filter((u) => u.active).length;
    const customers = users.filter((u) => u.role === 'CUSTOMER').length;
    const trainers = users.filter((u) => u.role === 'TRAINER').length;

    return { total, active, customers, trainers };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const filteredUsers = getFilteredUsers();
  const stats = getUserStats();

  const handleCreateUser = () => {
    const tenantId = isSuperAdmin && selectedTenant
      ? selectedTenant.id
      : currentUser?.tenantId || '';
    const tenantName = isSuperAdmin && selectedTenant
      ? selectedTenant.name
      : 'din organisasjon';

    navigation.navigate('AddUserToTenantScreen', { tenantId, tenantName });
  };

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Brukere</Text>
            <Text style={styles.subtitle}>Administrer brukere og roller</Text>
          </View>
          {!isSuperAdmin || (isSuperAdmin && selectedTenant) ? (
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateUser}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Opprett</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container>

        {/* Viewing Tenant Banner for SUPER_ADMIN */}
        {isSuperAdmin && selectedTenant && (
          <View style={styles.viewingTenantBanner}>
            <Ionicons name="business" size={20} color="#3B82F6" />
            <View style={{flex: 1}}>
              <Text style={styles.viewingTenantLabel}>Viser brukere for:</Text>
              <Text style={styles.viewingTenantName}>{selectedTenant.name}</Text>
            </View>
          </View>
        )}

        {/* No Tenant Selected for SUPER_ADMIN */}
        {isSuperAdmin && !selectedTenant && (
          <View style={styles.infoMessage}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoMessageText}>
              Velg en tenant i Super Admin Portal for å administrere brukere
            </Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="people-outline" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Totalt</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Aktive</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="person-outline" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.customers}</Text>
            <Text style={styles.statLabel}>Kunder</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="barbell-outline" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{stats.trainers}</Text>
            <Text style={styles.statLabel}>Trenere</Text>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Søk etter brukere..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['all', 'CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'].map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.filterButton,
                  filterRole === role && styles.filterButtonActive,
                ]}
                onPress={() => setFilterRole(role)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterRole === role && styles.filterButtonTextActive,
                  ]}
                >
                  {role === 'all' ? 'Alle' : getRoleText(role)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Users List */}
        <View style={styles.usersList}>
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Ingen brukere funnet</Text>
            </View>
          ) : (
            filteredUsers.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {user.firstName} {user.lastName}
                    </Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={styles.userMeta}>
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: getRoleColor(user.role) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleText,
                            { color: getRoleColor(user.role) },
                          ]}
                        >
                          {getRoleText(user.role)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: user.active
                              ? '#D1FAE5'
                              : '#FEE2E2',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: user.active ? '#10B981' : '#EF4444' },
                          ]}
                        >
                          {user.active ? 'Aktiv' : 'Inaktiv'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Only show action buttons if user is not SUPER_ADMIN, or if current user is also SUPER_ADMIN */}
                {(user.role !== 'SUPER_ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButtonPrimary}
                      onPress={() => {
                        setSelectedUser(user);
                        setModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionButtonIcon}>
                        <Ionicons name="shield-checkmark" size={16} color="#8B5CF6" />
                      </View>
                      <Text style={styles.actionButtonPrimaryText}>Rolle</Text>
                    </TouchableOpacity>

                    {user.active ? (
                      <TouchableOpacity
                        style={styles.actionButtonWarning}
                        onPress={() => handleDeactivateUser(user.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.actionButtonIcon}>
                          <Ionicons name="pause-circle" size={16} color="#F59E0B" />
                        </View>
                        <Text style={styles.actionButtonWarningText}>Deaktiver</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.actionButtonSuccess}
                        onPress={() => handleActivateUser(user.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.actionButtonIcon}>
                          <Ionicons name="play-circle" size={16} color="#10B981" />
                        </View>
                        <Text style={styles.actionButtonSuccessText}>Aktiver</Text>
                      </TouchableOpacity>
                    )}

                    {/* Transfer button - only for SUPER_ADMIN */}
                    {isSuperAdmin && user.role !== 'SUPER_ADMIN' && (
                      <TouchableOpacity
                        style={styles.actionButtonInfo}
                        onPress={() => openTransferModal(user)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.actionButtonIcon}>
                          <Ionicons name="swap-horizontal" size={16} color="#06B6D4" />
                        </View>
                        <Text style={styles.actionButtonInfoText}>Flytt</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.actionButtonDanger}
                      onPress={() => handleDeleteUser(user.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionButtonIcon}>
                        <Ionicons name="trash" size={16} color="#EF4444" />
                      </View>
                      <Text style={styles.actionButtonDangerText}>Slett</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
        </Container>
      </ScrollView>

      {/* Role Change Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Endre rolle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Endre rolle for {selectedUser?.firstName} {selectedUser?.lastName}
              </Text>

              <View style={styles.roleOptions}>
                {(currentUser?.role === 'SUPER_ADMIN'
                  ? ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN']
                  : ['CUSTOMER', 'TRAINER', 'ADMIN']
                ).map((role: UserRole) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        { borderColor: getRoleColor(role) },
                      ]}
                      onPress={() =>
                        selectedUser && handleUpdateRole(selectedUser.id, role)
                      }
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          { color: getRoleColor(role) },
                        ]}
                      >
                        {getRoleText(role)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transfer User Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={transferModalVisible}
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Flytt bruker til annen organisasjon</Text>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedUser && (
                <>
                  <Text style={styles.modalText}>
                    Flytt {selectedUser.firstName} {selectedUser.lastName} til en annen organisasjon.
                  </Text>
                  <Text style={styles.modalSubtext}>
                    All brukerdata (bookings, medlemskap, bestillinger, PT-økter osv.) vil bli flyttet med.
                  </Text>

                  <Text style={styles.modalLabel}>Velg organisasjon:</Text>

                  {loadingTenants ? (
                    <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} />
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedTargetTenantId}
                        onValueChange={(itemValue) => setSelectedTargetTenantId(itemValue)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Velg organisasjon..." value="" />
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

                  <TouchableOpacity
                    style={[
                      styles.transferButton,
                      (!selectedTargetTenantId || transferring) && styles.transferButtonDisabled
                    ]}
                    onPress={handleTransferUser}
                    disabled={!selectedTargetTenantId || transferring}
                  >
                    {transferring ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="swap-horizontal" size={20} color="#FFF" />
                        <Text style={styles.transferButtonText}>Flytt bruker</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  fixedHeader: {
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  titleContainer: {
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? '23%' : '47%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  usersList: {
    gap: 12,
    paddingBottom: 24,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  actionButtonSuccess: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  actionButtonWarning: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  actionButtonDanger: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  actionButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonPrimaryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
    textAlign: 'center',
  },
  actionButtonSuccessText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
  },
  actionButtonWarningText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    textAlign: 'center',
  },
  actionButtonDangerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
  },
  actionButtonInfo: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#ECFEFF',
    borderWidth: 1.5,
    borderColor: '#A5F3FC',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  actionButtonInfoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0891B2',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 20,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#FFF',
  },
  picker: {
    height: 50,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#06B6D4',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  transferButtonDisabled: {
    backgroundColor: '#A5F3FC',
  },
  transferButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  roleOptions: {
    gap: 12,
  },
  roleOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
  },
  viewingTenantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  viewingTenantLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  viewingTenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
