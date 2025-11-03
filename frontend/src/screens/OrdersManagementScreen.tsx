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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';
import type { Order } from '../types';

type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const toNumber = (v: any) => {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  // fjern evt. "kr", mellomrom og tusenskilletegn før parse
  const cleaned = String(v).replace(/\skr|kr|\s| |,/gi, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const formatNOK = (v: any) => `${toNumber(v).toLocaleString('nb-NO')} kr`;

export default function OrdersManagementScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.getAllOrders(); // Admin endpoint
      if (response.success) {
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await api.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        setOrders(
          orders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        setModalVisible(false);
        Alert.alert('Suksess', 'Ordrestatus oppdatert');
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke oppdatere status');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#F59E0B';
      case 'PROCESSING':
        return '#3B82F6';
      case 'SHIPPED':
        return '#8B5CF6';
      case 'DELIVERED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Venter';
      case 'PROCESSING':
        return 'Behandles';
      case 'SHIPPED':
        return 'Sendt';
      case 'DELIVERED':
        return 'Levert';
      case 'CANCELLED':
        return 'Kansellert';
      default:
        return status;
    }
  };

  const getFilteredOrders = () => {
    if (filter === 'pending') {
      return orders.filter((order) => order.status.toUpperCase() === 'PENDING');
    }
    if (filter === 'active') {
      return orders.filter(
        (order) =>
          order.status.toUpperCase() === 'PROCESSING' ||
          order.status.toUpperCase() === 'SHIPPED'
      );
    }
    if (filter === 'completed') {
      return orders.filter(
        (order) =>
          order.status.toUpperCase() === 'DELIVERED' ||
          order.status.toUpperCase() === 'CANCELLED'
      );
    }
    return orders;
  };

  const getOrderStats = () => {
    const pending = orders.filter((o) => o.status.toUpperCase() === 'PENDING').length;
    const processing = orders.filter(
      (o) =>
        o.status.toUpperCase() === 'PROCESSING' || o.status.toUpperCase() === 'SHIPPED'
    ).length;
    const completed = orders.filter((o) => o.status.toUpperCase() === 'DELIVERED').length;
    const totalRevenue = orders
      .filter((o) => o.status.toUpperCase() === 'DELIVERED')
      .reduce((sum, order) => sum + order.total, 0);

    return { pending, processing, completed, totalRevenue };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const filteredOrders = getFilteredOrders();
  const stats = getOrderStats();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Container>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Nye</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="sync-outline" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.processing}</Text>
            <Text style={styles.statLabel}>Aktive</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Fullført</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E9D5FF' }]}>
              <Ionicons name="cash-outline" size={24} color="#A855F7" />
            </View>
            <Text style={styles.statValue}>
              {stats.totalRevenue.toLocaleString('nb-NO', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.statLabel}>Omsetning (kr)</Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              Alle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'pending' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('pending')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'pending' && styles.filterButtonTextActive,
              ]}
            >
              Nye
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'active' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('active')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'active' && styles.filterButtonTextActive,
              ]}
            >
              Aktive
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'completed' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('completed')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'completed' && styles.filterButtonTextActive,
              ]}
            >
              Fullført
            </Text>
          </TouchableOpacity>
        </View>

        {/* Orders List */}
        <View style={styles.ordersList}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Ingen bestillinger funnet</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => {
                  setSelectedOrder(order);
                  setModalVisible(true);
                }}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <Text style={styles.orderDate}>
                      {formatDate(order.createdAt)} - {formatTime(order.createdAt)}
                    </Text>
                    <Text style={styles.customerName}>
                      Kunde: {order.user?.firstName} {order.user?.lastName}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(order.status) },
                      ]}
                    >
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.orderDetailRow}>
                    <Ionicons name="cube-outline" size={16} color="#6B7280" />
                    <Text style={styles.orderDetailText}>
                      {order.items.length} {order.items.length === 1 ? 'vare' : 'varer'}
                    </Text>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Ionicons name="cash-outline" size={16} color="#6B7280" />
                    <Text style={styles.orderDetailText}>
                      {formatNOK(order.total)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </Container>

      {/* Order Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Ordre #{selectedOrder?.orderNumber}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Customer Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Kundeinformasjon</Text>
                <Text style={styles.modalText}>
                  Navn: {selectedOrder?.user?.firstName}{' '}
                  {selectedOrder?.user?.lastName}
                </Text>
                <Text style={styles.modalText}>
                  E-post: {selectedOrder?.user?.email}
                </Text>
              </View>

              {/* Order Items */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Varer</Text>
                {(selectedOrder?.items ?? []).map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {(item?.productName ?? 'Ukjent produkt')} x{toNumber(item?.quantity)}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {formatNOK(toNumber(item?.subtotal))}
                    </Text>
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
  <Text style={styles.totalAmount}>
    {formatNOK(selectedOrder?.total)}
  </Text>
                </View>
              </View>

              {/* Update Status */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Oppdater status</Text>
                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[
                      styles.statusUpdateButton,
                      { backgroundColor: '#F59E0B' + '20', borderColor: '#F59E0B' },
                    ]}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'PENDING')
                    }
                  >
                    <Text style={[styles.statusUpdateText, { color: '#F59E0B' }]}>
                      Venter
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusUpdateButton,
                      { backgroundColor: '#3B82F6' + '20', borderColor: '#3B82F6' },
                    ]}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'PROCESSING')
                    }
                  >
                    <Text style={[styles.statusUpdateText, { color: '#3B82F6' }]}>
                      Behandles
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusUpdateButton,
                      { backgroundColor: '#8B5CF6' + '20', borderColor: '#8B5CF6' },
                    ]}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'SHIPPED')
                    }
                  >
                    <Text style={[styles.statusUpdateText, { color: '#8B5CF6' }]}>
                      Sendt
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusUpdateButton,
                      { backgroundColor: '#10B981' + '20', borderColor: '#10B981' },
                    ]}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'DELIVERED')
                    }
                  >
                    <Text style={[styles.statusUpdateText, { color: '#10B981' }]}>
                      Levert
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusUpdateButton,
                      { backgroundColor: '#EF4444' + '20', borderColor: '#EF4444' },
                    ]}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'CANCELLED')
                    }
                  >
                    <Text style={[styles.statusUpdateText, { color: '#EF4444' }]}>
                      Kanseller
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
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
    marginTop: 16,
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
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  ordersList: {
    gap: 12,
    paddingBottom: 24,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#6B7280',
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
    maxHeight: '80%',
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
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statusButtons: {
    gap: 8,
  },
  statusUpdateButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusUpdateText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
