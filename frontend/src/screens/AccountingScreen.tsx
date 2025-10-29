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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';
import { useAuth } from '../contexts/AuthContext';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description: string;
  date: string;
  accountId: string;
  account?: Account;
}

export default function AccountingScreen({ navigation }: any) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions'>('accounts');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, transactionsRes] = await Promise.all([
        api.getAccounts(),
        api.getTransactions(),
      ]);

      if (accountsRes.success) {
        setAccounts(accountsRes.data || []);
      }

      if (transactionsRes.success) {
        setTransactions(transactionsRes.data || []);
      }
    } catch (error) {
      console.error('Failed to load accounting data:', error);
      Alert.alert('Feil', 'Kunne ikke laste regnskapsdata');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (amount: number | undefined | null, currency: string = 'NOK') => {
    if (amount === undefined || amount === null) return `0 ${currency}`;
    return `${amount.toLocaleString('nb-NO')} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
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
          <Text style={styles.title}>Regnskap</Text>
          <Text style={styles.subtitle}>
            Oversikt over kontoer og transaksjoner
          </Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="wallet" size={32} color="#3B82F6" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Saldo</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(getTotalBalance())}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'accounts' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('accounts')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'accounts' && styles.tabTextActive,
              ]}
            >
              Kontoer ({accounts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'transactions' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('transactions')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'transactions' && styles.tabTextActive,
              ]}
            >
              Transaksjoner ({transactions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Accounts View */}
        {activeTab === 'accounts' && (
          <View style={styles.content}>
            {accounts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Ingen kontoer funnet</Text>
              </View>
            ) : (
              accounts.map((account) => (
                <View key={account.id} style={styles.accountCard}>
                  <View style={styles.accountHeader}>
                    <View style={styles.accountIconContainer}>
                      <Ionicons name="card" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountType}>{account.type}</Text>
                    </View>
                    <View style={styles.accountBalanceContainer}>
                      <Text
                        style={[
                          styles.accountBalance,
                          account.balance < 0 && styles.negativeBalance,
                        ]}
                      >
                        {formatCurrency(account.balance, account.currency)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Transactions View */}
        {activeTab === 'transactions' && (
          <View style={styles.content}>
            {transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Ingen transaksjoner funnet</Text>
              </View>
            ) : (
              transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={
                        transaction.type === 'CREDIT'
                          ? 'arrow-down-circle'
                          : 'arrow-up-circle'
                      }
                      size={24}
                      color={
                        transaction.type === 'CREDIT' ? '#10B981' : '#EF4444'
                      }
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.date)}
                    </Text>
                  </View>
                  <View style={styles.transactionAmountContainer}>
                    <Text
                      style={[
                        styles.transactionAmount,
                        transaction.type === 'CREDIT'
                          ? styles.creditAmount
                          : styles.debitAmount,
                      ]}
                    >
                      {`${transaction.type === 'CREDIT' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}`}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tabTextActive: {
    color: '#FFF',
  },
  content: {
    paddingBottom: 24,
  },
  accountCard: {
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
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 12,
    color: '#6B7280',
  },
  accountBalanceContainer: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  negativeBalance: {
    color: '#EF4444',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  transactionIcon: {
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  creditAmount: {
    color: '#10B981',
  },
  debitAmount: {
    color: '#EF4444',
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
});
