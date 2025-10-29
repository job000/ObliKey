import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface TenantDetail {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  phone?: string;
  address?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    status: string;
    tier?: string;
    interval: string;
    price: number;
    currency: string;
    trialEndsAt?: string;
    currentPeriodEnd: string;
    nextBillingAt?: string;
  };
  features?: Array<{
    id: string;
    featureId: string;
    enabled: boolean;
    feature: {
      name: string;
      key: string;
      category: string;
    };
  }>;
  stats?: {
    totalUsers: number;
    totalClasses: number;
    totalBookings: number;
    monthlyRevenue: number;
  };
}

export default function TenantDetailScreen({ route, navigation }: any) {
  const { tenantId } = route.params;
  const { user } = useAuth();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editedTenant, setEditedTenant] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    active: true,
  });

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigation.navigate('Dashboard');
      return;
    }
    loadTenantDetails();
  }, [user, tenantId]);

  // Refresh users when returning from AddUserToTenantScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (tenant) {
        loadTenantDetails();
      }
    });
    return unsubscribe;
  }, [navigation, tenant]);

  const loadTenantDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tenantResponse, usersResponse] = await Promise.all([
        api.getTenantDetails(tenantId),
        api.getTenantUsers(tenantId),
      ]);
      setTenant(tenantResponse.data);
      setUsers(usersResponse.data || []);
      setEditedTenant({
        name: tenantResponse.data.name,
        email: tenantResponse.data.email,
        phone: tenantResponse.data.phone || '',
        address: tenantResponse.data.address || '',
        active: tenantResponse.data.active,
      });
    } catch (err: any) {
      console.error('Failed to load tenant details:', err);
      setError(err.response?.data?.message || 'Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateTenant(tenantId, editedTenant);
      Alert.alert('Suksess', 'Tenant oppdatert');
      setEditMode(false);
      loadTenantDetails();
    } catch (err: any) {
      Alert.alert('Feil', err.response?.data?.message || 'Kunne ikke oppdatere tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const newStatus = !tenant?.active;
      await api.setTenantStatus(tenantId, newStatus);
      Alert.alert('Suksess', `Tenant ${newStatus ? 'aktivert' : 'deaktivert'}`);
      loadTenantDetails();
    } catch (err: any) {
      Alert.alert('Feil', err.response?.data?.message || 'Kunne ikke endre status');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Slett Bruker',
      `Er du sikker på at du vil slette ${userName}? Denne handlingen kan ikke angres.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTenantUser(tenantId, userId);
              Alert.alert('Suksess', 'Bruker slettet');
              loadTenantDetails();
            } catch (err: any) {
              Alert.alert('Feil', err.response?.data?.error || 'Kunne ikke slette bruker');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number, currency: string = 'NOK') => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nb-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#10B981';
      case 'TRIAL':
        return '#3B82F6';
      case 'CANCELLED':
      case 'EXPIRED':
        return '#EF4444';
      case 'PAST_DUE':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      ACTIVE: 'Aktiv',
      TRIAL: 'Prøveperiode',
      CANCELLED: 'Kansellert',
      EXPIRED: 'Utløpt',
      PAST_DUE: 'Forfalt',
    };
    return labels[status] || status;
  };

  const getIntervalLabel = (interval: string) => {
    const labels: { [key: string]: string } = {
      WEEKLY: 'Ukentlig',
      MONTHLY: 'Månedlig',
      QUARTERLY: 'Kvartalsvis',
      YEARLY: 'Årlig',
      CUSTOM: 'Tilpasset',
    };
    return labels[interval] || interval;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { bg: '#EF444420', text: '#EF4444' };
      case 'CUSTOMER':
        return { bg: '#3B82F620', text: '#3B82F6' };
      default:
        return { bg: '#6B728020', text: '#6B7280' };
    }
  };

  const formatLastSeen = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return null;
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Aktiv nå';
    if (diffMins < 60) return `${diffMins} min siden`;
    if (diffHours < 24) return `${diffHours} timer siden`;
    if (diffDays === 1) return 'I går';
    if (diffDays < 7) return `${diffDays} dager siden`;
    return date.toLocaleDateString('nb-NO');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster tenant detaljer...</Text>
      </View>
    );
  }

  if (error || !tenant) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error || 'Tenant ikke funnet'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTenantDetails}>
          <Text style={styles.retryButtonText}>Prøv igjen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isWeb && styles.webContent]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.tenantName}>{tenant.name}</Text>
            <Text style={styles.subdomain}>{tenant.subdomain}.oblikey.no</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {editMode ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setEditMode(false);
                  setEditedTenant({
                    name: tenant.name,
                    email: tenant.email,
                    phone: tenant.phone || '',
                    address: tenant.address || '',
                    active: tenant.active,
                  });
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Lagre</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setEditMode(true)}
            >
              <Ionicons name="pencil" size={20} color="#3B82F6" />
              <Text style={styles.editButtonText}>Rediger</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Grid */}
      <View style={[styles.grid, isWeb && styles.webGrid]}>
        {/* Left Column */}
        <View style={[styles.column, isWeb && styles.leftColumn]}>
          {/* Basic Info Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Grunnleggende Informasjon</Text>

            {editMode ? (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Navn</Text>
                <TextInput
                  style={styles.input}
                  value={editedTenant.name}
                  onChangeText={(text) => setEditedTenant({ ...editedTenant, name: text })}
                  placeholder="Tenant navn"
                />

                <Text style={styles.label}>E-post</Text>
                <TextInput
                  style={styles.input}
                  value={editedTenant.email}
                  onChangeText={(text) => setEditedTenant({ ...editedTenant, email: text })}
                  placeholder="kontakt@bedrift.no"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Telefon</Text>
                <TextInput
                  style={styles.input}
                  value={editedTenant.phone}
                  onChangeText={(text) => setEditedTenant({ ...editedTenant, phone: text })}
                  placeholder="+47 123 45 678"
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Adresse</Text>
                <TextInput
                  style={styles.input}
                  value={editedTenant.address}
                  onChangeText={(text) => setEditedTenant({ ...editedTenant, address: text })}
                  placeholder="Gateadresse 123, 0123 Oslo"
                  multiline
                />

                <View style={styles.switchRow}>
                  <Text style={styles.label}>Aktiv</Text>
                  <Switch
                    value={editedTenant.active}
                    onValueChange={(value) => setEditedTenant({ ...editedTenant, active: value })}
                    trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                    thumbColor="#FFF"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.infoGroup}>
                <View style={styles.infoRow}>
                  <Ionicons name="mail" size={20} color="#6B7280" />
                  <Text style={styles.infoText}>{tenant.email}</Text>
                </View>
                {tenant.phone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={20} color="#6B7280" />
                    <Text style={styles.infoText}>{tenant.phone}</Text>
                  </View>
                )}
                {tenant.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={20} color="#6B7280" />
                    <Text style={styles.infoText}>{tenant.address}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={20} color="#6B7280" />
                  <Text style={styles.infoText}>Opprettet {formatDate(tenant.createdAt)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons
                    name={tenant.active ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={tenant.active ? '#10B981' : '#EF4444'}
                  />
                  <Text style={[styles.infoText, { color: tenant.active ? '#10B981' : '#EF4444' }]}>
                    {tenant.active ? 'Aktiv' : 'Inaktiv'}
                  </Text>
                </View>
              </View>
            )}

            {!editMode && (
              <TouchableOpacity
                style={[styles.toggleButton, !tenant.active && styles.activateButton]}
                onPress={handleToggleActive}
              >
                <Ionicons
                  name={tenant.active ? 'close-circle' : 'checkmark-circle'}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.toggleButtonText}>
                  {tenant.active ? 'Deaktiver Tenant' : 'Aktiver Tenant'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Statistics Card */}
          {tenant.stats && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Statistikk</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={24} color="#3B82F6" />
                  <Text style={styles.statValue}>{tenant.stats.totalUsers}</Text>
                  <Text style={styles.statLabel}>Brukere</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="calendar" size={24} color="#10B981" />
                  <Text style={styles.statValue}>{tenant.stats.totalClasses}</Text>
                  <Text style={styles.statLabel}>Klasser</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="checkbox" size={24} color="#8B5CF6" />
                  <Text style={styles.statValue}>{tenant.stats.totalBookings}</Text>
                  <Text style={styles.statLabel}>Bookinger</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="cash" size={24} color="#F59E0B" />
                  <Text style={styles.statValue}>
                    {formatCurrency(tenant.stats.monthlyRevenue)}
                  </Text>
                  <Text style={styles.statLabel}>Omsetning</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Right Column */}
        <View style={[styles.column, isWeb && styles.rightColumn]}>
          {/* Subscription Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Abonnement</Text>
              {tenant.subscription && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ManageSubscription', { tenantId: tenant.id })}
                >
                  <Text style={styles.linkText}>Administrer →</Text>
                </TouchableOpacity>
              )}
            </View>

            {tenant.subscription ? (
              <View style={styles.subscriptionInfo}>
                <View style={styles.subscriptionHeader}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(tenant.subscription.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(tenant.subscription.status) },
                      ]}
                    >
                      {getStatusLabel(tenant.subscription.status)}
                    </Text>
                  </View>
                  {tenant.subscription.tier && (
                    <Text style={styles.tierBadge}>{tenant.subscription.tier}</Text>
                  )}
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceAmount}>
                    {formatCurrency(tenant.subscription.price, tenant.subscription.currency)}
                  </Text>
                  <Text style={styles.priceInterval}>
                    / {getIntervalLabel(tenant.subscription.interval)}
                  </Text>
                </View>

                <View style={styles.subscriptionDetails}>
                  {tenant.subscription.trialEndsAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Prøveperiode utløper:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(tenant.subscription.trialEndsAt)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Neste fakturering:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(tenant.subscription.nextBillingAt || tenant.subscription.currentPeriodEnd)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noSubscription}>
                <Ionicons name="information-circle-outline" size={48} color="#D1D5DB" />
                <Text style={styles.noSubscriptionText}>Ingen abonnement</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => navigation.navigate('CreateSubscription', { tenantId: tenant.id })}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.createButtonText}>Opprett Abonnement</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Features Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Features</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ManageFeatures', {
                  tenantId: tenant.id,
                  tenantName: tenant.name
                })}
              >
                <Text style={styles.linkText}>Administrer →</Text>
              </TouchableOpacity>
            </View>

            {tenant.features && tenant.features.length > 0 ? (
              <View style={styles.featureList}>
                {tenant.features.map((tenantFeature) => (
                  <View key={tenantFeature.id} style={styles.featureItem}>
                    <View style={styles.featureInfo}>
                      <Ionicons
                        name={tenantFeature.enabled ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={tenantFeature.enabled ? '#10B981' : '#9CA3AF'}
                      />
                      <View>
                        <Text style={[
                          styles.featureName,
                          !tenantFeature.enabled && styles.featureNameDisabled
                        ]}>
                          {tenantFeature.feature.name}
                        </Text>
                        <Text style={styles.featureCategory}>
                          {tenantFeature.feature.category}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noFeatures}>
                <Text style={styles.noFeaturesText}>Ingen features aktivert</Text>
              </View>
            )}
          </View>

          {/* Users Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Brukere ({users.length})</Text>
              <TouchableOpacity
                style={styles.addUserButton}
                onPress={() => navigation.navigate('AddUserToTenantScreen', {
                  tenantId: tenant.id,
                  tenantName: tenant.name
                })}
              >
                <Ionicons name="add" size={18} color="#3B82F6" />
                <Text style={styles.linkText}>Legg til Bruker</Text>
              </TouchableOpacity>
            </View>

            {users.length > 0 ? (
              <View style={styles.usersList}>
                {users.map((user: any) => (
                  <View key={user.id} style={styles.userItem}>
                    <View style={styles.userInfo}>
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={20} color="#6B7280" />
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                      </View>
                    </View>
                    <View style={styles.userMetaContainer}>
                      <View style={styles.userMeta}>
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: getRoleBadgeColor(user.role).bg }
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleText,
                              { color: getRoleBadgeColor(user.role).text }
                            ]}
                          >
                            {user.role}
                          </Text>
                        </View>
                        {formatLastSeen(user.lastSeenAt) && (
                          <Text style={styles.lastSeen}>
                            {formatLastSeen(user.lastSeenAt)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.userActions}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => navigation.navigate('EditTenantUserScreen', {
                            tenantId: tenant.id,
                            tenantName: tenant.name,
                            userId: user.id,
                            userData: user
                          })}
                        >
                          <Ionicons name="pencil" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDeleteUser(user.id, user.name)}
                        >
                          <Ionicons name="trash" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noUsers}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.noUsersText}>Ingen brukere ennå</Text>
                <Text style={styles.noUsersSubtext}>
                  Legg til brukere for å gi dem tilgang til denne tenanten
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.cardTitle, styles.dangerTitle]}>Fareområde</Text>
        <Text style={styles.dangerText}>
          Permanent sletting av denne tenanten vil fjerne all tilhørende data. Denne handlingen kan ikke angres.
        </Text>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            Alert.alert(
              'Slett Tenant',
              `Er du sikker på at du vil slette ${tenant.name}? Denne handlingen kan ikke angres.`,
              [
                { text: 'Avbryt', style: 'cancel' },
                {
                  text: 'Slett',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.deleteTenant(tenantId);
                      Alert.alert('Suksess', 'Tenant slettet vellykket');
                      navigation.navigate('TenantManagement');
                    } catch (err: any) {
                      Alert.alert('Feil', err.response?.data?.error || 'Kunne ikke slette tenant');
                    }
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="trash" size={20} color="#EF4444" />
          <Text style={styles.dangerButtonText}>Slett Tenant Permanent</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  webContent: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tenantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subdomain: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  editButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    gap: 16,
  },
  webGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  column: {
    flex: 1,
    gap: 16,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  formGroup: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoGroup: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  activateButton: {
    backgroundColor: '#10B981',
  },
  toggleButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  subscriptionInfo: {
    gap: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  priceInterval: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  subscriptionDetails: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  noSubscription: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noSubscriptionText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  featureNameDisabled: {
    color: '#9CA3AF',
  },
  featureCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  noFeatures: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noFeaturesText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usersList: {
    gap: 12,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  userMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  lastSeen: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  noUsers: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noUsersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
  },
  noUsersSubtext: {
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 4,
    textAlign: 'center',
  },
  dangerCard: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    marginTop: 16,
  },
  dangerTitle: {
    color: '#EF4444',
  },
  dangerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  dangerButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
