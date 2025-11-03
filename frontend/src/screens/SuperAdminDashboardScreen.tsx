import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import { Tenant } from '../types';

const isWeb = Platform.OS === 'web';

interface TenantWithStats extends Tenant {
  subscription?: {
    status: string;
    tier?: string;
    price: number;
    currency: string;
  };
  userCount?: number;
  createdAt?: string;
}

export default function SuperAdminDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { selectedTenant, setSelectedTenant } = useTenant();
  const { colors, isDark } = useTheme();
  const [allTenants, setAllTenants] = useState<TenantWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const searchInputRef = React.useRef<TextInput>(null);

  // Function to dismiss keyboard and blur search input
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
  };

  // Filter tenants locally based on search query and status filter
  const filteredTenants = React.useMemo(() => {
    let result = allTenants;

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => t.active === (statusFilter === 'active'));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.subdomain.toLowerCase().includes(query) ||
        t.email?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allTenants, searchQuery, statusFilter]);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigation.navigate('Dashboard');
      return;
    }
    loadTenants();
  }, [user]);

  const loadTenants = async (forceLoading = false) => {
    try {
      // Only show loading spinner if we have no data yet or force loading
      if (allTenants.length === 0 || forceLoading) {
        setLoading(true);
      }
      setError(null);

      const params: any = {
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      console.log('[SuperAdminDashboard] Fetching tenants...');
      const response = await api.getAllTenants(params);
      console.log('[SuperAdminDashboard] Response:', response);

      // Handle different response structures
      const tenantsArray = response.data || response.tenants || response || [];
      console.log('[SuperAdminDashboard] Tenants array:', tenantsArray);

      if (!Array.isArray(tenantsArray)) {
        console.error('[SuperAdminDashboard] Response is not an array:', tenantsArray);
        setError('Invalid response format from server');
        return;
      }

      // Fetch user count for each tenant
      const tenantsWithStats = await Promise.all(
        tenantsArray.map(async (tenant: any) => {
          try {
            const usersResponse = await api.getTenantUsers(tenant.id);
            return {
              ...tenant,
              userCount: usersResponse.data?.length || 0,
            };
          } catch (err: any) {
            // Silently fail for 403 errors (deactivated tenants)
            if (err?.response?.status === 403) {
              console.log(`[SuperAdminDashboard] Access denied for tenant ${tenant.id} users`);
            }
            return {
              ...tenant,
              userCount: 0,
            };
          }
        })
      );

      console.log('[SuperAdminDashboard] Tenants with stats:', tenantsWithStats.length);
      setAllTenants(tenantsWithStats);
    } catch (err: any) {
      console.error('[SuperAdminDashboard] Failed to load tenants:', err);
      console.error('[SuperAdminDashboard] Error response:', err.response);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTenants();
  };

  const handleTenantSelect = async (tenant: TenantWithStats) => {
    await setSelectedTenant(tenant);
    // Optionally navigate to a different screen or show a success message
  };

  const handleExitTenantView = async () => {
    await setSelectedTenant(null);
  };

  const handleToggleStatus = async (tenant: TenantWithStats) => {
    const action = tenant.active ? 'deaktivere' : 'aktivere';
    const actionCaps = tenant.active ? 'Deaktivere' : 'Aktivere';

    Alert.alert(
      `${actionCaps} Tenant`,
      `Er du sikker på at du vil ${action} "${tenant.name}"?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: actionCaps,
          style: tenant.active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.setTenantStatus(tenant.id, !tenant.active);
              // Reload tenants to reflect the change
              await loadTenants();
            } catch (err: any) {
              Alert.alert(
                'Feil',
                err.response?.data?.message || `Kunne ikke ${action} tenant`
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteTenant = async (tenant: TenantWithStats) => {
    Alert.alert(
      'Slett Tenant',
      `Er du sikker på at du vil slette "${tenant.name}"?\n\nDette vil permanent slette alle data knyttet til denne tenant, inkludert brukere, produkter, og innstillinger.\n\nDenne handlingen kan IKKE angres!`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTenant(tenant.id);
              // If deleted tenant was selected, clear selection
              if (selectedTenant?.id === tenant.id) {
                await setSelectedTenant(null);
              }
              // Reload tenants to reflect the change
              await loadTenants();
            } catch (err: any) {
              Alert.alert(
                'Feil',
                err.response?.data?.message || 'Kunne ikke slette tenant'
              );
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing && allTenants.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading tenants...</Text>
      </View>
    );
  }

  const renderEmpty = () => {
    if (error) return null;

    return (
      <View style={styles.emptyState}>
        <Ionicons name="business-outline" size={64} color={colors.textLight} />
        <Text style={[styles.emptyStateText, { color: colors.text }]}>No tenants found</Text>
        <Text style={[styles.emptyStateSubtext, { color: colors.textLight }]}>
          {searchQuery.trim()
            ? 'Try adjusting your search criteria'
            : 'No tenants available to browse'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header - Fast, re-rendrer ikke */}
      <View style={[styles.header, isWeb && styles.headerWeb]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Tenant Browser</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Browse and select tenants to manage their environment</Text>
        </View>
        <TouchableOpacity
          style={[styles.createTenantButton, {
            backgroundColor: colors.success,
            shadowColor: colors.shadow,
            shadowOpacity: isDark ? 0.2 : 0.1
          }]}
          onPress={() => navigation.navigate('CreateTenant')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.createTenantButtonText}>Opprett Ny Tenant</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Tenant Banner */}
      {selectedTenant && (
        <View style={[styles.selectedTenantBanner, { backgroundColor: colors.primary }]}>
          <View style={styles.selectedTenantContent}>
            <View style={styles.selectedTenantIcon}>
              <Ionicons name="business" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.selectedTenantInfo}>
              <Text style={styles.selectedTenantLabel}>Currently Browsing</Text>
              <Text style={styles.selectedTenantName}>{selectedTenant.name}</Text>
              <Text style={styles.selectedTenantSubdomain}>{selectedTenant.subdomain}.oblikey.no</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.exitTenantButton, {
              backgroundColor: colors.danger,
              shadowColor: colors.shadow,
              shadowOpacity: isDark ? 0.2 : 0.1
            }]}
            onPress={handleExitTenantView}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#FFFFFF" />
            <Text style={styles.exitTenantButtonText}>Exit Tenant View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search and Filters - Separat fra FlatList */}
      <View style={[styles.filtersContainer, isWeb && styles.filtersContainerWeb]}>
        <View style={[styles.searchContainer, isWeb && styles.searchContainerWeb, {
          backgroundColor: colors.cardBg,
          borderColor: colors.border
        }]}>
          <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, isWeb && styles.searchInputWeb, { color: colors.text }]}
            placeholder="Search tenants by name, subdomain, or email..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              statusFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => {
              dismissKeyboard();
              setStatusFilter('all');
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: colors.textSecondary },
                statusFilter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              statusFilter === 'active' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => {
              dismissKeyboard();
              setStatusFilter('active');
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: colors.textSecondary },
                statusFilter === 'active' && styles.filterButtonTextActive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              statusFilter === 'inactive' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => {
              dismissKeyboard();
              setStatusFilter('inactive');
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: colors.textSecondary },
                statusFilter === 'inactive' && styles.filterButtonTextActive,
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, {
              backgroundColor: colors.primary,
              shadowColor: colors.shadow,
              shadowOpacity: isDark ? 0.2 : 0.1
            }]}
            onPress={() => loadTenants()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tenant List */}
      <FlatList
        data={filteredTenants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TenantCard
            tenant={item}
            isSelected={selectedTenant?.id === item.id}
            onPress={() => handleTenantSelect(item)}
            onToggleStatus={() => handleToggleStatus(item)}
            onDelete={() => handleDeleteTenant(item)}
            navigation={navigation}
            colors={colors}
            isDark={isDark}
          />
        )}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.listContent, isWeb && styles.webContent]}
        numColumns={isWeb ? 3 : 1}
        columnWrapperStyle={isWeb ? styles.tenantsGridWeb : undefined}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={dismissKeyboard}
        removeClippedSubviews={false}
        extraData={searchQuery}
      />
    </View>
  );
}

// Tenant Card Component
const TenantCard = ({ tenant, isSelected, onPress, onToggleStatus, onDelete, navigation, colors, isDark }: any) => (
  <View
    style={[
      styles.tenantCard,
      {
        backgroundColor: colors.cardBg,
        borderColor: isSelected ? colors.primary : colors.border,
        shadowColor: colors.shadow,
        shadowOpacity: isDark ? 0.3 : 0.05
      },
      isSelected && { backgroundColor: colors.primary + '10' },
    ]}
  >
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flex: 1 }}
    >
      {isSelected && (
        <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.selectedBadgeText}>Selected</Text>
        </View>
      )}

      <View style={styles.tenantCardHeader}>
        <View style={[styles.tenantAvatar, { backgroundColor: tenant.active ? colors.primary + '20' : colors.textLight + '20' }]}>
          <Ionicons name="business" size={32} color={tenant.active ? colors.primary : colors.textLight} />
        </View>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: tenant.active ? colors.success : colors.danger,
              borderColor: colors.cardBg
            },
          ]}
        />
      </View>

      <View style={styles.tenantCardBody}>
        <Text style={[styles.tenantCardName, { color: colors.text }]} numberOfLines={1}>
          {tenant.name}
        </Text>
        <Text style={[styles.tenantCardSubdomain, { color: colors.primary }]} numberOfLines={1}>
          {tenant.subdomain}.oblikey.no
        </Text>
        <Text style={[styles.tenantCardEmail, { color: colors.textSecondary }]} numberOfLines={1}>
          {tenant.email}
        </Text>
      </View>

      <View style={[styles.tenantCardFooter, { borderTopColor: colors.borderLight }]}>
        {tenant.subscription && (
          <View
            style={[
              styles.subscriptionBadge,
              { backgroundColor: getStatusBadgeColor(tenant.subscription.status, colors) + '20' },
            ]}
          >
            <Text
              style={[
                styles.subscriptionBadgeText,
                { color: getStatusBadgeColor(tenant.subscription.status, colors) },
              ]}
            >
              {tenant.subscription.status}
            </Text>
          </View>
        )}

        <View style={styles.tenantStats}>
          <View style={styles.tenantStat}>
            <Ionicons name="people" size={14} color={colors.textSecondary} />
            <Text style={[styles.tenantStatText, { color: colors.textSecondary }]}>{tenant.userCount || 0} users</Text>
          </View>
        </View>

        {tenant.createdAt && (
          <Text style={[styles.tenantCardDate, { color: colors.textLight }]}>
            Created {formatDate(tenant.createdAt)}
          </Text>
        )}
      </View>

      <View style={styles.browseIconContainer}>
        <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
      </View>
    </TouchableOpacity>

    {/* Action Buttons */}
    <View style={[styles.tenantCardActions, { borderTopColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.manageButton, {
          backgroundColor: colors.primary + '10',
          borderColor: colors.primary + '30',
          shadowColor: colors.shadow,
          shadowOpacity: isDark ? 0.2 : 0.1
        }]}
        onPress={(e) => {
          e.stopPropagation();
          navigation.navigate('ManageFeatures', {
            tenantId: tenant.id,
            tenantName: tenant.name,
          });
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="cube-outline" size={18} color={colors.primary} />
        <Text style={[styles.manageButtonText, { color: colors.primary }]}>Administrer Features</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.manageButton, {
          backgroundColor: colors.success + '10',
          borderColor: colors.success + '30',
          shadowColor: colors.shadow,
          shadowOpacity: isDark ? 0.2 : 0.1
        }]}
        onPress={(e) => {
          e.stopPropagation();
          navigation.navigate('TenantModules', {
            tenantId: tenant.id,
            tenantName: tenant.name,
          });
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="grid-outline" size={18} color={colors.success} />
        <Text style={[styles.manageButtonText, { color: colors.success }]}>Administrer Moduler</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.toggleStatusButton,
          {
            backgroundColor: tenant.active ? colors.warning + '20' : colors.success + '20',
            borderColor: tenant.active ? colors.warning + '50' : colors.success + '50',
            shadowColor: colors.shadow,
            shadowOpacity: isDark ? 0.2 : 0.1
          },
        ]}
        onPress={(e) => {
          e.stopPropagation();
          onToggleStatus();
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={tenant.active ? "pause-circle-outline" : "play-circle-outline"}
          size={18}
          color={tenant.active ? colors.warning : colors.success}
        />
        <Text style={[
          styles.toggleStatusButtonText,
          { color: tenant.active ? colors.warning : colors.success },
        ]}>
          {tenant.active ? 'Deaktiver' : 'Aktiver'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton, {
          backgroundColor: colors.danger + '20',
          borderColor: colors.danger + '50',
          shadowColor: colors.shadow,
          shadowOpacity: isDark ? 0.2 : 0.1
        }]}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Slett</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusBadgeColor = (status: string, colors: any) => {
  switch (status) {
    case 'ACTIVE':
      return colors.success;
    case 'TRIAL':
      return colors.primary;
    case 'CANCELLED':
    case 'EXPIRED':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
  webContent: {
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
    padding: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerWeb: {
    marginBottom: 32,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  createTenantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  createTenantButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  // Selected Tenant Banner
  selectedTenantBanner: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    marginHorizontal: 16,
    flexDirection: isWeb ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isWeb ? 'center' : 'flex-start',
    gap: 16,
  },
  selectedTenantContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  selectedTenantIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFFFFF20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTenantInfo: {
    flex: 1,
  },
  selectedTenantLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedTenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  selectedTenantSubdomain: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  exitTenantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  exitTenantButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Search and Filters
  filtersContainer: {
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  filtersContainerWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchContainerWeb: {
    flex: 1,
    maxWidth: 400,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
  },
  searchInputWeb: {
    height: 48,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  // Error State
  errorContainer: {
    padding: 48,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Tenants Grid
  tenantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  tenantsGridWeb: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
    marginBottom: 20,
  },
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 15,
    textAlign: 'center',
  },
  // Tenant Card
  tenantCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    ...(isWeb ? { width: '32%' } : { width: '100%' }),
    minWidth: 280,
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 10,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tenantCardHeader: {
    marginBottom: 16,
    position: 'relative',
  },
  tenantAvatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  tenantCardBody: {
    marginBottom: 16,
  },
  tenantCardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tenantCardSubdomain: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  tenantCardEmail: {
    fontSize: 13,
  },
  tenantCardFooter: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  subscriptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  subscriptionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tenantStats: {
    flexDirection: 'row',
    gap: 12,
  },
  tenantStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tenantStatText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tenantCardDate: {
    fontSize: 13,
  },
  browseIconContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  // Action Buttons
  tenantCardActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  toggleStatusButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
