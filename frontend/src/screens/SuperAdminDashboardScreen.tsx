import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useFocusEffect } from '@react-navigation/native';
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
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigation.navigate('Dashboard');
      return;
    }
    loadTenants();
  }, [user, searchQuery, statusFilter]);

  // Reload tenants when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTenants();
    }, [searchQuery, statusFilter])
  );

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (statusFilter !== 'all') {
        params.active = statusFilter === 'active';
      }

      const response = await api.getAllTenants(params);

      // Fetch user count for each tenant
      const tenantsWithStats = await Promise.all(
        (response.data || []).map(async (tenant: any) => {
          try {
            const usersResponse = await api.getTenantUsers(tenant.id);
            return {
              ...tenant,
              userCount: usersResponse.data?.length || 0,
            };
          } catch (err) {
            return {
              ...tenant,
              userCount: 0,
            };
          }
        })
      );

      setTenants(tenantsWithStats);
    } catch (err: any) {
      console.error('Failed to load tenants:', err);
      setError(err.response?.data?.message || 'Failed to load tenants');
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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading tenants...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={[styles.header, isWeb && styles.headerWeb]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tenant Browser</Text>
          <Text style={styles.subtitle}>Browse and select tenants to manage their environment</Text>
        </View>
        <TouchableOpacity
          style={styles.createTenantButton}
          onPress={() => navigation.navigate('CreateTenant')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.createTenantButtonText}>Opprett Ny Tenant</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Tenant Indicator */}
      {selectedTenant && (
        <View style={styles.selectedTenantBanner}>
          <View style={styles.selectedTenantContent}>
            <View style={styles.selectedTenantIcon}>
              <Ionicons name="business" size={24} color="#3B82F6" />
            </View>
            <View style={styles.selectedTenantInfo}>
              <Text style={styles.selectedTenantLabel}>Currently Browsing</Text>
              <Text style={styles.selectedTenantName}>{selectedTenant.name}</Text>
              <Text style={styles.selectedTenantSubdomain}>{selectedTenant.subdomain}.oblikey.no</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.exitTenantButton}
            onPress={handleExitTenantView}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#FFFFFF" />
            <Text style={styles.exitTenantButtonText}>Exit Tenant View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search and Filters */}
      <View style={[styles.filtersContainer, isWeb && styles.filtersContainerWeb]}>
        <View style={[styles.searchContainer, isWeb && styles.searchContainerWeb]}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isWeb && styles.searchInputWeb]}
            placeholder="Search tenants by name, subdomain, or email..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              statusFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              statusFilter === 'active' && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter('active')}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === 'active' && styles.filterButtonTextActive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              statusFilter === 'inactive' && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter('inactive')}
          >
            <Text
              style={[
                styles.filterButtonText,
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
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTenants}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tenants Grid */}
      {!error && (
        <View style={[styles.tenantsGrid, isWeb && styles.tenantsGridWeb]}>
          {tenants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No tenants found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'No tenants available to browse'}
              </Text>
            </View>
          ) : (
            tenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                isSelected={selectedTenant?.id === tenant.id}
                onPress={() => handleTenantSelect(tenant)}
                navigation={navigation}
              />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

// Tenant Card Component
const TenantCard = ({ tenant, isSelected, onPress, navigation }: any) => (
  <View
    style={[
      styles.tenantCard,
      isSelected && styles.tenantCardSelected,
    ]}
  >
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flex: 1 }}
    >
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.selectedBadgeText}>Selected</Text>
        </View>
      )}

      <View style={styles.tenantCardHeader}>
        <View style={[styles.tenantAvatar, { backgroundColor: tenant.active ? '#3B82F620' : '#9CA3AF20' }]}>
          <Ionicons name="business" size={32} color={tenant.active ? '#3B82F6' : '#9CA3AF'} />
        </View>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(tenant.active) },
          ]}
        />
      </View>

      <View style={styles.tenantCardBody}>
        <Text style={styles.tenantCardName} numberOfLines={1}>
          {tenant.name}
        </Text>
        <Text style={styles.tenantCardSubdomain} numberOfLines={1}>
          {tenant.subdomain}.oblikey.no
        </Text>
        <Text style={styles.tenantCardEmail} numberOfLines={1}>
          {tenant.email}
        </Text>
      </View>

      <View style={styles.tenantCardFooter}>
        {tenant.subscription && (
          <View
            style={[
              styles.subscriptionBadge,
              { backgroundColor: getStatusBadgeColor(tenant.subscription.status) + '20' },
            ]}
          >
            <Text
              style={[
                styles.subscriptionBadgeText,
                { color: getStatusBadgeColor(tenant.subscription.status) },
              ]}
            >
              {tenant.subscription.status}
            </Text>
          </View>
        )}

        <View style={styles.tenantStats}>
          <View style={styles.tenantStat}>
            <Ionicons name="people" size={14} color="#6B7280" />
            <Text style={styles.tenantStatText}>{tenant.userCount || 0} users</Text>
          </View>
        </View>

        {tenant.createdAt && (
          <Text style={styles.tenantCardDate}>
            Created {formatDate(tenant.createdAt)}
          </Text>
        )}
      </View>

      <View style={styles.browseIconContainer}>
        <Ionicons name="arrow-forward-circle" size={24} color="#3B82F6" />
      </View>
    </TouchableOpacity>

    {/* Action Buttons */}
    <View style={styles.tenantCardActions}>
      <TouchableOpacity
        style={styles.manageButton}
        onPress={(e) => {
          e.stopPropagation();
          navigation.navigate('ManageFeatures', {
            tenantId: tenant.id,
            tenantName: tenant.name,
          });
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="cube-outline" size={18} color="#3B82F6" />
        <Text style={styles.manageButtonText}>Administrer Features</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Helper function for getting status color (moved outside component to avoid recreation)
const getStatusColor = (active: boolean) => {
  return active ? '#10B981' : '#EF4444';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return '#10B981';
    case 'TRIAL':
      return '#3B82F6';
    case 'CANCELLED':
    case 'EXPIRED':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
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
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerWeb: {
    marginBottom: 32,
  },
  createTenantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createTenantButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  // Selected Tenant Banner
  selectedTenantBanner: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  selectedTenantSubdomain: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  exitTenantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  exitTenantButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Search and Filters
  filtersContainer: {
    gap: 12,
    marginBottom: 24,
  },
  filtersContainerWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
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
    fontSize: 14,
    color: '#111827',
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
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  // Error State
  errorContainer: {
    padding: 48,
    alignItems: 'center',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Tenants Grid
  tenantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  tenantsGridWeb: {
    gap: 20,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Tenant Card
  tenantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...(isWeb ? { width: '32%' } : { width: '100%' }),
    minWidth: 280,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tenantCardSelected: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: '#F0F7FF',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
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
    borderColor: '#FFFFFF',
  },
  tenantCardBody: {
    marginBottom: 16,
  },
  tenantCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  tenantCardSubdomain: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
    fontWeight: '500',
  },
  tenantCardEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  tenantCardFooter: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  subscriptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  subscriptionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  tenantCardDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
