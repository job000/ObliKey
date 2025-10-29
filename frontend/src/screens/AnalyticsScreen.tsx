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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';

interface AnalyticsData {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    avgValue: number;
  };
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  classes: {
    total: number;
    avgAttendance: number;
    totalBookings: number;
  };
  ptSessions: {
    total: number;
    completed: number;
    scheduled: number;
  };
}

export default function AnalyticsScreen({ navigation }: any) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.getAnalytics(timeRange);
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Mock data for demonstration
      setData({
        revenue: {
          total: 450000,
          thisMonth: 85000,
          lastMonth: 72000,
          growth: 18,
        },
        orders: {
          total: 234,
          pending: 12,
          completed: 198,
          avgValue: 1923,
        },
        users: {
          total: 156,
          active: 124,
          newThisMonth: 18,
        },
        classes: {
          total: 48,
          avgAttendance: 85,
          totalBookings: 412,
        },
        ptSessions: {
          total: 89,
          completed: 67,
          scheduled: 22,
        },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('nb-NO') + ' kr';
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Kunne ikke laste analysedata</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Container>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Rapporter & Analyse</Text>
            <Text style={styles.subtitle}>Se statistikk og rapporter</Text>
          </View>
        </View>

        {/* Time Range Filter */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === 'week' && styles.timeRangeButtonActive,
            ]}
            onPress={() => setTimeRange('week')}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === 'week' && styles.timeRangeTextActive,
              ]}
            >
              Uke
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === 'month' && styles.timeRangeButtonActive,
            ]}
            onPress={() => setTimeRange('month')}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === 'month' && styles.timeRangeTextActive,
              ]}
            >
              Måned
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === 'year' && styles.timeRangeButtonActive,
            ]}
            onPress={() => setTimeRange('year')}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === 'year' && styles.timeRangeTextActive,
              ]}
            >
              År
            </Text>
          </TouchableOpacity>
        </View>

        {/* Revenue Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Omsetning</Text>
          <View style={styles.revenueCard}>
            <View style={styles.revenueMain}>
              <Text style={styles.revenueLabel}>Total omsetning</Text>
              <Text style={styles.revenueValue}>
                {formatCurrency(data.revenue.total)}
              </Text>
            </View>

            <View style={styles.revenueStats}>
              <View style={styles.revenueStat}>
                <Text style={styles.revenueStatLabel}>Denne måneden</Text>
                <Text style={styles.revenueStatValue}>
                  {formatCurrency(data.revenue.thisMonth)}
                </Text>
              </View>

              <View style={styles.revenueStat}>
                <Text style={styles.revenueStatLabel}>Forrige måned</Text>
                <Text style={styles.revenueStatValue}>
                  {formatCurrency(data.revenue.lastMonth)}
                </Text>
              </View>

              <View style={styles.revenueStat}>
                <Text style={styles.revenueStatLabel}>Vekst</Text>
                <View style={styles.growthContainer}>
                  <Ionicons
                    name={
                      data.revenue.growth >= 0
                        ? 'trending-up'
                        : 'trending-down'
                    }
                    size={20}
                    color={data.revenue.growth >= 0 ? '#10B981' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.growthValue,
                      {
                        color:
                          data.revenue.growth >= 0 ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    {formatPercentage(data.revenue.growth)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nøkkeltall</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="cart-outline" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.metricValue}>{data.orders.total}</Text>
              <Text style={styles.metricLabel}>Bestillinger</Text>
              <View style={styles.metricDetail}>
                <Text style={styles.metricDetailText}>
                  {data.orders.pending} ventende
                </Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="people-outline" size={28} color="#8B5CF6" />
              </View>
              <Text style={styles.metricValue}>{data.users.active}</Text>
              <Text style={styles.metricLabel}>Aktive brukere</Text>
              <View style={styles.metricDetail}>
                <Text style={styles.metricDetailText}>
                  +{data.users.newThisMonth} nye
                </Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#FCE7F3' }]}>
                <Ionicons name="calendar-outline" size={28} color="#EC4899" />
              </View>
              <Text style={styles.metricValue}>{data.classes.totalBookings}</Text>
              <Text style={styles.metricLabel}>Klassebookinger</Text>
              <View style={styles.metricDetail}>
                <Text style={styles.metricDetailText}>
                  {data.classes.avgAttendance}% fremmøte
                </Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="barbell-outline" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.metricValue}>{data.ptSessions.completed}</Text>
              <Text style={styles.metricLabel}>PT-økter</Text>
              <View style={styles.metricDetail}>
                <Text style={styles.metricDetailText}>
                  {data.ptSessions.scheduled} planlagt
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Orders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bestillinger</Text>
          <View style={styles.ordersCard}>
            <View style={styles.orderRow}>
              <View style={styles.orderInfo}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.orderLabel}>Fullførte</Text>
              </View>
              <Text style={styles.orderValue}>{data.orders.completed}</Text>
            </View>

            <View style={styles.orderRow}>
              <View style={styles.orderInfo}>
                <Ionicons name="time" size={24} color="#F59E0B" />
                <Text style={styles.orderLabel}>Ventende</Text>
              </View>
              <Text style={styles.orderValue}>{data.orders.pending}</Text>
            </View>

            <View style={styles.orderRow}>
              <View style={styles.orderInfo}>
                <Ionicons name="cash" size={24} color="#3B82F6" />
                <Text style={styles.orderLabel}>Gjennomsnitt verdi</Text>
              </View>
              <Text style={styles.orderValue}>
                {formatCurrency(data.orders.avgValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rapporter</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('OrdersManagement')}
            >
              <Ionicons name="document-text-outline" size={32} color="#3B82F6" />
              <Text style={styles.actionText}>Salgsrapport</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('UserManagement')}
            >
              <Ionicons name="people-outline" size={32} color="#8B5CF6" />
              <Text style={styles.actionText}>Brukerrapport</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('ClassManagement')}
            >
              <Ionicons name="bar-chart-outline" size={32} color="#EC4899" />
              <Text style={styles.actionText}>Klasserapport</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('ProductsManagement')}
            >
              <Ionicons name="cube-outline" size={32} color="#10B981" />
              <Text style={styles.actionText}>Produktrapport</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Container>
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
  errorText: {
    fontSize: 16,
    color: '#6B7280',
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
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  timeRangeTextActive: {
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  revenueCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  revenueMain: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  revenueLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  revenueStats: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  revenueStat: {
    flex: 1,
  },
  revenueStatLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  revenueStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  growthValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
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
  metricIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  metricDetail: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metricDetailText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  ordersCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  orderValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? '23%' : '47%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
});
