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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';
import type { User } from '../types';

type UserRole = 'CUSTOMER' | 'TRAINER' | 'ADMIN' | 'SUPER_ADMIN';

export default function UserManagementScreen({ navigation }: any) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Container>
        <View style={styles.header}>
          <Text style={styles.title}>Brukeradministrasjon</Text>
          <Text style={styles.subtitle}>Administrer brukere og roller</Text>
        </View>

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

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.roleButton}
                    onPress={() => {
                      setSelectedUser(user);
                      setModalVisible(true);
                    }}
                  >
                    <Ionicons name="shield-outline" size={18} color="#8B5CF6" />
                    <Text style={styles.roleButtonText}>Endre rolle</Text>
                  </TouchableOpacity>

                  {user.active ? (
                    <TouchableOpacity
                      style={styles.deactivateButton}
                      onPress={() => handleDeactivateUser(user.id)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#F59E0B" />
                      <Text style={styles.deactivateButtonText}>Deaktiver</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.activateButton}
                      onPress={() => handleActivateUser(user.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                      <Text style={styles.activateButtonText}>Aktiver</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteUser(user.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </Container>

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
                {(['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).map(
                  (role) => (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
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
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  activateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  activateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  deactivateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  deactivateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
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
});
