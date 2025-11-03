import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import Container from '../components/Container';
import type { Order } from '../types';

export default function PurchaseHistoryScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.getOrders();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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
      return orders.filter(
        (order) =>
          order.status.toUpperCase() === 'PENDING' ||
          order.status.toUpperCase() === 'PROCESSING'
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.screenHeader, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <Container>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Kjøpshistorikk</Text>
          </View>
        </Container>
      </View>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <Container>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { borderColor: colors.border, backgroundColor: filter === 'all' ? colors.primary : colors.cardBg },
              filter === 'all' && { borderColor: colors.primary },
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: filter === 'all' ? colors.cardBg : colors.text },
              ]}
            >
              Alle
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { borderColor: colors.border, backgroundColor: filter === 'pending' ? colors.primary : colors.cardBg },
              filter === 'pending' && { borderColor: colors.primary },
            ]}
            onPress={() => setFilter('pending')}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: filter === 'pending' ? colors.cardBg : colors.text },
              ]}
            >
              Aktive
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { borderColor: colors.border, backgroundColor: filter === 'completed' ? colors.primary : colors.cardBg },
              filter === 'completed' && { borderColor: colors.primary },
            ]}
            onPress={() => setFilter('completed')}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: filter === 'completed' ? colors.cardBg : colors.text },
              ]}
            >
              Fullført
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ordersList}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>Ingen bestillinger funnet</Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Shop')}
              >
                <Text style={[styles.emptyButtonText, { color: colors.cardBg }]}>Gå til butikken</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, { backgroundColor: colors.cardBg }]}
                onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                activeOpacity={0.7}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderNumber, { color: colors.text }]}>#{order.orderNumber}</Text>
                    <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                      {formatDate(order.createdAt)}
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

                <View style={[styles.orderItems, { borderTopColor: colors.borderLight }]}>
                  <Text style={[styles.itemsLabel, { color: colors.text }]}>
                    {order.items.length} {order.items.length === 1 ? 'vare' : 'varer'}
                  </Text>
                  <View style={styles.itemsList}>
                    {order.items.slice(0, 3).map((item, index) => (
                      <Text key={index} style={[styles.itemText, { color: colors.textSecondary }]} numberOfLines={1}>
                        • {item.productName} (x{item.quantity})
                      </Text>
                    ))}
                    {order.items.length > 3 && (
                      <Text style={[styles.moreItems, { color: colors.textLight }]}>
                        +{order.items.length - 3} flere
                      </Text>
                    )}
                  </View>
                </View>

                <View style={[styles.orderFooter, { borderTopColor: colors.borderLight }]}>
                  <Text style={[styles.totalLabel, { color: colors.text }]}>Total:</Text>
                  <Text style={[styles.totalAmount, { color: colors.text }]}>
                    {`${order.total.toLocaleString('nb-NO')} kr`}
                  </Text>
                </View>

                <View style={styles.viewDetailsButton}>
                  <Text style={[styles.viewDetailsText, { color: colors.primary }]}>Se detaljer</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </Container>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  screenHeader: {
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ordersList: {
    gap: 16,
    paddingBottom: 24,
  },
  orderCard: {
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
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
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
  orderItems: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  itemsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemsList: {
    gap: 4,
  },
  itemText: {
    fontSize: 14,
  },
  moreItems: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
