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
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import Container from '../components/Container';
import type { Order } from '../types';

type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const toNumber = (v: any) => {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/\skr|kr|\s| |,/gi, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const formatNOK = (v: any) => `${toNumber(v).toLocaleString('nb-NO')} kr`;

export default function OrdersManagementScreen({ navigation }: any) {
  const { colors } = useTheme();
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
      const response = await api.getAllOrders();
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
        return colors.warning;
      case 'PROCESSING':
        return colors.primary;
      case 'SHIPPED':
        return colors.accent;
      case 'DELIVERED':
        return colors.success;
      case 'CANCELLED':
        return colors.danger;
      default:
        return colors.textSecondary;
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredOrders = getFilteredOrders();
  const stats = getOrderStats();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Container>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={{ flex: 1, minWidth: Platform.OS === 'web' ? '23%' : '47%', backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time-outline" size={24} color={colors.warning} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{stats.pending}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Nye</Text>
          </View>

          <View style={{ flex: 1, minWidth: Platform.OS === 'web' ? '23%' : '47%', backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="sync-outline" size={24} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{stats.processing}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Aktive</Text>
          </View>

          <View style={{ flex: 1, minWidth: Platform.OS === 'web' ? '23%' : '47%', backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{stats.completed}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Fullført</Text>
          </View>

          <View style={{ flex: 1, minWidth: Platform.OS === 'web' ? '23%' : '47%', backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={[styles.statIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="cash-outline" size={24} color={colors.accent} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
              {stats.totalRevenue.toLocaleString('nb-NO', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Omsetning (kr)</Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, alignItems: 'center' },
              filter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                { fontSize: 13, fontWeight: '600', color: colors.text },
                filter === 'all' && { color: '#FFF' },
              ]}
            >
              Alle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, alignItems: 'center' },
              filter === 'pending' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter('pending')}
          >
            <Text
              style={[
                { fontSize: 13, fontWeight: '600', color: colors.text },
                filter === 'pending' && { color: '#FFF' },
              ]}
            >
              Nye
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, alignItems: 'center' },
              filter === 'active' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter('active')}
          >
            <Text
              style={[
                { fontSize: 13, fontWeight: '600', color: colors.text },
                filter === 'active' && { color: '#FFF' },
              ]}
            >
              Aktive
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, alignItems: 'center' },
              filter === 'completed' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter('completed')}
          >
            <Text
              style={[
                { fontSize: 13, fontWeight: '600', color: colors.text },
                filter === 'completed' && { color: '#FFF' },
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
              <Ionicons name="receipt-outline" size={64} color={colors.border} />
              <Text style={{ fontSize: 16, color: colors.textLight, marginTop: 16 }}>Ingen bestillinger funnet</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={{ backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, marginBottom: 12 }}
                onPress={() => {
                  setSelectedOrder(order);
                  setModalVisible(true);
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>#{order.orderNumber}</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 2 }}>
                      {formatDate(order.createdAt)} - {formatTime(order.createdAt)}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
                      Kunde: {order.user?.firstName} {order.user?.lastName}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: getStatusColor(order.status) + '20',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: getStatusColor(order.status),
                      }}
                    >
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.background }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                      {order.items.length} {order.items.length === 1 ? 'vare' : 'varer'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                Ordre #{selectedOrder?.orderNumber}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {/* Customer Info */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>Kundeinformasjon</Text>
                <Text style={{ fontSize: 14, color: colors.text, marginBottom: 6 }}>
                  Navn: {selectedOrder?.user?.firstName}{' '}
                  {selectedOrder?.user?.lastName}
                </Text>
                <Text style={{ fontSize: 14, color: colors.text }}>
                  E-post: {selectedOrder?.user?.email}
                </Text>
              </View>

              {/* Order Items */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>Varer</Text>
                {(selectedOrder?.items ?? []).map((item, index) => (
                  <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.background }}>
                    <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>
                      {(item?.productName ?? 'Ukjent produkt')} x{toNumber(item?.quantity)}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      {formatNOK(toNumber(item?.subtotal))}
                    </Text>
                  </View>
                ))}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>Total:</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                    {formatNOK(selectedOrder?.total)}
                  </Text>
                </View>
              </View>

              {/* Update Status */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>Oppdater status</Text>
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: colors.warning + '20',
                      borderColor: colors.warning,
                      alignItems: 'center',
                    }}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'PENDING')
                    }
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.warning }}>
                      Venter
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: colors.primary + '20',
                      borderColor: colors.primary,
                      alignItems: 'center',
                    }}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'PROCESSING')
                    }
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                      Behandles
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: colors.accent + '20',
                      borderColor: colors.accent,
                      alignItems: 'center',
                    }}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'SHIPPED')
                    }
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>
                      Sendt
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: colors.success + '20',
                      borderColor: colors.success,
                      alignItems: 'center',
                    }}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'DELIVERED')
                    }
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>
                      Levert
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: colors.danger + '20',
                      borderColor: colors.danger,
                      alignItems: 'center',
                    }}
                    onPress={() =>
                      selectedOrder &&
                      updateOrderStatus(selectedOrder.id, 'CANCELLED')
                    }
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.danger }}>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  ordersList: {
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
});
