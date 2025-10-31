import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';
import DateTimePicker from '@react-native-community/datetimepicker';

interface IncomeStatementData {
  period: {
    start: string;
    end: string;
  };
  income: { [key: string]: number };
  expenses: { [key: string]: number };
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export default function ResultatregnskapScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<IncomeStatementData | null>(null);

  // Date range state
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1)); // Start of year
  const [endDate, setEndDate] = useState(new Date()); // Today
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.getIncomeStatement({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error loading income statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Laster resultatregnskap...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const profitMargin = data && data.totalIncome > 0
    ? ((data.netProfit / data.totalIncome) * 100).toFixed(1)
    : '0.0';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container>
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Resultatregnskap</Text>
              <Text style={styles.subtitle}>
                Profit & Loss Statement
              </Text>
            </View>
          </View>

          {/* Date range selector */}
          <View style={styles.dateRangeContainer}>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerSection}>
                <Text style={styles.dateLabel}>Fra dato</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                  <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.datePickerSection}>
                <Text style={styles.dateLabel}>Til dato</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                  <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartDateChange}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
            />
          )}

          {data ? (
            <>
              {/* Summary Cards */}
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, styles.incomeCard]}>
                  <Ionicons name="trending-up" size={28} color="#10B981" />
                  <Text style={styles.summaryLabel}>Inntekter</Text>
                  <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                    {formatCurrency(data.totalIncome)}
                  </Text>
                </View>

                <View style={[styles.summaryCard, styles.expenseCard]}>
                  <Ionicons name="trending-down" size={28} color="#EF4444" />
                  <Text style={styles.summaryLabel}>Kostnader</Text>
                  <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                    {formatCurrency(data.totalExpenses)}
                  </Text>
                </View>

                <View style={[styles.summaryCard, styles.profitCard]}>
                  <Ionicons
                    name={data.netProfit >= 0 ? 'checkmark-circle' : 'alert-circle'}
                    size={28}
                    color={data.netProfit >= 0 ? '#3B82F6' : '#F59E0B'}
                  />
                  <Text style={styles.summaryLabel}>Netto Resultat</Text>
                  <Text style={[
                    styles.summaryValue,
                    { color: data.netProfit >= 0 ? '#3B82F6' : '#F59E0B' }
                  ]}>
                    {formatCurrency(data.netProfit)}
                  </Text>
                  <Text style={styles.summarySubtext}>Margin: {profitMargin}%</Text>
                </View>
              </View>

              {/* Income Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="add-circle" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.sectionTitle}>Inntekter</Text>
                </View>

                {Object.keys(data.income).length > 0 ? (
                  <>
                    {Object.entries(data.income).map(([accountName, amount]) => (
                      <View key={accountName} style={styles.lineItem}>
                        <Text style={styles.lineItemName}>{accountName}</Text>
                        <Text style={[styles.lineItemAmount, { color: '#10B981' }]}>
                          {formatCurrency(amount)}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>Sum inntekter</Text>
                      <Text style={[styles.subtotalAmount, { color: '#10B981' }]}>
                        {formatCurrency(data.totalIncome)}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptySection}>
                    <Ionicons name="information-circle-outline" size={32} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Ingen inntekter i denne perioden</Text>
                  </View>
                )}
              </View>

              {/* Expenses Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="remove-circle" size={24} color="#EF4444" />
                  </View>
                  <Text style={styles.sectionTitle}>Kostnader</Text>
                </View>

                {Object.keys(data.expenses).length > 0 ? (
                  <>
                    {Object.entries(data.expenses).map(([accountName, amount]) => (
                      <View key={accountName} style={styles.lineItem}>
                        <Text style={styles.lineItemName}>{accountName}</Text>
                        <Text style={[styles.lineItemAmount, { color: '#EF4444' }]}>
                          {formatCurrency(amount)}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>Sum kostnader</Text>
                      <Text style={[styles.subtotalAmount, { color: '#EF4444' }]}>
                        {formatCurrency(data.totalExpenses)}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptySection}>
                    <Ionicons name="information-circle-outline" size={32} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Ingen kostnader i denne perioden</Text>
                  </View>
                )}
              </View>

              {/* Net Result Section */}
              <View style={[
                styles.netResultCard,
                data.netProfit >= 0 ? styles.netResultPositive : styles.netResultNegative
              ]}>
                <View style={styles.netResultHeader}>
                  <Ionicons
                    name={data.netProfit >= 0 ? 'trending-up' : 'trending-down'}
                    size={32}
                    color={data.netProfit >= 0 ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.netResultLabel}>
                    {data.netProfit >= 0 ? 'Overskudd' : 'Underskudd'}
                  </Text>
                </View>
                <Text style={[
                  styles.netResultAmount,
                  { color: data.netProfit >= 0 ? '#10B981' : '#EF4444' }
                ]}>
                  {formatCurrency(Math.abs(data.netProfit))}
                </Text>
                <Text style={styles.netResultSubtext}>
                  Resultatmargin: {profitMargin}%
                </Text>
              </View>

              {/* Bottom spacer */}
              <View style={styles.bottomSpacer} />
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyMainText}>Ingen data tilgjengelig</Text>
              <Text style={styles.emptySubtext}>
                Velg en periode for å se resultatregnskapet
              </Text>
            </View>
          )}
        </Container>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 24,
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  dateRangeContainer: {
    marginBottom: 24,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerSection: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  summaryGrid: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  incomeCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#10B981',
  },
  expenseCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444',
  },
  profitCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#3B82F6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: -0.3,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lineItemName: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  lineItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
  },
  netResultCard: {
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  netResultPositive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  netResultNegative: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  netResultHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  netResultLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  netResultAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: -1,
    marginBottom: 8,
  },
  netResultSubtext: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: 32,
  },
  emptyMainText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
