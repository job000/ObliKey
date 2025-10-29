import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';
import { Membership, MembershipStats } from '../types/membership';

const MembershipManagementScreen = ({ navigation }: any) => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  // Create membership modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [createNewUser, setCreateNewUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('[MembershipManagement] Fetching data with filter:', filter);

      const [membershipsData, statsData] = await Promise.all([
        api.getMemberships({ status: filter !== 'all' ? filter : undefined }),
        api.getMembershipStats()
      ]);

      console.log('[MembershipManagement] Memberships response:', membershipsData);
      console.log('[MembershipManagement] Stats response:', statsData);

      setMemberships(membershipsData.data || []);
      setStats(statsData.data);
    } catch (error: any) {
      console.error('[MembershipManagement] Error fetching data:', error);
      console.error('[MembershipManagement] Error response:', error.response);
      Alert.alert('Feil', error.response?.data?.message || error.message || 'Kunne ikke hente data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#10B981';
      case 'FROZEN': return '#3B82F6';
      case 'CANCELLED': return '#6B7280';
      case 'SUSPENDED': return '#F59E0B';
      case 'BLACKLISTED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Aktiv',
      FROZEN: 'Fryst',
      CANCELLED: 'Kansellert',
      SUSPENDED: 'Suspendert',
      BLACKLISTED: 'Svartelistet'
    };
    return labels[status] || status;
  };

  const getFilterIcon = (status: string) => {
    const icons: Record<string, any> = {
      all: 'grid',
      ACTIVE: 'checkmark-circle',
      FROZEN: 'snow',
      CANCELLED: 'close-circle',
      SUSPENDED: 'pause-circle',
      BLACKLISTED: 'ban'
    };
    return icons[status] || 'ellipse';
  };

  const getFilterLabel = (status: string) => {
    const labels: Record<string, string> = {
      all: 'Alle',
      ACTIVE: 'Aktiv',
      FROZEN: 'Fryst',
      CANCELLED: 'Avsl',
      SUSPENDED: 'Pause',
      BLACKLISTED: 'Block'
    };
    return labels[status] || status;
  };

  const handleAction = (membership: Membership, action: string) => {
    setSelectedMembership(membership);
    performAction(membership, action);
  };

  const performAction = async (membership: Membership, action: string) => {
    try {
      let message = '';
      switch (action) {
        case 'suspend':
          await api.suspendMembership(membership.id, 'Suspendert av admin');
          message = 'Medlemskap suspendert';
          break;
        case 'reactivate':
          await api.reactivateMembership(membership.id);
          message = 'Medlemskap reaktivert';
          break;
        case 'blacklist':
          await api.blacklistMembership(membership.id, 'Svartelistet av admin');
          message = 'Medlem svartelistet';
          break;
        case 'unfreeze':
          await api.unfreezeMembership(membership.id);
          message = 'Medlemskap ufryst';
          break;
      }
      Alert.alert('Suksess', message);
      fetchData();
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke utføre handling');
    }
  };

  const openCreateModal = async () => {
    try {
      console.log('[MembershipManagement] Fetching plans and users...');
      // Fetch membership plans and users
      const [plansResponse, usersResponse] = await Promise.all([
        api.getMembershipPlans(true),
        api.getUsers()
      ]);

      console.log('[MembershipManagement] Plans response:', plansResponse);
      console.log('[MembershipManagement] Users response:', usersResponse);
      console.log('[MembershipManagement] Plans data:', plansResponse.data);
      console.log('[MembershipManagement] Plans count:', plansResponse.data?.length || 0);

      setMembershipPlans(plansResponse.data || []);
      setUsers(usersResponse.data || []);
      setCreateModalVisible(true);
    } catch (error: any) {
      console.error('[MembershipManagement] Error loading data:', error);
      console.error('[MembershipManagement] Error details:', error.response?.data);
      Alert.alert('Feil', 'Kunne ikke laste data');
    }
  };

  const resetCreateModal = () => {
    setSelectedUser(null);
    setSelectedPlan(null);
    setStartDate(new Date());
    setShowDatePicker(false);
    setUserSearchQuery('');
    setCreateNewUser(false);
    setNewUserData({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
    });
  };

  const handleCreateMembership = async () => {
    try {
      let userId = selectedUser?.id;

      // If creating a new user, register them first
      if (createNewUser) {
        if (!newUserData.email || !newUserData.firstName || !newUserData.lastName || !newUserData.password) {
          Alert.alert('Feil', 'Vennligst fyll ut alle påkrevde felt');
          return;
        }

        const registerResponse = await api.register({
          ...newUserData,
          tenantId: '', // This will be set by backend from token
        });

        if (!registerResponse.success) {
          Alert.alert('Feil', 'Kunne ikke opprette bruker');
          return;
        }

        userId = registerResponse.data.user.id;
      } else if (!selectedUser) {
        Alert.alert('Feil', 'Vennligst velg en bruker');
        return;
      }

      if (!selectedPlan) {
        Alert.alert('Feil', 'Vennligst velg en medlemskapsplan');
        return;
      }

      // Create membership
      const response = await api.createMembership({
        userId,
        planId: selectedPlan.id,
        startDate: startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      });

      if (response.success) {
        Alert.alert('Suksess', 'Medlemskap opprettet');
        setCreateModalVisible(false);
        resetCreateModal();
        fetchData();
      }
    } catch (error: any) {
      console.error('Error creating membership:', error);
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke opprette medlemskap');
    }
  };

  const getFilteredUsers = () => {
    if (!userSearchQuery) return users;
    return users.filter((u: any) =>
      u.firstName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  };

  const filterMemberships = () => {
    if (!searchQuery) return memberships;
    return memberships.filter(m =>
      m.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredMemberships = filterMemberships();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medlemsoversikt</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeMembers}</Text>
            <Text style={styles.statLabel}>Aktive</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.frozenMembers}</Text>
            <Text style={styles.statLabel}>Fryste</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.overduePayments}</Text>
            <Text style={styles.statLabel}>Forfalt</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.recentCheckIns}</Text>
            <Text style={styles.statLabel}>Inn i dag</Text>
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Søk etter medlemmer..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal style={styles.filterContainer} showsHorizontalScrollIndicator={false}>
        {['all', 'ACTIVE', 'FROZEN', 'SUSPENDED', 'CANCELLED', 'BLACKLISTED'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Ionicons
              name={getFilterIcon(f)}
              size={16}
              color={filter === f ? '#fff' : '#6B7280'}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredMemberships.map(membership => (
          <TouchableOpacity
            key={membership.id}
            style={styles.memberCard}
            onPress={() => navigation.navigate('MembershipDetail', { membershipId: membership.id })}
          >
            <View style={styles.memberHeader}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {membership.user?.firstName} {membership.user?.lastName}
                </Text>
                <Text style={styles.memberEmail}>{membership.user?.email}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(membership.status) }]}>
                <Text style={styles.statusBadgeText}>{getStatusLabel(membership.status)}</Text>
              </View>
            </View>

            <View style={styles.memberDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="card" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{membership.plan?.name || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  Medlem siden {new Date(membership.startDate).toLocaleDateString('no-NO')}
                </Text>
              </View>
              {membership.lastCheckInAt && (
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    Sist inne {new Date(membership.lastCheckInAt).toLocaleDateString('no-NO')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionsContainer}>
              {membership.status === 'ACTIVE' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.suspendButton]}
                  onPress={() => handleAction(membership, 'suspend')}
                >
                  <Text style={styles.actionButtonText}>Suspender</Text>
                </TouchableOpacity>
              )}
              {membership.status === 'FROZEN' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reactivateButton]}
                  onPress={() => handleAction(membership, 'unfreeze')}
                >
                  <Text style={styles.actionButtonText}>Ufrys</Text>
                </TouchableOpacity>
              )}
              {(membership.status === 'SUSPENDED' || membership.status === 'CANCELLED') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reactivateButton]}
                  onPress={() => handleAction(membership, 'reactivate')}
                >
                  <Text style={styles.actionButtonText}>Reaktiver</Text>
                </TouchableOpacity>
              )}
              {membership.status !== 'BLACKLISTED' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.blacklistButton]}
                  onPress={() => handleAction(membership, 'blacklist')}
                >
                  <Text style={styles.actionButtonText}>Svarteliste</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {filteredMemberships.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Ingen medlemmer funnet</Text>
          </View>
        )}
      </ScrollView>

      {/* Create Membership Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => {
          setCreateModalVisible(false);
          resetCreateModal();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Opprett medlemskap</Text>
              <TouchableOpacity onPress={() => {
                setCreateModalVisible(false);
                resetCreateModal();
              }}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {/* Toggle between existing user and new user */}
                <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, !createNewUser && styles.toggleButtonActive]}
                  onPress={() => setCreateNewUser(false)}
                >
                  <Text style={[styles.toggleButtonText, !createNewUser && styles.toggleButtonTextActive]}>
                    Velg eksisterende bruker
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, createNewUser && styles.toggleButtonActive]}
                  onPress={() => setCreateNewUser(true)}
                >
                  <Text style={[styles.toggleButtonText, createNewUser && styles.toggleButtonTextActive]}>
                    Opprett ny bruker
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Existing user selection */}
              {!createNewUser ? (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Søk etter bruker *</Text>
                    <View style={styles.searchBox}>
                      <Ionicons name="search" size={20} color="#9CA3AF" />
                      <TextInput
                        style={styles.searchInput}
                        value={userSearchQuery}
                        onChangeText={setUserSearchQuery}
                        placeholder="Søk navn eller e-post..."
                      />
                    </View>
                  </View>

                  {userSearchQuery.length > 0 && (
                    <View style={styles.userListContainer}>
                      <ScrollView style={styles.userList} nestedScrollEnabled>
                        {getFilteredUsers().map((user: any) => (
                          <TouchableOpacity
                            key={user.id}
                            style={[
                              styles.userItem,
                              selectedUser?.id === user.id && styles.userItemSelected
                            ]}
                            onPress={() => setSelectedUser(user)}
                          >
                            <View style={styles.userItemAvatar}>
                              <Text style={styles.userItemAvatarText}>
                                {user.firstName[0]}{user.lastName[0]}
                              </Text>
                            </View>
                            <View style={styles.userItemInfo}>
                              <Text style={styles.userItemName}>
                                {user.firstName} {user.lastName}
                              </Text>
                              <Text style={styles.userItemEmail}>{user.email}</Text>
                            </View>
                            {selectedUser?.id === user.id && (
                              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            )}
                          </TouchableOpacity>
                        ))}
                        {getFilteredUsers().length === 0 && (
                          <Text style={styles.noResultsText}>Ingen brukere funnet</Text>
                        )}
                      </ScrollView>
                    </View>
                  )}

                  {selectedUser && (
                    <View style={styles.selectedUserCard}>
                      <Text style={styles.selectedUserLabel}>Valgt bruker:</Text>
                      <View style={styles.selectedUserInfo}>
                        <Text style={styles.selectedUserName}>
                          {selectedUser.firstName} {selectedUser.lastName}
                        </Text>
                        <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                /* New user form */
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Fornavn *</Text>
                    <TextInput
                      style={styles.input}
                      value={newUserData.firstName}
                      onChangeText={(text) => setNewUserData({ ...newUserData, firstName: text })}
                      placeholder="Fornavn"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Etternavn *</Text>
                    <TextInput
                      style={styles.input}
                      value={newUserData.lastName}
                      onChangeText={(text) => setNewUserData({ ...newUserData, lastName: text })}
                      placeholder="Etternavn"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>E-post *</Text>
                    <TextInput
                      style={styles.input}
                      value={newUserData.email}
                      onChangeText={(text) => setNewUserData({ ...newUserData, email: text })}
                      placeholder="bruker@eksempel.no"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Telefon</Text>
                    <TextInput
                      style={styles.input}
                      value={newUserData.phone}
                      onChangeText={(text) => setNewUserData({ ...newUserData, phone: text })}
                      placeholder="+47 123 45 678"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Passord *</Text>
                    <TextInput
                      style={styles.input}
                      value={newUserData.password}
                      onChangeText={(text) => setNewUserData({ ...newUserData, password: text })}
                      placeholder="Minimum 8 tegn"
                      secureTextEntry
                    />
                  </View>
                </>
              )}

              {/* Membership plan selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Velg medlemskapsplan *</Text>
                <View style={styles.plansList}>
                  {membershipPlans.map((plan: any) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        selectedPlan?.id === plan.id && styles.planCardSelected
                      ]}
                      onPress={() => setSelectedPlan(plan)}
                    >
                      <View style={styles.planCardHeader}>
                        <Text style={styles.planCardName}>{plan.name}</Text>
                        {selectedPlan?.id === plan.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        )}
                      </View>
                      <Text style={styles.planCardDescription} numberOfLines={2}>
                        {plan.description}
                      </Text>
                      <View style={styles.planCardFooter}>
                        <Text style={styles.planCardPrice}>
                          {plan.price.toLocaleString('nb-NO')} kr
                        </Text>
                        <Text style={styles.planCardInterval}>
                          / {plan.interval === 'MONTHLY' ? 'måned' : 'år'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {membershipPlans.length === 0 && (
                    <Text style={styles.noPlansText}>
                      Ingen aktive medlemskapsplaner tilgjengelig
                    </Text>
                  )}
                </View>
              </View>

              {/* Start date */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Startdato *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {startDate.toLocaleDateString('no-NO')}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setStartDate(selectedDate);
                      }
                    }}
                  />
                )}
              </View>

              {/* Create button */}
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!selectedPlan || (!selectedUser && !createNewUser)) && styles.createButtonDisabled
                ]}
                onPress={handleCreateMembership}
                disabled={!selectedPlan || (!selectedUser && !createNewUser)}
              >
                <Text style={styles.createButtonText}>Opprett medlemskap</Text>
              </TouchableOpacity>
              </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  memberDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  suspendButton: {
    backgroundColor: '#FEF3C7',
  },
  reactivateButton: {
    backgroundColor: '#D1FAE5',
  },
  blacklistButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  toggleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#FFF',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userListContainer: {
    marginBottom: 16,
  },
  userList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  userItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userItemAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userItemInfo: {
    flex: 1,
  },
  userItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userItemEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  noResultsText: {
    padding: 20,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
  selectedUserCard: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 16,
  },
  selectedUserLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  selectedUserInfo: {
    marginTop: 4,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  selectedUserEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
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
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  plansList: {
    gap: 12,
  },
  planCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  planCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  planCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  planCardFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planCardPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  planCardInterval: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  noPlansText: {
    padding: 20,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default MembershipManagementScreen;
