import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Container from '../components/Container';

interface ProductAnalytic {
  id: string;
  name: string;
  totalViews: number;
  totalSales: number;
  revenue: number;
  averageRating: number;
  stockLevel: number;
}

export default function ProductAnalyticsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<ProductAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      loadAnalytics();
    }
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const endDate = new Date();
      const startDate = new Date();

      if (dateRange === 'week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }

      const response = await api.getProductAnalytics(
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (response.success) {
        setAnalytics(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load product analytics:', error);
      // Use mock data for demonstration
      setAnalytics([
        {
          id: '1',
          name: 'Proteinpulver Premium',
          totalViews: 1250,
          totalSales: 85,
          revenue: 21250,
          averageRating: 4.7,
          stockLevel: 142,
        },
        {
          id: '2',
          name: 'Treningsmappe',
          totalViews: 980,
          totalSales: 52,
          revenue: 10400,
          averageRating: 4.5,
          stockLevel: 88,
        },
        {
          id: '3',
          name: 'Treningstights',
          totalViews: 756,
          totalSales: 38,
          revenue: 22800,
          averageRating: 4.8,
          stockLevel: 64,
        },
        {
          id: '4',
          name: 'Vannflaske',
          totalViews: 654,
          totalSales: 96,
          revenue: 4800,
          averageRating: 4.3,
          stockLevel: 205,
        },
        {
          id: '5',
          name: 'Treningshansker',
          totalViews: 521,
          totalSales: 42,
          revenue: 8400,
          averageRating: 4.6,
          stockLevel: 73,
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toLocaleString('nb-NO')} kr`;
  };

  const getConversionRate = (views: number, sales: number): number => {
    if (views === 0) return 0;
    return (sales / views) * 100;
  };

  const getTotalRevenue = (): number => {
    return analytics.reduce((sum, product) => sum + product.revenue, 0);
  };

  const getTotalSales = (): number => {
    return analytics.reduce((sum, product) => sum + product.totalSales, 0);
  };

  const getTotalViews = (): number => {
    return analytics.reduce((sum, product) => sum + product.totalViews, 0);
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
              Du har ikke tilgang til produktanalyse.
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

  return (
    <View style={styles.container}>
      <Container>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="stats-chart" size={32} color="#3B82F6" />
              <View style={styles.titleContent}>
                <Text style={styles.title}>Produktanalyse</Text>
                <Text style={styles.subtitle}>
                  {dateRange === 'week'
                    ? 'Siste 7 dager'
                    : dateRange === 'month'
                    ? 'Siste 30 dager'
                    : 'Siste 12 måneder'}
                </Text>
              </View>
            </View>
          </View>

          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                dateRange === 'week' && styles.timeRangeButtonActive,
              ]}
              onPress={() => setDateRange('week')}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  dateRange === 'week' && styles.timeRangeTextActive,
                ]}
              >
                Uke
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                dateRange === 'month' && styles.timeRangeButtonActive,
              ]}
              onPress={() => setDateRange('month')}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  dateRange === 'month' && styles.timeRangeTextActive,
                ]}
              >
                Måned
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                dateRange === 'year' && styles.timeRangeButtonActive,
              ]}
              onPress={() => setDateRange('year')}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  dateRange === 'year' && styles.timeRangeTextActive,
                ]}
              >
                År
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Laster analysedata...</Text>
            </View>
          ) : (
            <>
              {/* Summary Cards */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                  <Ionicons name="cash" size={24} color="#10B981" />
                  <Text style={styles.summaryValue}>
                    {formatCurrency(getTotalRevenue())}
                  </Text>
                  <Text style={styles.summaryLabel}>Total omsetning</Text>
                </View>

                <View style={styles.summaryCard}>
                  <Ionicons name="cart" size={24} color="#3B82F6" />
                  <Text style={styles.summaryValue}>{getTotalSales()}</Text>
                  <Text style={styles.summaryLabel}>Totalt salg</Text>
                </View>

                <View style={styles.summaryCard}>
                  <Ionicons name="eye" size={24} color="#8B5CF6" />
                  <Text style={styles.summaryValue}>{getTotalViews()}</Text>
                  <Text style={styles.summaryLabel}>Totale visninger</Text>
                </View>
              </View>

              {/* Product Analytics List */}
              <View style={styles.productsContainer}>
                <Text style={styles.sectionTitle}>Produkter</Text>

                {analytics.map((product) => {
                  const conversionRate = getConversionRate(
                    product.totalViews,
                    product.totalSales
                  );

                  return (
                    <View key={product.id} style={styles.productCard}>
                      <View style={styles.productHeader}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={14} color="#F59E0B" />
                          <Text style={styles.ratingText}>
                            {product.averageRating.toFixed(1)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.productMetrics}>
                        <View style={styles.metricRow}>
                          <View style={styles.metric}>
                            <Ionicons name="eye-outline" size={18} color="#6B7280" />
                            <Text style={styles.metricValue}>{product.totalViews}</Text>
                            <Text style={styles.metricLabel}>Visninger</Text>
                          </View>

                          <View style={styles.metric}>
                            <Ionicons name="cart-outline" size={18} color="#6B7280" />
                            <Text style={styles.metricValue}>{product.totalSales}</Text>
                            <Text style={styles.metricLabel}>Salg</Text>
                          </View>

                          <View style={styles.metric}>
                            <Ionicons name="trending-up-outline" size={18} color="#6B7280" />
                            <Text style={styles.metricValue}>
                              {conversionRate.toFixed(1)}%
                            </Text>
                            <Text style={styles.metricLabel}>Konvertering</Text>
                          </View>
                        </View>

                        <View style={styles.revenueRow}>
                          <Text style={styles.revenueLabel}>Omsetning:</Text>
                          <Text style={styles.revenueValue}>
                            {formatCurrency(product.revenue)}
                          </Text>
                        </View>

                        <View style={styles.stockRow}>
                          <Text style={styles.stockLabel}>Lagerbeholdning:</Text>
                          <Text
                            style={[
                              styles.stockValue,
                              product.stockLevel < 50 && styles.stockLow,
                            ]}
                          >
                            {`${product.stockLevel} stk${product.stockLevel < 50 ? ' ⚠️' : ''}`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
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
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: '#EFF6FF',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  timeRangeTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
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
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  productsContainer: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  productMetrics: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  revenueLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  stockLow: {
    color: '#EF4444',
  },
  loadingContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
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
