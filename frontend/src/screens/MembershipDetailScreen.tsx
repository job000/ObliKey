import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';
import { Membership, MembershipPayment, MembershipCheckIn } from '../types/membership';

const MembershipDetailScreen = ({ route, navigation }: any) => {
  const { membershipId } = route.params;
  const [membership, setMembership] = useState<Membership | null>(null);
  const [payments, setPayments] = useState<MembershipPayment[]>([]);
  const [checkIns, setCheckIns] = useState<MembershipCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [reason, setReason] = useState('');
  const [freezeStartDate, setFreezeStartDate] = useState(new Date());
  const [freezeEndDate, setFreezeEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, [membershipId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membershipData, paymentsData, checkInsData] = await Promise.all([
        api.getMembership(membershipId),
        api.getMembershipPayments(membershipId),
        api.getCheckInHistory(membershipId, { limit: 20 })
      ]);

      setMembership(membershipData.data);
      setPayments(paymentsData.data || []);
      setCheckIns(checkInsData.data || []);
    } catch (error: any) {
      console.error('[MembershipDetail] Error fetching data:', error);
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke hente medlemskapsinformasjon');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string) => {
    setSelectedAction(action);
    setReason('');
    setFreezeStartDate(new Date());
    setFreezeEndDate(new Date());
    setActionModalVisible(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(freezeStartDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setFreezeStartDate(newDate);
    }
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    setShowStartTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(freezeStartDate);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      setFreezeStartDate(newDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(freezeEndDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setFreezeEndDate(newDate);
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    setShowEndTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(freezeEndDate);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      setFreezeEndDate(newDate);
    }
  };

  const performAction = async () => {
    if (!membership) return;

    try {
      let message = '';
      switch (selectedAction) {
        case 'suspend':
          if (!reason.trim()) {
            Alert.alert('Feil', 'Vennligst oppgi en grunn for suspensjon');
            return;
          }
          await api.suspendMembership(membership.id, reason);
          message = 'Medlemskap suspendert';
          break;
        case 'reactivate':
          await api.reactivateMembership(membership.id);
          message = 'Medlemskap reaktivert';
          break;
        case 'blacklist':
          if (!reason.trim()) {
            Alert.alert('Feil', 'Vennligst oppgi en grunn for svartelisting');
            return;
          }
          await api.blacklistMembership(membership.id, reason);
          message = 'Medlem svartelistet';
          break;
        case 'freeze':
          if (!freezeStartDate || !freezeEndDate) {
            Alert.alert('Feil', 'Vennligst oppgi start- og sluttdato for frysing');
            return;
          }
          await api.freezeMembership(membership.id, {
            startDate: freezeStartDate.toISOString(),
            endDate: freezeEndDate.toISOString(),
            reason: reason
          });
          message = 'Medlemskap fryst';
          break;
        case 'unfreeze':
          await api.unfreezeMembership(membership.id);
          message = 'Medlemskap ufryst';
          break;
        case 'cancel':
          await api.cancelMembership(membership.id, reason);
          message = 'Medlemskap kansellert';
          break;
      }
      Alert.alert('Suksess', message);
      setActionModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke utføre handling');
    }
  };

  const markPaymentPaid = async (paymentId: string) => {
    try {
      await api.markPaymentPaid(paymentId);
      Alert.alert('Suksess', 'Betaling markert som betalt');
      fetchData();
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke markere betaling');
    }
  };

  const sendPaymentReminder = async (paymentId: string) => {
    try {
      await api.sendPaymentReminder(paymentId, 'FIRST_REMINDER', 'EMAIL');
      Alert.alert('Suksess', 'Purring sendt');
      fetchData();
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.message || 'Kunne ikke sende purring');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#10B981';
      case 'FROZEN': return '#3B82F6';
      case 'CANCELLED': return '#6B7280';
      case 'SUSPENDED': return '#F59E0B';
      case 'BLACKLISTED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Aktiv',
      FROZEN: 'Fryst',
      CANCELLED: 'Kansellert',
      SUSPENDED: 'Suspendert',
      BLACKLISTED: 'Svartelistet'
    };
    return labels[status] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return '#10B981';
      case 'PENDING': return '#F59E0B';
      case 'OVERDUE': return '#EF4444';
      case 'FAILED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PAID: 'Betalt',
      PENDING: 'Venter',
      OVERDUE: 'Forfalt',
      FAILED: 'Feilet'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!membership) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medlemskap ikke funnet</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medlemsdetaljer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Member Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Medlemsinformasjon</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(membership.status) }]}>
              <Text style={styles.statusBadgeText}>{getStatusLabel(membership.status)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              {membership.user?.firstName} {membership.user?.lastName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{membership.user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{membership.user?.phone || 'Ikke oppgitt'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{membership.plan?.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Start: {new Date(membership.startDate).toLocaleDateString('no-NO')}
            </Text>
          </View>
          {membership.endDate && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                Slutt: {new Date(membership.endDate).toLocaleDateString('no-NO')}
              </Text>
            </View>
          )}
          {membership.nextBillingDate && (
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                Neste faktura: {new Date(membership.nextBillingDate).toLocaleDateString('no-NO')}
              </Text>
            </View>
          )}
          {membership.lastCheckInAt && (
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                Sist inne: {new Date(membership.lastCheckInAt).toLocaleDateString('no-NO')}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Handlinger</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.actionsRow}>
              {membership.status === 'ACTIVE' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FEF3C7' }]}
                    onPress={() => handleAction('suspend')}
                  >
                    <Ionicons name="pause-circle" size={24} color="#F59E0B" />
                    <Text style={styles.actionButtonLabel}>Suspender</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#DBEAFE' }]}
                    onPress={() => handleAction('freeze')}
                  >
                    <Ionicons name="snow" size={24} color="#3B82F6" />
                    <Text style={styles.actionButtonLabel}>Frys</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => handleAction('cancel')}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                    <Text style={styles.actionButtonLabel}>Kanseller</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => handleAction('blacklist')}
                  >
                    <Ionicons name="ban" size={24} color="#EF4444" />
                    <Text style={styles.actionButtonLabel}>Svarteliste</Text>
                  </TouchableOpacity>
                </>
              )}
              {membership.status === 'FROZEN' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#D1FAE5' }]}
                  onPress={() => handleAction('unfreeze')}
                >
                  <Ionicons name="sunny" size={24} color="#10B981" />
                  <Text style={styles.actionButtonLabel}>Ufrys</Text>
                </TouchableOpacity>
              )}
              {(membership.status === 'SUSPENDED' || membership.status === 'CANCELLED') && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#D1FAE5' }]}
                  onPress={() => handleAction('reactivate')}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.actionButtonLabel}>Reaktiver</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Payments */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Betalingshistorikk</Text>
          {payments.length === 0 ? (
            <Text style={styles.emptyText}>Ingen betalinger</Text>
          ) : (
            payments.map(payment => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View>
                    <Text style={styles.paymentAmount}>
                      {payment.amount} {payment.currency}
                    </Text>
                    <Text style={styles.paymentDate}>
                      Forfallsdato: {new Date(payment.dueDate).toLocaleDateString('no-NO')}
                    </Text>
                  </View>
                  <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(payment.status) }]}>
                    <Text style={styles.paymentStatusText}>{getPaymentStatusLabel(payment.status)}</Text>
                  </View>
                </View>
                {payment.paidAt && (
                  <Text style={styles.paymentInfo}>
                    Betalt: {new Date(payment.paidAt).toLocaleDateString('no-NO')}
                  </Text>
                )}
                {payment.status !== 'PAID' && (
                  <View style={styles.paymentActions}>
                    <TouchableOpacity
                      style={styles.paymentActionButton}
                      onPress={() => markPaymentPaid(payment.id)}
                    >
                      <Text style={styles.paymentActionText}>Marker betalt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.paymentActionButton}
                      onPress={() => sendPaymentReminder(payment.id)}
                    >
                      <Text style={styles.paymentActionText}>Send purring</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Check-in History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Innsjekkingshistorikk</Text>
          {checkIns.length === 0 ? (
            <Text style={styles.emptyText}>Ingen innsjekkinger</Text>
          ) : (
            checkIns.map(checkIn => (
              <View key={checkIn.id} style={styles.checkInCard}>
                <View style={styles.checkInRow}>
                  <Ionicons name="log-in" size={20} color="#10B981" />
                  <Text style={styles.checkInText}>
                    Inn: {new Date(checkIn.checkInTime).toLocaleString('no-NO')}
                  </Text>
                </View>
                {checkIn.checkOutTime && (
                  <View style={styles.checkInRow}>
                    <Ionicons name="log-out" size={20} color="#EF4444" />
                    <Text style={styles.checkInText}>
                      Ut: {new Date(checkIn.checkOutTime).toLocaleString('no-NO')}
                    </Text>
                  </View>
                )}
                {checkIn.location && (
                  <View style={styles.checkInRow}>
                    <Ionicons name="location" size={20} color="#6B7280" />
                    <Text style={styles.checkInText}>{checkIn.location}</Text>
                  </View>
                )}
                {checkIn.notes && (
                  <Text style={styles.checkInNotes}>{checkIn.notes}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    {selectedAction === 'suspend' && 'Suspender medlemskap'}
                    {selectedAction === 'reactivate' && 'Reaktiver medlemskap'}
                    {selectedAction === 'blacklist' && 'Svarteliste medlem'}
                    {selectedAction === 'freeze' && 'Frys medlemskap'}
                    {selectedAction === 'unfreeze' && 'Ufrys medlemskap'}
                    {selectedAction === 'cancel' && 'Kanseller medlemskap'}
                  </Text>

                  <ScrollView
                    style={styles.modalScrollView}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {(selectedAction === 'suspend' || selectedAction === 'blacklist' || selectedAction === 'cancel') && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Grunn *</Text>
                        <TextInput
                          style={styles.textInput}
                          value={reason}
                          onChangeText={setReason}
                          placeholder="Oppgi grunn"
                          multiline
                          numberOfLines={3}
                        />
                      </View>
                    )}

                    {selectedAction === 'freeze' && (
                      <>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Startdato og tid *</Text>
                          <View style={styles.dateButtonRow}>
                            <TouchableOpacity
                              style={styles.modernDateButton}
                              onPress={() => setShowStartDatePicker(true)}
                            >
                              <View style={styles.dateIconContainer}>
                                <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
                              </View>
                              <Text style={styles.modernDateButtonText}>
                                {formatDate(freezeStartDate)}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.modernDateButton}
                              onPress={() => setShowStartTimePicker(true)}
                            >
                              <View style={styles.dateIconContainer}>
                                <Ionicons name="time-outline" size={18} color="#3B82F6" />
                              </View>
                              <Text style={styles.modernDateButtonText}>
                                {formatTime(freezeStartDate)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {Platform.OS === 'ios' && showStartDatePicker && (
                          <DateTimePicker
                            value={freezeStartDate}
                            mode="date"
                            display="spinner"
                            onChange={handleStartDateChange}
                            textColor="#111827"
                          />
                        )}
                        {Platform.OS === 'ios' && showStartTimePicker && (
                          <DateTimePicker
                            value={freezeStartDate}
                            mode="time"
                            display="spinner"
                            onChange={handleStartTimeChange}
                            textColor="#111827"
                          />
                        )}

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Sluttdato og tid *</Text>
                          <View style={styles.dateButtonRow}>
                            <TouchableOpacity
                              style={styles.modernDateButton}
                              onPress={() => setShowEndDatePicker(true)}
                            >
                              <View style={styles.dateIconContainer}>
                                <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
                              </View>
                              <Text style={styles.modernDateButtonText}>
                                {formatDate(freezeEndDate)}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.modernDateButton}
                              onPress={() => setShowEndTimePicker(true)}
                            >
                              <View style={styles.dateIconContainer}>
                                <Ionicons name="time-outline" size={18} color="#3B82F6" />
                              </View>
                              <Text style={styles.modernDateButtonText}>
                                {formatTime(freezeEndDate)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {Platform.OS === 'ios' && showEndDatePicker && (
                          <DateTimePicker
                            value={freezeEndDate}
                            mode="date"
                            display="spinner"
                            onChange={handleEndDateChange}
                            textColor="#111827"
                          />
                        )}
                        {Platform.OS === 'ios' && showEndTimePicker && (
                          <DateTimePicker
                            value={freezeEndDate}
                            mode="time"
                            display="spinner"
                            onChange={handleEndTimeChange}
                            textColor="#111827"
                          />
                        )}

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Grunn (valgfri)</Text>
                          <TextInput
                            style={styles.textInput}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Oppgi grunn"
                            multiline
                            numberOfLines={2}
                          />
                        </View>
                      </>
                    )}
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setActionModalVisible(false)}
                    >
                      <Text style={styles.cancelButtonText}>Avbryt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={performAction}
                    >
                      <Text style={styles.confirmButtonText}>Bekreft</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Android Date/Time Pickers */}
      {showStartDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={freezeStartDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}

      {showStartTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={freezeStartDate}
          mode="time"
          display="default"
          onChange={handleStartTimeChange}
        />
      )}

      {showEndDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={freezeEndDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
        />
      )}

      {showEndTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={freezeEndDate}
          mode="time"
          display="default"
          onChange={handleEndTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  paymentCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  paymentDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  paymentActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    alignItems: 'center',
  },
  paymentActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  checkInCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkInText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  checkInNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dateButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modernDateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FAFBFC',
  },
  dateIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernDateButtonText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
  },
});

export default MembershipDetailScreen;
