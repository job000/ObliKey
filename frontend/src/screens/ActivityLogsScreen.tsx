import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Container from '../components/Container';
import { Picker } from '@react-native-picker/picker';

interface ActivityLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata: any;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface FilterOptions {
  action: string;
  resource: string;
  searchTerm: string;
}

const ACTION_TYPES = [
  'LOGIN', 'LOGOUT', 'REGISTER', 'UPDATE_PROFILE', 'CHANGE_PASSWORD',
  'UPDATE_USERNAME', 'UPDATE_AVATAR', 'BOOK_CLASS', 'CANCEL_BOOKING',
  'CREATE_ORDER', 'CANCEL_ORDER', 'SEND_MESSAGE', 'PAYMENT',
  'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
  'DEACTIVATE_USER', 'ACTIVATE_USER', 'UPDATE_USER_ROLE'
];

const RESOURCE_TYPES = [
  'Auth', 'User', 'Class', 'Booking', 'Order', 'Product',
  'Message', 'Payment', 'Avatar', 'Profile'
];

export default function ActivityLogsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    action: '',
    resource: '',
    searchTerm: '',
  });

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      loadActivityLogs();
    }
  }, [filters]);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);

      const params: any = {
        limit: 50,
      };

      if (filters.action) params.action = filters.action;
      if (filters.resource) params.resource = filters.resource;
      if (filters.searchTerm) params.search = filters.searchTerm;

      const response = await api.getActivityLogs(params);

      if (response.success) {
        setLogs(response.data.logs || response.data);
      }
    } catch (error) {
      console.error('Failed to load activity logs:', error);
      Alert.alert('Feil', 'Kunne ikke laste aktivitetslogger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadActivityLogs();
  };

  const handleFilterChange = (field: keyof FilterOptions, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      searchTerm: '',
    });
  };

  const getActionColor = (action: string): string => {
    if (action.includes('LOGIN') || action.includes('REGISTER')) return '#10B981';
    if (action.includes('LOGOUT')) return '#6B7280';
    if (action.includes('DELETE') || action.includes('CANCEL')) return '#EF4444';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return '#3B82F6';
    if (action.includes('CREATE') || action.includes('BOOK')) return '#8B5CF6';
    if (action.includes('PAYMENT') || action.includes('ORDER')) return '#F59E0B';
    return '#6B7280';
  };

  const getActionBackgroundColor = (action: string): string => {
    if (action.includes('LOGIN') || action.includes('REGISTER')) return '#D1FAE5';
    if (action.includes('LOGOUT')) return '#F3F4F6';
    if (action.includes('DELETE') || action.includes('CANCEL')) return '#FEE2E2';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return '#DBEAFE';
    if (action.includes('CREATE') || action.includes('BOOK')) return '#EDE9FE';
    if (action.includes('PAYMENT') || action.includes('ORDER')) return '#FEF3C7';
    return '#F3F4F6';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Akkurat nå';
    if (diffMins < 60) return `${diffMins} min siden`;
    if (diffHours < 24) return `${diffHours} time${diffHours > 1 ? 'r' : ''} siden`;
    if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'er' : ''} siden`;

    return date.toLocaleDateString('nb-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check access
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <View style={styles.container}>
        <Container>
          <View style={styles.accessDenied}>
            <Ionicons name="lock-closed" size={64} color="#EF4444" />
            <Text style={styles.accessDeniedTitle}>Ingen tilgang</Text>
            <Text style={styles.accessDeniedText}>
              Du har ikke tilgang til aktivitetslogger.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Gå tilbake</Text>
            </TouchableOpacity>
          </View>
        </Container>
      </View>
    );
  }

  const renderLogItem = ({ item }: { item: ActivityLog }) => {
    const isExpanded = expandedLog === item.id;

    return (
      <TouchableOpacity
        style={styles.logItem}
        onPress={() => setExpandedLog(isExpanded ? null : item.id)}
      >
        <View style={styles.logHeader}>
          <View
            style={[
              styles.actionBadge,
              { backgroundColor: getActionBackgroundColor(item.action) },
            ]}
          >
            <Text style={[styles.actionText, { color: getActionColor(item.action) }]}>
              {item.action}
            </Text>
          </View>
          <Text style={styles.resourceText}>{item.resource}</Text>
        </View>

        <Text style={styles.descriptionText}>{item.description}</Text>

        <View style={styles.logMeta}>
          {item.user && (
            <View style={styles.metaItem}>
              <Ionicons name="person" size={14} color="#6B7280" />
              <Text style={styles.metaText}>
                {item.user.firstName} {item.user.lastName}
              </Text>
              <Text style={styles.metaTextLight}>({item.user.role})</Text>
            </View>
          )}

          <View style={styles.metaItem}>
            <Ionicons name="time" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="globe" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{item.ipAddress}</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bruker-Agent:</Text>
              <Text style={styles.detailValue}>{item.userAgent}</Text>
            </View>

            {item.resourceId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ressurs ID:</Text>
                <Text style={styles.detailValueMono}>{item.resourceId}</Text>
              </View>
            )}

            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Metadata:</Text>
                <Text style={styles.detailValueMono}>
                  {JSON.stringify(item.metadata, null, 2)}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.expandIcon}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#9CA3AF"
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Container>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter" size={20} color="#6B7280" />
            <Text style={styles.filterButtonText}>Filtrer</Text>
            <Ionicons
              name={showFilters ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#6B7280"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadActivityLogs}
            disabled={loading}
          >
            <Ionicons name="refresh" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filterLabel}>Søk</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Søk i beskrivelse, IP-adresse..."
                value={filters.searchTerm}
                onChangeText={(value) => handleFilterChange('searchTerm', value)}
              />
            </View>

            <Text style={styles.filterLabel}>Handlingstype</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filters.action}
                onValueChange={(value) => handleFilterChange('action', value)}
                style={styles.picker}
              >
                <Picker.Item label="Alle handlinger" value="" />
                {ACTION_TYPES.map((action) => (
                  <Picker.Item key={action} label={action} value={action} />
                ))}
              </Picker>
            </View>

            <Text style={styles.filterLabel}>Ressurstype</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filters.resource}
                onValueChange={(value) => handleFilterChange('resource', value)}
                style={styles.picker}
              >
                <Picker.Item label="Alle ressurser" value="" />
                {RESOURCE_TYPES.map((resource) => (
                  <Picker.Item key={resource} label={resource} value={resource} />
                ))}
              </Picker>
            </View>

            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Nullstill filtre</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Activity Logs List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Laster aktivitetslogger...</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Ingen aktiviteter funnet</Text>
            <Text style={styles.emptyText}>Prøv å justere filtrene dine</Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item) => item.id}
            renderItem={renderLogItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#111827',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  picker: {
    height: 50,
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  listContent: {
    paddingBottom: 24,
  },
  logItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  actionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resourceText: {
    fontSize: 12,
    color: '#6B7280',
  },
  descriptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 12,
  },
  logMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  metaTextLight: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  expandedDetails: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 12,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  detailValue: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  detailValueMono: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#6B7280',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expandIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
