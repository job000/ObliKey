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
  TextInput,
  SafeAreaView,
  Platform,
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

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organizationNumber?: string;
  address?: string;
}

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  accountsReceivable: number;
  accountsPayable: number;
}

interface MVAReport {
  id: string;
  period: string;
  year: number;
  totalSales: number;
  totalPurchases: number;
  mvaToReport: number;
  status: string;
  createdAt: string;
}

type TabType = 'dashboard' | 'accounts' | 'transactions' | 'suppliers' | 'mva';

export default function EnhancedAccountingScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Accounts data
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Transactions data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    accountId: '',
    type: 'DEBIT' as 'DEBIT' | 'CREDIT',
  });

  // Suppliers data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    email: '',
    phone: '',
    organizationNumber: '',
    address: '',
  });

  // MVA data
  const [mvaReports, setMvaReports] = useState<MVAReport[]>([]);
  const [currentMVAPeriod, setCurrentMVAPeriod] = useState<any>(null);
  const [showMVAResultModal, setShowMVAResultModal] = useState(false);
  const [mvaCalculationResult, setMvaCalculationResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      switch (activeTab) {
        case 'dashboard':
          await loadDashboard();
          break;
        case 'accounts':
          await loadAccounts();
          break;
        case 'transactions':
          await loadTransactions();
          await loadAccounts(); // Needed for dropdown
          break;
        case 'suppliers':
          await loadSuppliers();
          break;
        case 'mva':
          await loadMVAData();
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Feil', 'Kunne ikke laste data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDashboard = async () => {
    const response = await api.getDashboard();
    if (response.success) {
      setDashboardData(response.data);
    }
  };

  const loadAccounts = async () => {
    const response = await api.getAccounts();
    if (response.success) {
      setAccounts(response.data || []);
    }
  };

  const loadTransactions = async () => {
    const response = await api.getTransactions();
    if (response.success) {
      setTransactions(response.data || []);
    }
  };

  const loadSuppliers = async () => {
    const response = await api.getSuppliers();
    if (response.success) {
      setSuppliers(response.data || []);
    }
  };

  const loadMVAData = async () => {
    const [reportsRes, currentPeriodRes] = await Promise.all([
      api.getMVAReports(),
      api.getCurrentMVAPeriod(),
    ]);

    if (reportsRes.success) {
      setMvaReports(reportsRes.data || []);
    }
    if (currentPeriodRes.success) {
      setCurrentMVAPeriod(currentPeriodRes.data);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.description || !newTransaction.accountId) {
      Alert.alert('Feil', 'Vennligst fyll ut alle felt');
      return;
    }

    try {
      const response = await api.createTransaction({
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        date: new Date().toISOString(),
      });

      if (response.success) {
        Alert.alert('Suksess', 'Transaksjon opprettet');
        setShowTransactionModal(false);
        setNewTransaction({
          amount: '',
          description: '',
          accountId: '',
          type: 'DEBIT',
        });
        loadTransactions();
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke opprette transaksjon');
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name) {
      Alert.alert('Feil', 'Leverandørnavn er påkrevd');
      return;
    }

    try {
      const response = await api.createSupplier(newSupplier);
      if (response.success) {
        Alert.alert('Suksess', 'Leverandør opprettet');
        setShowSupplierModal(false);
        setNewSupplier({
          name: '',
          email: '',
          phone: '',
          organizationNumber: '',
          address: '',
        });
        loadSuppliers();
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke opprette leverandør');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette denne leverandøren?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteSupplier(id);
              Alert.alert('Suksess', 'Leverandør slettet');
              loadSuppliers();
            } catch (error) {
              Alert.alert('Feil', 'Kunne ikke slette leverandør');
            }
          },
        },
      ]
    );
  };

  const handleCalculateMVA = async () => {
    if (!currentMVAPeriod || !currentMVAPeriod.start || !currentMVAPeriod.end) {
      Alert.alert('Feil', 'Ingen MVA-periode funnet');
      return;
    }

    try {
      const response = await api.calculateMVAPeriod({
        startDate: currentMVAPeriod.start,
        endDate: currentMVAPeriod.end,
      });

      if (response.success) {
        setMvaCalculationResult(response.data);
        setShowMVAResultModal(true);
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke beregne MVA');
    }
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

  const renderDashboard = () => {
    if (!dashboardData) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Ingen data tilgjengelig</Text>
        </View>
      );
    }

    const profitMargin = dashboardData.totalIncome > 0
      ? ((dashboardData.netProfit / dashboardData.totalIncome) * 100).toFixed(1)
      : '0.0';

    return (
      <View style={styles.content}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.incomeCard]}>
            <View style={styles.statIcon}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
            </View>
            <Text style={styles.statLabel}>Inntekter</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {formatCurrency(dashboardData.totalIncome)}
            </Text>
          </View>

          <View style={[styles.statCard, styles.expenseCard]}>
            <View style={styles.statIcon}>
              <Ionicons name="trending-down" size={24} color="#EF4444" />
            </View>
            <Text style={styles.statLabel}>Utgifter</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {formatCurrency(dashboardData.totalExpenses)}
            </Text>
          </View>

          <View style={[styles.statCard, styles.profitCard]}>
            <View style={styles.statIcon}>
              <Ionicons name="cash" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statLabel}>Netto Resultat</Text>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>
              {formatCurrency(dashboardData.netProfit)}
            </Text>
            <Text style={styles.statSubtext}>{`Margin: ${profitMargin}%`}</Text>
          </View>

          <View style={[styles.statCard, styles.receivableCard]}>
            <View style={styles.statIcon}>
              <Ionicons name="arrow-down-circle" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statLabel}>Kundefordringer</Text>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {formatCurrency(dashboardData.accountsReceivable)}
            </Text>
          </View>

          <View style={[styles.statCard, styles.payableCard]}>
            <View style={styles.statIcon}>
              <Ionicons name="arrow-up-circle" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.statLabel}>Leverandørgjeld</Text>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
              {formatCurrency(dashboardData.accountsPayable)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAccounts = () => {
    if (accounts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Ingen kontoer funnet</Text>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {accounts.map((account) => (
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
        ))}
      </View>
    );
  };

  const renderTransactions = () => {
    return (
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowTransactionModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>Ny transaksjon</Text>
        </TouchableOpacity>

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
                  color={transaction.type === 'CREDIT' ? '#10B981' : '#EF4444'}
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
    );
  };

  const renderSuppliers = () => {
    return (
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowSupplierModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>Ny leverandør</Text>
        </TouchableOpacity>

        {suppliers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Ingen leverandører funnet</Text>
          </View>
        ) : (
          suppliers.map((supplier) => (
            <View key={supplier.id} style={styles.supplierCard}>
              <View style={styles.supplierHeader}>
                <View style={styles.supplierIconContainer}>
                  <Ionicons name="business" size={24} color="#3B82F6" />
                </View>
                <View style={styles.supplierInfo}>
                  <Text style={styles.supplierName}>{supplier.name}</Text>
                  {supplier.organizationNumber && (
                    <Text style={styles.supplierDetail}>
                      Org.nr: {supplier.organizationNumber}
                    </Text>
                  )}
                  {supplier.email && (
                    <Text style={styles.supplierDetail}>{supplier.email}</Text>
                  )}
                  {supplier.phone && (
                    <Text style={styles.supplierDetail}>{supplier.phone}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSupplier(supplier.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderMVA = () => {
    return (
      <View style={styles.content}>
        {currentMVAPeriod && (
          <View style={styles.currentPeriodCard}>
            <Text style={styles.currentPeriodTitle}>Gjeldende periode</Text>
            <Text style={styles.currentPeriodText}>
              {currentMVAPeriod.period} {currentMVAPeriod.year}
            </Text>
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={handleCalculateMVA}
            >
              <Ionicons name="calculator" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.calculateButtonText}>Beregn MVA</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>MVA-rapporter</Text>

        {mvaReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Ingen MVA-rapporter funnet</Text>
          </View>
        ) : (
          mvaReports.map((report) => (
            <View key={report.id} style={styles.mvaCard}>
              <View style={styles.mvaHeader}>
                <View style={styles.mvaInfo}>
                  <Text style={styles.mvaTitle}>
                    Periode {report.period} - {report.year}
                  </Text>
                  <Text style={styles.mvaDate}>
                    Opprettet: {formatDate(report.createdAt)}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  report.status === 'SUBMITTED' && styles.statusSubmitted,
                  report.status === 'DRAFT' && styles.statusDraft,
                ]}>
                  <Text style={styles.statusText}>{report.status}</Text>
                </View>
              </View>
              <View style={styles.mvaDetails}>
                <View style={styles.mvaRow}>
                  <Text style={styles.mvaLabel}>Salg:</Text>
                  <Text style={styles.mvaValue}>
                    {formatCurrency(report.totalSales)}
                  </Text>
                </View>
                <View style={styles.mvaRow}>
                  <Text style={styles.mvaLabel}>Kjøp:</Text>
                  <Text style={styles.mvaValue}>
                    {formatCurrency(report.totalPurchases)}
                  </Text>
                </View>
                <View style={[styles.mvaRow, styles.mvaTotal]}>
                  <Text style={styles.mvaTotalLabel}>MVA å betale:</Text>
                  <Text style={styles.mvaTotalValue}>
                    {formatCurrency(report.mvaToReport)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
              Komplett økonomioversikt
            </Text>
          </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'dashboard' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Ionicons
              name="analytics"
              size={20}
              color={activeTab === 'dashboard' ? '#FFF' : '#374151'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'dashboard' && styles.tabTextActive,
              ]}
            >
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'accounts' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('accounts')}
          >
            <Ionicons
              name="wallet"
              size={20}
              color={activeTab === 'accounts' ? '#FFF' : '#374151'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'accounts' && styles.tabTextActive,
              ]}
            >
              Kontoer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'transactions' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('transactions')}
          >
            <Ionicons
              name="receipt"
              size={20}
              color={activeTab === 'transactions' ? '#FFF' : '#374151'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'transactions' && styles.tabTextActive,
              ]}
            >
              Transaksjoner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'suppliers' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('suppliers')}
          >
            <Ionicons
              name="business"
              size={20}
              color={activeTab === 'suppliers' ? '#FFF' : '#374151'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'suppliers' && styles.tabTextActive,
              ]}
            >
              Leverandører
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'mva' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('mva')}
          >
            <Ionicons
              name="document-text"
              size={20}
              color={activeTab === 'mva' ? '#FFF' : '#374151'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'mva' && styles.tabTextActive,
              ]}
            >
              MVA
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'accounts' && renderAccounts()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'suppliers' && renderSuppliers()}
        {activeTab === 'mva' && renderMVA()}
      </Container>

      {/* Transaction Modal */}
      <Modal
        visible={showTransactionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTransactionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ny transaksjon</Text>
              <TouchableOpacity onPress={() => setShowTransactionModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Beløp</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={newTransaction.amount}
                onChangeText={(text) =>
                  setNewTransaction({ ...newTransaction, amount: text })
                }
              />

              <Text style={styles.label}>Beskrivelse</Text>
              <TextInput
                style={styles.input}
                placeholder="Beskrivelse av transaksjonen"
                value={newTransaction.description}
                onChangeText={(text) =>
                  setNewTransaction({ ...newTransaction, description: text })
                }
              />

              <Text style={styles.label}>Konto</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      style={[
                        styles.accountOption,
                        newTransaction.accountId === account.id && styles.accountOptionSelected,
                      ]}
                      onPress={() =>
                        setNewTransaction({ ...newTransaction, accountId: account.id })
                      }
                    >
                      <Text
                        style={[
                          styles.accountOptionText,
                          newTransaction.accountId === account.id && styles.accountOptionTextSelected,
                        ]}
                      >
                        {account.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Type</Text>
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newTransaction.type === 'DEBIT' && styles.typeButtonSelected,
                  ]}
                  onPress={() =>
                    setNewTransaction({ ...newTransaction, type: 'DEBIT' })
                  }
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      newTransaction.type === 'DEBIT' && styles.typeButtonTextSelected,
                    ]}
                  >
                    Debet
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newTransaction.type === 'CREDIT' && styles.typeButtonSelected,
                  ]}
                  onPress={() =>
                    setNewTransaction({ ...newTransaction, type: 'CREDIT' })
                  }
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      newTransaction.type === 'CREDIT' && styles.typeButtonTextSelected,
                    ]}
                  >
                    Kredit
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateTransaction}
              >
                <Text style={styles.submitButtonText}>Opprett transaksjon</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Supplier Modal */}
      <Modal
        visible={showSupplierModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSupplierModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ny leverandør</Text>
              <TouchableOpacity onPress={() => setShowSupplierModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Navn *</Text>
              <TextInput
                style={styles.input}
                placeholder="Leverandørnavn"
                value={newSupplier.name}
                onChangeText={(text) =>
                  setNewSupplier({ ...newSupplier, name: text })
                }
              />

              <Text style={styles.label}>E-post</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                keyboardType="email-address"
                value={newSupplier.email}
                onChangeText={(text) =>
                  setNewSupplier({ ...newSupplier, email: text })
                }
              />

              <Text style={styles.label}>Telefon</Text>
              <TextInput
                style={styles.input}
                placeholder="+47 123 45 678"
                keyboardType="phone-pad"
                value={newSupplier.phone}
                onChangeText={(text) =>
                  setNewSupplier({ ...newSupplier, phone: text })
                }
              />

              <Text style={styles.label}>Organisasjonsnummer</Text>
              <TextInput
                style={styles.input}
                placeholder="123456789"
                keyboardType="number-pad"
                value={newSupplier.organizationNumber}
                onChangeText={(text) =>
                  setNewSupplier({ ...newSupplier, organizationNumber: text })
                }
              />

              <Text style={styles.label}>Adresse</Text>
              <TextInput
                style={styles.input}
                placeholder="Gateadresse, postnummer og sted"
                value={newSupplier.address}
                onChangeText={(text) =>
                  setNewSupplier({ ...newSupplier, address: text })
                }
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateSupplier}
              >
                <Text style={styles.submitButtonText}>Opprett leverandør</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 24,
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
  tabsContainer: {
    marginBottom: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
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
  statsGrid: {
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  receivableCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  payableCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
  supplierCard: {
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
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  supplierIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  supplierDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  deleteButton: {
    padding: 8,
  },
  currentPeriodCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  currentPeriodTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  currentPeriodText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
  },
  calculateButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  mvaCard: {
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
  mvaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  mvaInfo: {
    flex: 1,
  },
  mvaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  mvaDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  statusSubmitted: {
    backgroundColor: '#D1FAE5',
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  mvaDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  mvaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mvaLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  mvaValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  mvaTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 4,
  },
  mvaTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  mvaTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
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
    paddingBottom: 40,
    maxHeight: '90%',
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
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  accountOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: '#FFF',
  },
  accountOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  accountOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  accountOptionTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  typeButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  typeButtonTextSelected: {
    color: '#FFF',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
