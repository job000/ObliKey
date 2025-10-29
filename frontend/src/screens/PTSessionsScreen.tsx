import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Container from '../components/Container';
import type { PTSession } from '../types';

export default function PTSessionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PTSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'pending'>('all');
  const [credits, setCredits] = useState<number>(0);

  // Modal states
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PTSession | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, creditsRes] = await Promise.all([
        api.getPTSessions(),
        user?.role === 'CUSTOMER' ? api.getPTCredits() : Promise.resolve({ success: true, data: { credits: 0 } }),
      ]);

      if (sessionsRes.success) {
        setSessions(sessionsRes.data);
      }

      if (creditsRes.success && user?.role === 'CUSTOMER') {
        setCredits(creditsRes.data.credits || 0);
      }
    } catch (error) {
      console.error('Failed to load PT sessions:', error);
      Alert.alert('Feil', 'Kunne ikke laste PT-økter');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const approveSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await api.approvePTSession(sessionId);
      if (response.success) {
        Alert.alert('Suksess', 'PT-økten er godkjent');
        await loadData();
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke godkjenne økt');
    } finally {
      setLoading(false);
    }
  };

  const rejectSession = async () => {
    if (!selectedSession) return;

    try {
      setRejectModalVisible(false);
      setLoading(true);
      const response = await api.rejectPTSession(selectedSession.id, rejectionReason);
      if (response.success) {
        Alert.alert('Avslått', 'PT-økten er avslått');
        await loadData();
      }
      setRejectionReason('');
      setSelectedSession(null);
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke avslå økt');
    } finally {
      setLoading(false);
    }
  };

  const cancelSession = async () => {
    if (!selectedSession) return;

    try {
      setCancelModalVisible(false);
      setLoading(true);
      const response = await api.cancelPTSessionWithReason(selectedSession.id, cancellationReason);
      if (response.success) {
        Alert.alert('Avlyst', 'PT-økten er avlyst');
        await loadData();
      }
      setCancellationReason('');
      setSelectedSession(null);
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke avlyse økt');
    } finally {
      setLoading(false);
    }
  };

  const completeSession = async (sessionId: string) => {
    Alert.alert(
      'Fullfør økt',
      'Bekreft at økten er fullført',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Fullfør',
          onPress: async () => {
            try {
              await api.completePTSession(sessionId);
              Alert.alert('Suksess', 'Økt fullført');
              loadData();
            } catch (error) {
              Alert.alert('Feil', 'Kunne ikke fullføre økt');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
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
    switch (status) {
      case 'PENDING_APPROVAL':
        return '#8B5CF6';
      case 'SCHEDULED':
        return '#F59E0B';
      case 'CONFIRMED':
        return '#10B981';
      case 'COMPLETED':
        return '#6B7280';
      case 'CANCELLED':
        return '#EF4444';
      case 'NO_SHOW':
        return '#DC2626';
      case 'REJECTED':
        return '#F87171';
      default:
        return '#3B82F6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'Venter godkjenning';
      case 'SCHEDULED':
        return 'Planlagt';
      case 'CONFIRMED':
        return 'Bekreftet';
      case 'COMPLETED':
        return 'Fullført';
      case 'CANCELLED':
        return 'Avlyst';
      case 'NO_SHOW':
        return 'Ikke møtt';
      case 'REJECTED':
        return 'Avslått';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'time-outline';
      case 'SCHEDULED':
        return 'calendar-outline';
      case 'CONFIRMED':
        return 'checkmark-circle-outline';
      case 'COMPLETED':
        return 'checkmark-done-outline';
      case 'CANCELLED':
        return 'close-circle-outline';
      case 'NO_SHOW':
        return 'alert-circle-outline';
      case 'REJECTED':
        return 'ban-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const getFilteredSessions = () => {
    const now = new Date();

    if (filter === 'pending') {
      return sessions.filter((session) => session.status === 'PENDING_APPROVAL');
    }

    if (filter === 'upcoming') {
      return sessions.filter(
        (session) =>
          new Date(session.startTime) > now &&
          session.status !== 'COMPLETED' &&
          session.status !== 'CANCELLED' &&
          session.status !== 'REJECTED'
      );
    }

    if (filter === 'completed') {
      return sessions.filter((session) => session.status === 'COMPLETED');
    }

    return sessions;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  const filteredSessions = getFilteredSessions();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenHeader}>
        <Container>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>PT-Økter</Text>
              {user?.role === 'CUSTOMER' && (
                <Text style={styles.headerSubtitle}>{`${credits} kreditter tilgjengelig`}</Text>
              )}
            </View>
            {(user?.role === 'ADMIN' || user?.role === 'TRAINER') && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('CreatePTSession')}
              >
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </Container>
      </View>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container>

        {user?.role === 'CUSTOMER' && (
          <View style={styles.creditsCard}>
            <View style={styles.creditsIcon}>
              <Ionicons name="card" size={32} color="#3B82F6" />
            </View>
            <View style={styles.creditsInfo}>
              <Text style={styles.creditsLabel}>PT-Kreditter</Text>
              <Text style={styles.creditsValue}>{`${credits} økter`}</Text>
            </View>
            <TouchableOpacity
              style={styles.buyButton}
              onPress={() => navigation.navigate('Shop', { filter: 'PT_SESSION' })}
            >
              <Text style={styles.buyButtonText}>Kjøp mer</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {user?.role === 'CUSTOMER' && (
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'pending' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('pending')}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={filter === 'pending' ? '#FFF' : '#8B5CF6'}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  filter === 'pending' && styles.filterButtonTextActive,
                ]}
              >
                Venter
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'upcoming' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('upcoming')}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={filter === 'upcoming' ? '#FFF' : '#3B82F6'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filter === 'upcoming' && styles.filterButtonTextActive,
              ]}
            >
              Kommende
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'completed' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('completed')}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={16}
              color={filter === 'completed' ? '#FFF' : '#10B981'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filter === 'completed' && styles.filterButtonTextActive,
              ]}
            >
              Fullført
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('all')}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={filter === 'all' ? '#FFF' : '#6B7280'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              Alle
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sessionsList}>
          {filteredSessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Ingen økter funnet</Text>
              {user?.role === 'CUSTOMER' && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('Shop', { filter: 'PT_SESSION' })}
                >
                  <Text style={styles.emptyButtonText}>Kjøp PT-pakke</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredSessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
                activeOpacity={0.7}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionDateContainer}>
                    <Text style={styles.sessionDate}>
                      {formatDate(session.startTime)}
                    </Text>
                    <Text style={styles.sessionTime}>
                      {`${formatTime(session.startTime)} - ${formatTime(session.endTime)}`}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(session.status) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(session.status) as any}
                      size={14}
                      color={getStatusColor(session.status)}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(session.status) },
                      ]}
                    >
                      {getStatusText(session.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sessionTitle}>{session.title}</Text>
                {session.description && (
                  <Text style={styles.sessionDescription}>
                    {session.description}
                  </Text>
                )}

                <View style={styles.sessionInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person" size={16} color="#6B7280" />
                    <Text style={styles.infoText}>
                      {user?.role === 'CUSTOMER'
                        ? `Trener: ${session.trainer.firstName} ${session.trainer.lastName}`
                        : `Kunde: ${session.customer.firstName} ${session.customer.lastName}`}
                    </Text>
                  </View>
                  {session.location && (
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>{session.location}</Text>
                    </View>
                  )}
                </View>

                {session.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notater:</Text>
                    <Text style={styles.notesText}>{session.notes}</Text>
                  </View>
                )}

                {/* Customer actions for PENDING_APPROVAL */}
                {user?.role === 'CUSTOMER' && session.status === 'PENDING_APPROVAL' && (
                  <View style={styles.actionContainer}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        approveSession(session.id);
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                      <Text style={styles.approveButtonText}>Godta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedSession(session);
                        setRejectModalVisible(true);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                      <Text style={styles.rejectButtonText}>Avslå</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Trainer actions for CONFIRMED */}
                {(user?.role === 'TRAINER' || user?.role === 'ADMIN') &&
                  session.status === 'CONFIRMED' && (
                    <View style={styles.actionContainer}>
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          completeSession(session.id);
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                        <Text style={styles.completeButtonText}>Fullfør økt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate('EditPTSession', { sessionId: session.id });
                        }}
                      >
                        <Ionicons name="create-outline" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  )}

                {/* Cancel button for both parties (not for completed/cancelled/rejected) */}
                {session.status !== 'COMPLETED' &&
                  session.status !== 'CANCELLED' &&
                  session.status !== 'REJECTED' && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedSession(session);
                        setCancelModalVisible(true);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                      <Text style={styles.cancelButtonText}>Avlys økt</Text>
                    </TouchableOpacity>
                  )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </Container>
    </ScrollView>

    {/* Reject Modal */}
    <Modal
      animationType="slide"
      transparent={true}
      visible={rejectModalVisible}
      onRequestClose={() => setRejectModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Avslå PT-økt</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Hvorfor avslår du denne økten?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Skriv en grunn (valgfritt)"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonReject}
                onPress={rejectSession}
              >
                <Text style={styles.modalButtonRejectText}>Avslå</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Cancel Modal */}
    <Modal
      animationType="slide"
      transparent={true}
      visible={cancelModalVisible}
      onRequestClose={() => setCancelModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Avlys PT-økt</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Hvorfor avlyser du denne økten?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Skriv en grunn (valgfritt)"
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setCancelModalVisible(false);
                  setCancellationReason('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonReject}
                onPress={cancelSession}
              >
                <Text style={styles.modalButtonRejectText}>Avlys</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  screenHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  creditsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  creditsInfo: {
    flex: 1,
  },
  creditsLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  creditsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  buyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  sessionsList: {
    gap: 16,
    paddingBottom: 24,
  },
  sessionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionDateContainer: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  sessionInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  notesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  editButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonReject: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalButtonRejectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
