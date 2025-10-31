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
  KeyboardAvoidingView,
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
  type: 'INCOME' | 'EXPENSE';
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
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
  });

  // Suppliers data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
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
  const [mvaReportNotes, setMvaReportNotes] = useState('');

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
        type: newTransaction.type,
        accountId: newTransaction.accountId,
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount),
        transactionDate: new Date().toISOString(),
      });

      if (response.success) {
        Alert.alert('Suksess', 'Transaksjon opprettet');
        setShowTransactionModal(false);
        setNewTransaction({
          amount: '',
          description: '',
          accountId: '',
          type: 'EXPENSE',
        });
        loadTransactions();
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Kunne ikke opprette transaksjon';
      Alert.alert('Feil', errorMsg);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name) {
      Alert.alert('Feil', 'Leverandørnavn er påkrevd');
      return;
    }

    try {
      if (editingSupplier) {
        // Update existing supplier
        const response = await api.updateSupplier(editingSupplier, newSupplier);
        if (response.success) {
          Alert.alert('Suksess', 'Leverandør oppdatert');
          setShowSupplierModal(false);
          setEditingSupplier(null);
          setNewSupplier({
            name: '',
            email: '',
            phone: '',
            organizationNumber: '',
            address: '',
          });
          loadSuppliers();
        }
      } else {
        // Create new supplier
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
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke lagre leverandør');
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

        {/* Quick Actions / Reports Section */}
        <View style={styles.reportsSection}>
          <Text style={styles.reportsSectionTitle}>Rapporter</Text>
          <Text style={styles.reportsSectionSubtitle}>
            Detaljerte økonomiske rapporter og analyser
          </Text>

          <View style={styles.reportsGrid}>
            <TouchableOpacity
              style={styles.reportCard}
              onPress={() => navigation.navigate('Resultatregnskap')}
            >
              <View style={[styles.reportIconContainer, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="stats-chart" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.reportTitle}>Resultatregnskap</Text>
              <Text style={styles.reportDescription}>
                Profit & Loss statement med detaljert inntekts- og kostnadsoversikt
              </Text>
              <View style={styles.reportArrow}>
                <Ionicons name="arrow-forward" size={20} color="#3B82F6" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reportCard, styles.reportCardDisabled]}
              disabled={true}
            >
              <View style={[styles.reportIconContainer, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="document-text" size={28} color="#9CA3AF" />
              </View>
              <Text style={[styles.reportTitle, { color: '#9CA3AF' }]}>Balanse</Text>
              <Text style={[styles.reportDescription, { color: '#D1D5DB' }]}>
                Balance sheet - Kommer snart
              </Text>
              <View style={styles.reportArrow}>
                <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleInitializeAccounts = async () => {
    try {
      Alert.alert(
        'Initialiser norsk kontoplan',
        'Dette vil opprette standard norske kontoer basert på NS 4102. Ønsker du å fortsette?',
        [
          { text: 'Avbryt', style: 'cancel' },
          {
            text: 'Initialiser',
            onPress: async () => {
              const response = await api.seedNorwegianAccounts();
              if (response.success) {
                Alert.alert('Suksess', 'Norsk kontoplan initialisert');
                loadAccounts();
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke initialisere kontoplan');
    }
  };

  const renderAccounts = () => {
    return (
      <View style={styles.content}>
        {accounts.length < 50 && (
          <TouchableOpacity
            style={styles.initAccountsButton}
            onPress={handleInitializeAccounts}
          >
            <Ionicons name="cloud-download-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.initAccountsButtonText}>
              Initialiser norsk kontoplan (NS 4102)
            </Text>
          </TouchableOpacity>
        )}

        {accounts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Ingen kontoer funnet</Text>
            <Text style={styles.emptySubtext}>
              Trykk på knappen ovenfor for å initialisere norsk kontoplan
            </Text>
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
                    transaction.type === 'INCOME'
                      ? 'arrow-down-circle'
                      : 'arrow-up-circle'
                  }
                  size={24}
                  color={transaction.type === 'INCOME' ? '#10B981' : '#EF4444'}
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
                    transaction.type === 'INCOME'
                      ? styles.creditAmount
                      : styles.debitAmount,
                  ]}
                >
                  {`${transaction.type === 'INCOME' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}`}
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
            <TouchableOpacity
              key={supplier.id}
              style={styles.supplierCard}
              onPress={() => {
                setEditingSupplier(supplier.id);
                setNewSupplier({
                  name: supplier.name,
                  email: supplier.email || '',
                  phone: supplier.phone || '',
                  organizationNumber: supplier.organizationNumber || '',
                  address: supplier.address || '',
                });
                setShowSupplierModal(true);
              }}
            >
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
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteSupplier(supplier.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
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
            <TouchableOpacity
              key={report.id}
              style={styles.mvaCard}
              onPress={() => {
                if (report.status === 'DRAFT') {
                  Alert.alert(
                    'MVA-rapport (utkast)',
                    'Vil du redigere dette utkastet?',
                    [
                      { text: 'Avbryt', style: 'cancel' },
                      {
                        text: 'Åpne for redigering',
                        onPress: async () => {
                          // Recalculate MVA for this period to allow editing
                          try {
                            // Calculate correct dates based on current period
                            if (!currentMVAPeriod) {
                              Alert.alert('Feil', 'Ingen gjeldende MVA-periode funnet');
                              return;
                            }

                            const response = await api.calculateMVAPeriod({
                              startDate: currentMVAPeriod.start,
                              endDate: currentMVAPeriod.end,
                            });
                            if (response.success) {
                              setMvaCalculationResult(response.data);
                              setShowMVAResultModal(true);
                            }
                          } catch (error: any) {
                            const errorMsg = error.response?.data?.error || 'Kunne ikke laste MVA-rapport';
                            console.error('MVA load error:', error);
                            Alert.alert('Feil', errorMsg);
                          }
                        }
                      }
                    ]
                  );
                } else {
                  Alert.alert(
                    'MVA-rapport',
                    `Denne rapporten er allerede sendt inn og kan ikke redigeres.\n\nPeriode: ${report.period}/${report.year}\nStatus: ${report.status}`
                  );
                }
              }}
              activeOpacity={0.7}
            >
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
              {report.status === 'DRAFT' && (
                <View style={styles.draftHint}>
                  <Ionicons name="create-outline" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.draftHintText}>Trykk for å redigere</Text>
                </View>
              )}
            </TouchableOpacity>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ny transaksjon</Text>
              <TouchableOpacity onPress={() => setShowTransactionModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
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
                    newTransaction.type === 'EXPENSE' && styles.typeButtonSelected,
                  ]}
                  onPress={() =>
                    setNewTransaction({ ...newTransaction, type: 'EXPENSE' })
                  }
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      newTransaction.type === 'EXPENSE' && styles.typeButtonTextSelected,
                    ]}
                  >
                    Utgift
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newTransaction.type === 'INCOME' && styles.typeButtonSelected,
                  ]}
                  onPress={() =>
                    setNewTransaction({ ...newTransaction, type: 'INCOME' })
                  }
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      newTransaction.type === 'INCOME' && styles.typeButtonTextSelected,
                    ]}
                  >
                    Inntekt
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateTransaction}
              >
                <Text style={styles.submitButtonText}>Opprett transaksjon</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Supplier Modal */}
      <Modal
        visible={showSupplierModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowSupplierModal(false);
          setEditingSupplier(null);
          setNewSupplier({
            name: '',
            email: '',
            phone: '',
            organizationNumber: '',
            address: '',
          });
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSupplier ? 'Rediger leverandør' : 'Ny leverandør'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowSupplierModal(false);
                setEditingSupplier(null);
                setNewSupplier({
                  name: '',
                  email: '',
                  phone: '',
                  organizationNumber: '',
                  address: '',
                });
              }}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
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
                <Text style={styles.submitButtonText}>
                  {editingSupplier ? 'Oppdater leverandør' : 'Opprett leverandør'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MVA Result Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMVAResultModal}
        onRequestClose={() => setShowMVAResultModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.mvaModalOverlay}
        >
          <View style={styles.mvaModalContent}>
            <View style={styles.mvaModalHeader}>
              <Text style={styles.mvaModalTitle}>MVA-beregning</Text>
              <TouchableOpacity onPress={() => {
                setShowMVAResultModal(false);
                setMvaReportNotes('');
              }}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {mvaCalculationResult && (
              <ScrollView style={styles.mvaModalBody}>
                {/* Period Info */}
                <View style={styles.mvaSection}>
                  <Text style={styles.mvaSectionTitle}>Periode</Text>
                  <Text style={styles.mvaText}>
                    {currentMVAPeriod ? (
                      `${new Date(currentMVAPeriod.start).toLocaleDateString('nb-NO')} - ${new Date(currentMVAPeriod.end).toLocaleDateString('nb-NO')}`
                    ) : (
                      mvaCalculationResult.period?.start && mvaCalculationResult.period?.end ? (
                        `${new Date(mvaCalculationResult.period.start).toLocaleDateString('nb-NO')} - ${new Date(mvaCalculationResult.period.end).toLocaleDateString('nb-NO')}`
                      ) : 'Periode ikke tilgjengelig'
                    )}
                  </Text>
                </View>

                {/* Utgående MVA (Sales) */}
                <View style={styles.mvaSection}>
                  <Text style={styles.mvaSectionTitle}>Utgående MVA (Salg)</Text>
                  <View style={styles.mvaRow}>
                    <Text style={styles.mvaLabel}>25% MVA</Text>
                    <Text style={styles.mvaAmount}>
                      {formatCurrency(mvaCalculationResult.outgoingVAT?.high || 0)}
                    </Text>
                  </View>
                  <View style={styles.mvaRow}>
                    <Text style={styles.mvaLabel}>15% MVA</Text>
                    <Text style={styles.mvaAmount}>
                      {formatCurrency(mvaCalculationResult.outgoingVAT?.medium || 0)}
                    </Text>
                  </View>
                  <View style={styles.mvaRow}>
                    <Text style={styles.mvaLabel}>12% MVA</Text>
                    <Text style={styles.mvaAmount}>
                      {formatCurrency(mvaCalculationResult.outgoingVAT?.low || 0)}
                    </Text>
                  </View>
                  <View style={[styles.mvaRow, styles.mvaTotalRow]}>
                    <Text style={styles.mvaTotalLabel}>Sum utgående MVA</Text>
                    <Text style={styles.mvaTotalAmount}>
                      {formatCurrency(mvaCalculationResult.outgoingVAT?.total || 0)}
                    </Text>
                  </View>
                </View>

                {/* Inngående MVA (Purchases) */}
                <View style={styles.mvaSection}>
                  <Text style={styles.mvaSectionTitle}>Inngående MVA (Kjøp)</Text>
                  <View style={styles.mvaRow}>
                    <Text style={styles.mvaLabel}>25% MVA</Text>
                    <Text style={styles.mvaAmount}>
                      {formatCurrency(mvaCalculationResult.incomingVAT?.high || 0)}
                    </Text>
                  </View>
                  <View style={styles.mvaRow}>
                    <Text style={styles.mvaLabel}>15% MVA</Text>
                    <Text style={styles.mvaAmount}>
                      {formatCurrency(mvaCalculationResult.incomingVAT?.medium || 0)}
                    </Text>
                  </View>
                  <View style={styles.mvaRow}>
                    <Text style={styles.mvaLabel}>12% MVA</Text>
                    <Text style={styles.mvaAmount}>
                      {formatCurrency(mvaCalculationResult.incomingVAT?.low || 0)}
                    </Text>
                  </View>
                  <View style={[styles.mvaRow, styles.mvaTotalRow]}>
                    <Text style={styles.mvaTotalLabel}>Sum inngående MVA</Text>
                    <Text style={styles.mvaTotalAmount}>
                      {formatCurrency(mvaCalculationResult.incomingVAT?.total || 0)}
                    </Text>
                  </View>
                </View>

                {/* Net MVA */}
                <View style={[styles.mvaSection, styles.mvaNetSection]}>
                  <View style={styles.mvaNetRow}>
                    <Text style={styles.mvaNetLabel}>
                      {(mvaCalculationResult.netVAT || 0) >= 0 ? 'MVA å betale' : 'MVA til gode'}
                    </Text>
                    <Text style={[
                      styles.mvaNetAmount,
                      (mvaCalculationResult.netVAT || 0) >= 0 ? styles.mvaNetPositive : styles.mvaNetNegative
                    ]}>
                      {formatCurrency(Math.abs(mvaCalculationResult.netVAT || 0))}
                    </Text>
                  </View>
                </View>

                {/* Notes/Comments Section */}
                <View style={styles.mvaSection}>
                  <Text style={styles.mvaSectionTitle}>Notater / Kommentarer</Text>
                  <Text style={styles.mvaText}>
                    Legg til eventuelle notater, justeringer eller forklaringer (valgfritt)
                  </Text>
                  <TextInput
                    style={styles.mvaNotesInput}
                    placeholder="Skriv notater her..."
                    value={mvaReportNotes}
                    onChangeText={setMvaReportNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.mvaButtonContainer}>
                  <TouchableOpacity
                    style={styles.mvaSaveButton}
                    onPress={async () => {
                      if (!currentMVAPeriod || !currentMVAPeriod.start || !currentMVAPeriod.end) {
                        Alert.alert('Feil', 'Ingen MVA-periode funnet');
                        return;
                      }
                      try {
                        const response = await api.saveMVAReport({
                          startDate: currentMVAPeriod.start,
                          endDate: currentMVAPeriod.end,
                          submit: false,
                          notes: mvaReportNotes || undefined
                        });
                        if (response.success) {
                          Alert.alert('Suksess', 'MVA-rapport lagret som utkast');
                          setShowMVAResultModal(false);
                          setMvaReportNotes('');
                          loadMVAData();
                        }
                      } catch (error: any) {
                        const errorMsg = error.response?.data?.error || 'Kunne ikke lagre MVA-rapport';
                        Alert.alert('Feil', errorMsg);
                      }
                    }}
                  >
                    <Ionicons name="save-outline" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                    <Text style={styles.mvaSaveButtonText}>Lagre som utkast</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mvaSubmitButton}
                    onPress={async () => {
                      if (!currentMVAPeriod || !currentMVAPeriod.start || !currentMVAPeriod.end) {
                        Alert.alert('Feil', 'Ingen MVA-periode funnet');
                        return;
                      }
                      try {
                        const response = await api.saveMVAReport({
                          startDate: currentMVAPeriod.start,
                          endDate: currentMVAPeriod.end,
                          submit: true,
                          notes: mvaReportNotes || undefined
                        });
                        if (response.success) {
                          Alert.alert('Suksess', 'MVA-rapport lagret og markert for innsending');
                          setShowMVAResultModal(false);
                          setMvaReportNotes('');
                          loadMVAData();
                        }
                      } catch (error: any) {
                        const errorMsg = error.response?.data?.error || 'Kunne ikke lagre MVA-rapport';
                        Alert.alert('Feil', errorMsg);
                      }
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.mvaSubmitButtonText}>Lagre rapport</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabsContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  content: {
    paddingBottom: 32,
  },
  statsGrid: {
    marginBottom: 20,
    gap: 16,
  },
  statCard: {
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
  },
  statIcon: {
    marginBottom: 16,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  statSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
    fontWeight: '500',
  },
  incomeCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#10B981',
    backgroundColor: '#FEFFFE',
  },
  expenseCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444',
    backgroundColor: '#FFFEFE',
  },
  profitCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#3B82F6',
    backgroundColor: '#FEFEFF',
  },
  receivableCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFFFE',
  },
  payableCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#8B5CF6',
    backgroundColor: '#FEFFFE',
  },
  accountCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  accountType: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  accountBalanceContainer: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#10B981',
    letterSpacing: -0.3,
  },
  negativeBalance: {
    color: '#EF4444',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    paddingVertical: 72,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 17,
    color: '#6B7280',
    marginTop: 20,
    fontWeight: '600',
    textAlign: 'center',
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
  // MVA Result Modal Styles
  mvaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mvaModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  mvaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mvaModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  mvaModalBody: {
    padding: 20,
  },
  mvaSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  mvaSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  mvaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  mvaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  mvaLabel: {
    fontSize: 14,
    color: '#374151',
  },
  mvaAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  mvaTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D1D5DB',
  },
  mvaTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  mvaTotalAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  mvaNetSection: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  mvaNetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mvaNetLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  mvaNetAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  mvaNetPositive: {
    color: '#DC2626',
  },
  mvaNetNegative: {
    color: '#10B981',
  },
  mvaButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  mvaSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
  },
  mvaSaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  mvaSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
  },
  mvaSubmitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  initAccountsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  initAccountsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  reportsSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  reportsSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  reportsSectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    fontWeight: '500',
  },
  reportsGrid: {
    gap: 16,
  },
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  reportCardDisabled: {
    opacity: 0.6,
  },
  reportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  reportDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontWeight: '500',
  },
  reportArrow: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  draftHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  draftHintText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  mvaNotesInput: {
    marginTop: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },
});
