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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Subscription {
  id: string;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    subdomain: string;
  };
  tier: string;
  status: string;
  interval: string;
  price: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  monthlyRevenue: number;
  annualRevenue: number;
}

export default function SubscriptionManagementScreen({ navigation }: any) {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'EXPIRED'>('all');
  const [error, setError] = useState<string | null>(null);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigation.navigate('Dashboard');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all tenants with their subscription data
      const [tenantsResponse, statsResponse] = await Promise.all([
        api.getAllTenants({ limit: 1000 }),
        api.getSubscriptionStats().catch(() => ({ data: null })),
      ]);

      // Extract subscriptions from tenants
      const allSubscriptions: Subscription[] = [];
      if (tenantsResponse.data?.tenants) {
        tenantsResponse.data.tenants.forEach((tenant: any) => {
          if (tenant.subscription) {
            allSubscriptions.push({
              ...tenant.subscription,
              tenant: {
                id: tenant.id,
                name: tenant.name,
                subdomain: tenant.subdomain,
              },
            });
          }
        });
      }

      setSubscriptions(allSubscriptions);
      setStats(statsResponse.data || {
        totalSubscriptions: allSubscriptions.length,
        activeSubscriptions: allSubscriptions.filter(s => s.status === 'ACTIVE').length,
        trialSubscriptions: allSubscriptions.filter(s => s.status === 'TRIAL').length,
        cancelledSubscriptions: allSubscriptions.filter(s => s.status === 'CANCELLED').length,
        monthlyRevenue: 0,
        annualRevenue: 0,
      });
    } catch (err: any) {
      console.error('Failed to load subscriptions:', err);
      setError(err.response?.data?.message || 'Kunne ikke laste abonnementer');
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
  };

  const handleFilterChange = (filter: typeof statusFilter) => {
    setStatusFilter(filter);
  };

  const handleSubscriptionPress = (subscriptionId: string) => {
    navigation.navigate('ManageSubscription', { subscriptionId });
  };

  const handleCreateSubscription = () => {
    navigation.navigate('CreateSubscription');
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
        return '#EF4444';
      case 'EXPIRED':
        return '#F59E0B';
      case 'PAST_DUE':
        return '#DC2626';
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
      MONTHLY: 'Månedlig',
      QUARTERLY: 'Kvartalsvis',
      ANNUAL: 'Årlig',
    };
    return labels[interval] || interval;
  };

  const getTierLabel = (tier: string) => {
    const labels: { [key: string]: string } = {
      TRIAL: 'Prøveversjon',
      BASIC: 'Basic',
      PREMIUM: 'Premium',
      ENTERPRISE: 'Enterprise',
      CUSTOM: 'Tilpasset',
    };
    return labels[tier] || tier;
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      searchQuery === '' ||
      sub.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

  const SubscriptionRow = ({ subscription }: { subscription: Subscription }) => (
    <TouchableOpacity
      style={[styles.subscriptionRow, isWeb && styles.subscriptionRowWeb]}
      onPress={() => handleSubscriptionPress(subscription.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.subscriptionCell, styles.tenantNameCell]}>
        <Text style={styles.tenantName}>{subscription.tenant.name}</Text>
        <Text style={styles.tenantSubdomain}>{subscription.tenant.subdomain}</Text>
      </View>

      <View style={styles.subscriptionCell}>
        <Text style={styles.tierText}>{getTierLabel(subscription.tier)}</Text>
      </View>

      <View style={styles.subscriptionCell}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(subscription.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(subscription.status) },
            ]}
          >
            {getStatusLabel(subscription.status)}
          </Text>
        </View>
      </View>

      <View style={styles.subscriptionCell}>
        <Text style={styles.intervalText}>{getIntervalLabel(subscription.interval)}</Text>
      </View>

      <View style={styles.subscriptionCell}>
        <Text style={styles.priceText}>
          {formatCurrency(subscription.price, subscription.currency)}
        </Text>
      </View>

      <View style={styles.subscriptionCell}>
        <Text style={styles.dateText}>
          {formatDate(subscription.currentPeriodEnd)}
        </Text>
      </View>

      <View style={styles.subscriptionCell}>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster abonnementer...</Text>
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
          <Text style={styles.title}>Abonnementsstyring</Text>
          <Text style={styles.subtitle}>
            Administrer alle kundeabonnementer og faktureringer
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateSubscription}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.createButtonText}>Nytt Abonnement</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={[styles.statsContainer, isWeb && styles.statsContainerWeb]}>
          <StatsCard
            title="Totalt Abonnementer"
            value={stats.totalSubscriptions}
            icon="receipt"
            color="#3B82F6"
          />
          <StatsCard
            title="Aktive"
            value={stats.activeSubscriptions}
            icon="checkmark-circle"
            color="#10B981"
          />
          <StatsCard
            title="Prøveperiode"
            value={stats.trialSubscriptions}
            icon="time"
            color="#F59E0B"
          />
          <StatsCard
            title="Kansellerte"
            value={stats.cancelledSubscriptions}
            icon="close-circle"
            color="#EF4444"
          />
        </View>
      )}

      {/* Search and Filters */}
      <View style={[styles.filtersContainer, isWeb && styles.filtersContainerWeb]}>
        <View style={[styles.searchContainer, isWeb && styles.searchContainerWeb]}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isWeb && styles.searchInputWeb]}
            placeholder="Søk etter tenant navn eller subdomain..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange('all')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === 'all' && styles.filterButtonTextActive,
                ]}
              >
                Alle
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === 'ACTIVE' && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange('ACTIVE')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === 'ACTIVE' && styles.filterButtonTextActive,
                ]}
              >
                Aktive
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === 'TRIAL' && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange('TRIAL')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === 'TRIAL' && styles.filterButtonTextActive,
                ]}
              >
                Prøveperiode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === 'CANCELLED' && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange('CANCELLED')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === 'CANCELLED' && styles.filterButtonTextActive,
                ]}
              >
                Kansellert
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === 'EXPIRED' && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange('EXPIRED')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === 'EXPIRED' && styles.filterButtonTextActive,
                ]}
              >
                Utløpt
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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

      {/* Subscriptions Table */}
      {!error && (
        <View style={[styles.tableContainer, isWeb && styles.tableContainerWeb]}>
          {/* Table Header */}
          <View style={[styles.tableHeader, isWeb && styles.tableHeaderWeb]}>
            <View style={[styles.headerCell, styles.tenantNameCell]}>
              <Text style={styles.headerText}>Tenant</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>Plan</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>Status</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>Intervall</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>Beløp</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>Neste Faktura</Text>
            </View>
            <View style={styles.headerCell} />
          </View>

          {/* Table Rows */}
          {filteredSubscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>Ingen abonnementer funnet</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? 'Prøv å endre søkekriteriene dine'
                  : 'Opprett ditt første abonnement for å komme i gang'}
              </Text>
            </View>
          ) : (
            filteredSubscriptions.map((subscription) => (
              <SubscriptionRow key={subscription.id} subscription={subscription} />
            ))
          )}
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
  subscriptionRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  subscriptionRowWeb: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  subscriptionCell: {
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
  tierText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
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
  intervalText: {
    fontSize: 13,
    color: '#6B7280',
  },
  priceText: {
    fontSize: 13,
    color: '#111827',
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
});
