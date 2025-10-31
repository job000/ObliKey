import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

export default function TenantSelector() {
  const { user, viewingAsTenantId, switchTenant } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isWeb = Platform.OS === 'web';

  // Only show for SUPER_ADMIN users
  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  useEffect(() => {
    if (modalVisible) {
      fetchTenants();
    }
  }, [modalVisible]);

  useEffect(() => {
    // Filter tenants based on search query
    if (searchQuery.trim()) {
      const filtered = tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTenants(filtered);
    } else {
      setFilteredTenants(tenants);
    }
  }, [searchQuery, tenants]);

  useEffect(() => {
    // Find and set the selected tenant when viewingAsTenantId changes
    if (viewingAsTenantId && tenants.length > 0) {
      const tenant = tenants.find((t) => t.id === viewingAsTenantId);
      setSelectedTenant(tenant || null);
    } else {
      setSelectedTenant(null);
    }
  }, [viewingAsTenantId, tenants]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await api.getAllTenants();
      if (response.success) {
        setTenants(response.data);
        setFilteredTenants(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = async (tenant: Tenant | null) => {
    // Check if tenant is deactivated
    if (tenant && !tenant.active) {
      Alert.alert(
        'Deaktivert Tenant',
        `Tenanten "${tenant.name}" er deaktivert og kan ikke administreres. Du må først aktivere tenanten før du kan utføre handlinger.\n\nVil du likevel vise denne tenanten?`,
        [
          {
            text: 'Avbryt',
            style: 'cancel',
          },
          {
            text: 'Aktiver Tenant',
            onPress: () => {
              // TODO: Navigate to tenant management to activate
              setModalVisible(false);
              Alert.alert(
                'Aktiver Tenant',
                'Gå til Tenant Management for å aktivere denne tenanten.',
                [{ text: 'OK' }]
              );
            },
          },
          {
            text: 'Vis Likevel',
            style: 'destructive',
            onPress: async () => {
              try {
                await switchTenant(tenant?.id || null);
                setSelectedTenant(tenant);
                setModalVisible(false);
                setSearchQuery('');
              } catch (error) {
                console.error('Failed to switch tenant:', error);
                Alert.alert('Feil', 'Kunne ikke bytte til tenant. Vennligst prøv igjen.');
              }
            },
          },
        ]
      );
      return;
    }

    // Normal tenant switch for active tenants or "Alle Tenants"
    try {
      await switchTenant(tenant?.id || null);
      setSelectedTenant(tenant);
      setModalVisible(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      Alert.alert('Feil', 'Kunne ikke bytte til tenant. Vennligst prøv igjen.');
    }
  };

  const renderTenantItem = ({ item }: { item: Tenant }) => {
    const isSelected = item.id === viewingAsTenantId;
    return (
      <TouchableOpacity
        style={[styles.tenantItem, isSelected && styles.tenantItemSelected]}
        onPress={() => handleSelectTenant(item)}
      >
        <View style={styles.tenantInfo}>
          <Text style={[styles.tenantName, isSelected && styles.tenantNameSelected]}>
            {item.name}
          </Text>
          <Text style={[styles.tenantSubdomain, isSelected && styles.tenantSubdomainSelected]}>
            {item.subdomain}.oblikey.no
          </Text>
        </View>
        <View style={styles.tenantRight}>
          {!item.active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inaktiv</Text>
            </View>
          )}
          {isSelected && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity style={styles.selectorButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="business" size={20} color="#6B7280" />
        <View style={styles.selectorText}>
          <Text style={styles.selectorLabel}>Vis som tenant:</Text>
          <Text style={styles.selectorValue}>
            {selectedTenant ? selectedTenant.name : 'Alle Tenants'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isWeb && styles.modalContentWeb]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Velg Tenant</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Søk etter tenant..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* View All Option */}
            <TouchableOpacity
              style={[styles.tenantItem, !viewingAsTenantId && styles.tenantItemSelected]}
              onPress={() => handleSelectTenant(null)}
            >
              <View style={styles.tenantInfo}>
                <Text
                  style={[styles.tenantName, !viewingAsTenantId && styles.tenantNameSelected]}
                >
                  Alle Tenants
                </Text>
                <Text
                  style={[
                    styles.tenantSubdomain,
                    !viewingAsTenantId && styles.tenantSubdomainSelected,
                  ]}
                >
                  Se data fra alle tenants
                </Text>
              </View>
              {!viewingAsTenantId && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Tenant List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Laster tenants...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredTenants}
                renderItem={renderTenantItem}
                keyExtractor={(item) => item.id}
                style={styles.tenantList}
                contentContainerStyle={styles.tenantListContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Ingen tenants funnet</Text>
                    {searchQuery && (
                      <Text style={styles.emptySubText}>Prøv et annet søk</Text>
                    )}
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    marginBottom: 16,
  },
  selectorText: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalContentWeb: {
    maxHeight: '70%',
    marginHorizontal: 'auto',
    marginVertical: 'auto',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  tenantList: {
    flex: 1,
  },
  tenantListContent: {
    paddingHorizontal: 20,
  },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tenantItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tenantNameSelected: {
    color: '#1E40AF',
  },
  tenantSubdomain: {
    fontSize: 12,
    color: '#6B7280',
  },
  tenantSubdomainSelected: {
    color: '#3B82F6',
  },
  tenantRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
