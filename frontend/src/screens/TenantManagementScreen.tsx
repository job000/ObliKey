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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  active: boolean;
  createdAt: string;
  subscription?: {
    status: string;
    tier?: string;
    price: number;
    currency: string;
  };
}

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  trialTenants: number;
  monthlyRevenue: number;
}

export default function TenantManagementScreen({ navigation }: any) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const isWeb = Platform.OS === 'web';
  const limit = 20;

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigation.navigate('Dashboard');
      return;
    }
    loadData();
  }, [user, currentPage, searchQuery, activeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        limit,
        offset: (currentPage - 1) * limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (activeFilter !== 'all') {
        params.active = activeFilter === 'active';
      }

      const [tenantsResponse, statsResponse] = await Promise.all([
        api.getAllTenants(params),
        api.getTenantStats(),
      ]);

      setTenants(tenantsResponse.data.tenants || []);
      setTotalPages(Math.ceil((tenantsResponse.data.total || 0) / limit));
      setStats(statsResponse.data);
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
    loadData();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: 'all' | 'active' | 'inactive') => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleTenantPress = (tenantId: string) => {
    navigation.navigate('TenantDetail', { tenantId });
  };

  const handleCreateTenant = () => {
    navigation.navigate('CreateTenant');
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
      month: 'short',
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

  const StatsCard = ({ title, value, subtitle, icon, color }: any) => (
    <View style={[styles.statsCard, isWeb && styles.statsCardWeb]}>
      <View style={styles.statsIcon}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statsContent}>
        <Text style={styles.statsValue}>{value}</Text>
        <Text style={styles.statsTitle}>{title}</Text>
        {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const TenantRow = ({ tenant }: { tenant: Tenant }) => (
    <TouchableOpacity
      style={[styles.tenantRow, isWeb && styles.tenantRowWeb]}
      onPress={() => handleTenantPress(tenant.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.tenantCell, styles.tenantNameCell]}>
        <Text style={styles.tenantName}>{tenant.name}</Text>
        <Text style={styles.tenantSubdomain}>{tenant.subdomain}.oblikey.no</Text>
      </View>

      <View style={styles.tenantCell}>
        <Text style={styles.tenantEmail}>{tenant.email}</Text>
      </View>

      <View style={styles.tenantCell}>
        {tenant.subscription ? (
          <View style={styles.subscriptionInfo}>
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
              <Text style={styles.tierText}>{tenant.subscription.tier}</Text>
            )}
            <Text style={styles.priceText}>
              {formatCurrency(tenant.subscription.price, tenant.subscription.currency)}
            </Text>
          </View>
        ) : (
          <Text style={styles.noSubscription}>Ingen abonnement</Text>
        )}
      </View>

      <View style={styles.tenantCell}>
        <View
          style={[
            styles.activeBadge,
            { backgroundColor: tenant.active ? '#10B98120' : '#EF444420' },
          ]}
        >
          <Text style={[styles.activeText, { color: tenant.active ? '#10B981' : '#EF4444' }]}>
            {tenant.active ? 'Aktiv' : 'Inaktiv'}
          </Text>
        </View>
      </View>

      <View style={styles.tenantCell}>
        <Text style={styles.dateText}>{formatDate(tenant.createdAt)}</Text>
      </View>

      <View style={styles.tenantCell}>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster tenants...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, isWeb && styles.contentContainerWeb]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={[styles.header, isWeb && styles.headerWeb]}>
        <View>
          <Text style={styles.title}>Tenant Management</Text>
          <Text style={styles.subtitle}>
            Administrer alle kunder og deres abonnementer
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateTenant}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.createButtonText}>Ny Tenant</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={[styles.statsContainer, isWeb && styles.statsContainerWeb]}>
          <StatsCard
            title="Totalt Tenants"
            value={stats.totalTenants}
            icon="business"
            color="#3B82F6"
          />
          <StatsCard
            title="Aktive"
            value={stats.activeTenants}
            subtitle={`${stats.inactiveTenants} inaktive`}
            icon="checkmark-circle"
            color="#10B981"
          />
          <StatsCard
            title="Prøveperiode"
            value={stats.trialTenants}
            icon="time"
            color="#F59E0B"
          />
          <StatsCard
            title="Månedsomsetning"
            value={formatCurrency(stats.monthlyRevenue)}
            icon="trending-up"
            color="#8B5CF6"
          />
        </View>
      )}

      {/* Search and Filters */}
      <View style={[styles.filtersContainer, isWeb && styles.filtersContainerWeb]}>
        <View style={[styles.searchContainer, isWeb && styles.searchContainerWeb]}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isWeb && styles.searchInputWeb]}
            placeholder="Søk etter tenant navn, subdomain eller e-post..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterChange('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              Alle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'active' && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterChange('active')}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === 'active' && styles.filterButtonTextActive,
              ]}
            >
              Aktive
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'inactive' && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterChange('inactive')}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === 'inactive' && styles.filterButtonTextActive,
              ]}
            >
              Inaktive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Prøv igjen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tenants Table */}
      {!error && (
        <View style={[styles.tableContainer, isWeb && styles.tableContainerWeb]}>
          {/* Table Header */}
          <View style={[styles.tableHeader, isWeb && styles.tableHeaderWeb]}>
            <View style={[styles.headerCell, styles.tenantNameCell]}>
              <Text style={styles.headerText}>Tenant</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>E-post</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>Abonnement</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>Status</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>Opprettet</Text>
            </View>
            <View style={styles.headerCell} />
          </View>

          {/* Table Rows */}
          {tenants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>Ingen tenants funnet</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? 'Prøv å endre søkekriteriene dine'
                  : 'Opprett din første tenant for å komme i gang'}
              </Text>
            </View>
          ) : (
            tenants.map((tenant) => <TenantRow key={tenant.id} tenant={tenant} />)
          )}
        </View>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
            onPress={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={currentPage === 1 ? '#D1D5DB' : '#3B82F6'}
            />
          </TouchableOpacity>

          <Text style={styles.paginationText}>
            Side {currentPage} av {totalPages}
          </Text>

          <TouchableOpacity
            style={[
              styles.paginationButton,
              currentPage === totalPages && styles.paginationButtonDisabled,
            ]}
            onPress={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={currentPage === totalPages ? '#D1D5DB' : '#3B82F6'}
            />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 16,
  },
  contentContainerWeb: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerWeb: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statsContainerWeb: {
    gap: 16,
    marginBottom: 32,
  },
  statsCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsCardWeb: {
    minWidth: 200,
    padding: 20,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statsTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  filtersContainer: {
    gap: 12,
    marginBottom: 16,
  },
  filtersContainerWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
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
    backgroundColor: '#FFF',
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
    color: '#FFF',
  },
  tableContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableContainerWeb: {
    borderRadius: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderWeb: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  headerCell: {
    flex: 1,
    justifyContent: 'center',
  },
  tenantNameCell: {
    flex: 2,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tenantRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  tenantRowWeb: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  tenantCell: {
    flex: 1,
    justifyContent: 'center',
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  tenantSubdomain: {
    fontSize: 12,
    color: '#6B7280',
  },
  tenantEmail: {
    fontSize: 13,
    color: '#374151',
  },
  subscriptionInfo: {
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tierText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  noSubscription: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
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
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  paginationText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
