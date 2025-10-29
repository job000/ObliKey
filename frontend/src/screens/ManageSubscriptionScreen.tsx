import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

interface SubscriptionDetail {
  id: string;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    email: string;
  };
  tier: string;
  status: string;
  interval: string;
  price: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  billingEmail?: string;
  billingName?: string;
  billingAddress?: string;
  notes?: string;
  customFeatures?: any;
}

export default function ManageSubscriptionScreen({ route, navigation }: any) {
  const { subscriptionId } = route.params;
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editedTier, setEditedTier] = useState('');
  const [editedInterval, setEditedInterval] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editedBillingEmail, setEditedBillingEmail] = useState('');
  const [editedNotes, setEditedNotes] = useState('');

  // Modal states
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigation.goBack();
      return;
    }
    loadData();
  }, [user, subscriptionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Since we don't have a direct endpoint to get subscription by ID,
      // we'll fetch all tenants and find the one with matching subscription ID
      const tenantsResponse = await api.getAllTenants({ limit: 1000 });

      let foundSubscription: SubscriptionDetail | null = null;
      if (tenantsResponse.data?.tenants) {
        for (const tenant of tenantsResponse.data.tenants) {
          if (tenant.subscription && tenant.subscription.id === subscriptionId) {
            foundSubscription = {
              ...tenant.subscription,
              tenant: {
                id: tenant.id,
                name: tenant.name,
                subdomain: tenant.subdomain,
                email: tenant.email,
              },
            };
            break;
          }
        }
      }

      if (!foundSubscription) {
        setError('Abonnement ikke funnet');
        return;
      }

      setSubscription(foundSubscription);
      setEditedTier(foundSubscription.tier);
      setEditedInterval(foundSubscription.interval);
      setEditedPrice(foundSubscription.price.toString());
      setEditedBillingEmail(foundSubscription.billingEmail || foundSubscription.tenant.email);
      setEditedNotes(foundSubscription.notes || '');

      // Load invoices
      try {
        const invoicesResponse = await api.getSubscriptionInvoices(subscriptionId);
        setInvoices(invoicesResponse.data || []);
      } catch (err) {
        console.log('Failed to load invoices:', err);
        setInvoices([]);
      }
    } catch (err: any) {
      console.error('Failed to load subscription:', err);
      setError(err.response?.data?.message || 'Kunne ikke laste abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!subscription) return;

    try {
      setSaving(true);
      await api.updateSubscription(subscriptionId, {
        tier: editedTier,
        interval: editedInterval,
        price: parseFloat(editedPrice),
        billingEmail: editedBillingEmail,
        notes: editedNotes,
      });

      Alert.alert('Suksess', 'Abonnementet er oppdatert');
      setEditing(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to update subscription:', err);
      Alert.alert('Feil', err.response?.data?.message || 'Kunne ikke oppdatere abonnement');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!selectedStatus) return;

    try {
      setSaving(true);
      await api.changeSubscriptionStatus(subscriptionId, selectedStatus);
      Alert.alert('Suksess', 'Status er oppdatert');
      setStatusModalVisible(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to change status:', err);
      Alert.alert('Feil', err.response?.data?.message || 'Kunne ikke endre status');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Kanseller Abonnement',
      'Er du sikker på at du vil kansellere dette abonnementet?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Kanseller',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await api.cancelSubscription(subscriptionId);
              Alert.alert('Suksess', 'Abonnementet er kansellert');
              loadData();
            } catch (err: any) {
              console.error('Failed to cancel subscription:', err);
              Alert.alert('Feil', err.response?.data?.message || 'Kunne ikke kansellere abonnement');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivateSubscription = () => {
    Alert.alert(
      'Reaktiver Abonnement',
      'Er du sikker på at du vil reaktivere dette abonnementet?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Reaktiver',
          onPress: async () => {
            try {
              setSaving(true);
              await api.reactivateSubscription(subscriptionId);
              Alert.alert('Suksess', 'Abonnementet er reaktivert');
              loadData();
            } catch (err: any) {
              console.error('Failed to reactivate subscription:', err);
              Alert.alert('Feil', err.response?.data?.message || 'Kunne ikke reaktivere abonnement');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number, currency: string = 'NOK') => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nb-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#10B981';
      case 'TRIAL':
        return '#3B82F6';
      case 'CANCELLED':
        return '#EF4444';
      case 'EXPIRED':
        return '#F59E0B';
      case 'PAST_DUE':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      ACTIVE: 'Aktiv',
      TRIAL: 'Prøveperiode',
      CANCELLED: 'Kansellert',
      EXPIRED: 'Utløpt',
      PAST_DUE: 'Forfalt',
    };
    return labels[status] || status;
  };

  const getInvoiceStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      DRAFT: 'Utkast',
      SENT: 'Sendt',
      PAID: 'Betalt',
      OVERDUE: 'Forfalt',
      CANCELLED: 'Kansellert',
    };
    return labels[status] || status;
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return '#10B981';
      case 'SENT':
        return '#3B82F6';
      case 'OVERDUE':
        return '#EF4444';
      case 'CANCELLED':
        return '#6B7280';
      default:
        return '#F59E0B';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster abonnement...</Text>
      </View>
    );
  }

  if (error || !subscription) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error || 'Abonnement ikke funnet'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Gå tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.contentContainerWeb]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Administrer Abonnement</Text>
            <Text style={styles.subtitle}>{subscription.tenant.name}</Text>
          </View>
        </View>

        {/* Subscription Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Abonnementsinformasjon</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.editButton}>
                <Ionicons name="pencil" size={20} color="#3B82F6" />
                <Text style={styles.editButtonText}>Rediger</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(subscription.status) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(subscription.status) },
                  ]}
                >
                  {getStatusLabel(subscription.status)}
                </Text>
              </View>
            </View>

            {editing ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Plan Type:</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTier}
                    onChangeText={setEditedTier}
                    placeholder="TRIAL, BASIC, PREMIUM, etc."
                  />
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Intervall:</Text>
                  <TextInput
                    style={styles.input}
                    value={editedInterval}
                    onChangeText={setEditedInterval}
                    placeholder="MONTHLY, QUARTERLY, ANNUAL"
                  />
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pris:</Text>
                  <TextInput
                    style={styles.input}
                    value={editedPrice}
                    onChangeText={setEditedPrice}
                    placeholder="Pris"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Faktura E-post:</Text>
                  <TextInput
                    style={styles.input}
                    value={editedBillingEmail}
                    onChangeText={setEditedBillingEmail}
                    placeholder="E-post"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Notater:</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editedNotes}
                    onChangeText={setEditedNotes}
                    placeholder="Notater"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Plan Type:</Text>
                  <Text style={styles.infoValue}>{subscription.tier}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Intervall:</Text>
                  <Text style={styles.infoValue}>{subscription.interval}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pris:</Text>
                  <Text style={styles.infoValue}>
                    {formatCurrency(subscription.price, subscription.currency)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nåværende Periode:</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                  </Text>
                </View>
                {subscription.trialEnd && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Prøveperiode Utløper:</Text>
                    <Text style={styles.infoValue}>{formatDate(subscription.trialEnd)}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Faktura E-post:</Text>
                  <Text style={styles.infoValue}>{editedBillingEmail}</Text>
                </View>
                {editedNotes && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Notater:</Text>
                    <Text style={styles.infoValue}>{editedNotes}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {editing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={() => {
                  setEditing(false);
                  setEditedTier(subscription.tier);
                  setEditedInterval(subscription.interval);
                  setEditedPrice(subscription.price.toString());
                  setEditedBillingEmail(subscription.billingEmail || subscription.tenant.email);
                  setEditedNotes(subscription.notes || '');
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveChanges}
                style={styles.saveButton}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Lagre Endringer</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Actions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Handlinger</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedStatus(subscription.status);
                setStatusModalVisible(true);
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Endre Status</Text>
            </TouchableOpacity>

            {subscription.status === 'CANCELLED' ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.successButton]}
                onPress={handleReactivateSubscription}
              >
                <Ionicons name="refresh" size={20} color="#10B981" />
                <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Reaktiver</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleCancelSubscription}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Kanseller</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Invoices Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fakturahistorikk</Text>
          {invoices.length === 0 ? (
            <Text style={styles.emptyText}>Ingen fakturaer ennå</Text>
          ) : (
            <View style={styles.invoicesList}>
              {invoices.map((invoice) => (
                <View key={invoice.id} style={styles.invoiceItem}>
                  <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                    <Text style={styles.invoiceDate}>
                      Forfallsdato: {formatDate(invoice.dueDate)}
                    </Text>
                  </View>
                  <View style={styles.invoiceRight}>
                    <Text style={styles.invoiceAmount}>
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </Text>
                    <View
                      style={[
                        styles.invoiceStatusBadge,
                        { backgroundColor: getInvoiceStatusColor(invoice.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.invoiceStatusText,
                          { color: getInvoiceStatusColor(invoice.status) },
                        ]}
                      >
                        {getInvoiceStatusLabel(invoice.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Status Change Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Endre Status</Text>
            <View style={styles.statusOptions}>
              {['ACTIVE', 'TRIAL', 'CANCELLED', 'EXPIRED', 'PAST_DUE'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    selectedStatus === status && styles.statusOptionSelected,
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      selectedStatus === status && styles.statusOptionTextSelected,
                    ]}
                  >
                    {getStatusLabel(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setStatusModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleChangeStatus}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Bekreft</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  contentContainerWeb: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  infoGrid: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    width: 160,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  dangerButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  successButton: {
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  invoicesList: {
    gap: 12,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  invoiceStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  invoiceStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  statusOptions: {
    gap: 8,
    marginBottom: 24,
  },
  statusOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  statusOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
