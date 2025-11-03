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
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import Container from '../components/Container';
import type { PTSession } from '../types';

export default function PTSessionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
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
        setCredits(creditsRes.data.available || 0);
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
        return colors.accent;
      case 'SCHEDULED':
        return colors.warning;
      case 'CONFIRMED':
        return colors.success;
      case 'COMPLETED':
        return colors.textSecondary;
      case 'CANCELLED':
        return colors.danger;
      case 'NO_SHOW':
        return '#DC2626'; // darker shade of danger
      case 'REJECTED':
        return '#F87171'; // lighter shade of danger
      default:
        return colors.primary;
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const filteredSessions = getFilteredSessions();

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
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>PT-Økter</Text>
              {user?.role === 'CUSTOMER' && (
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{`${credits} kreditter tilgjengelig`}</Text>
              )}
            </View>
            {(user?.role === 'ADMIN' || user?.role === 'TRAINER') && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreatePTSession')}
              >
                <Ionicons name="add" size={24} color={colors.cardBg} />
              </TouchableOpacity>
            )}
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

        {user?.role === 'CUSTOMER' && (
          <View style={[styles.creditsCard, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.creditsIcon, { backgroundColor: colors.background }]}>
              <Ionicons name="card" size={32} color={colors.primary} />
            </View>
            <View style={styles.creditsInfo}>
              <Text style={[styles.creditsLabel, { color: colors.textSecondary }]}>PT-Kreditter</Text>
              <Text style={[styles.creditsValue, { color: colors.text }]}>{`${credits} økter`}</Text>
            </View>
            {credits > 0 ? (
              <TouchableOpacity
                style={[styles.bookButton, { backgroundColor: colors.success }]}
                onPress={() => navigation.navigate('PTBooking')}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.cardBg} />
                <Text style={[styles.bookButtonText, { color: colors.cardBg }]}>Book time</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.buyButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('PTShop')}
              >
                <Ionicons name="cart-outline" size={16} color={colors.cardBg} />
                <Text style={[styles.buyButtonText, { color: colors.cardBg }]}>Kjøp timer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {user?.role === 'TRAINER' && (
          <>
            <View style={[styles.trainerCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.trainerCardHeader}>
                <View style={[styles.trainerIcon, { backgroundColor: colors.background }]}>
                  <Ionicons name="settings" size={32} color={colors.accent} />
                </View>
                <View style={styles.trainerInfo}>
                  <Text style={[styles.trainerLabel, { color: colors.text }]}>PT-Administrasjon</Text>
                  <Text style={[styles.trainerSubtext, { color: colors.textSecondary }]}>Administrer økter og gi kreditter</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.availabilityButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('PTManagement')}
              >
                <Ionicons name="cog-outline" size={16} color={colors.cardBg} />
                <Text style={[styles.availabilityButtonText, { color: colors.cardBg }]}>Åpne</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.trainerCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.trainerCardHeader}>
                <View style={[styles.trainerIcon, { backgroundColor: colors.background }]}>
                  <Ionicons name="calendar" size={32} color={colors.accent} />
                </View>
                <View style={styles.trainerInfo}>
                  <Text style={[styles.trainerLabel, { color: colors.text }]}>Tilgjengelighet</Text>
                  <Text style={[styles.trainerSubtext, { color: colors.textSecondary }]}>Administrer din arbeidsplan</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.availabilityButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('PTAvailability')}
              >
                <Ionicons name="settings-outline" size={16} color={colors.cardBg} />
                <Text style={[styles.availabilityButtonText, { color: colors.cardBg }]}>Administrer</Text>
              </TouchableOpacity>
            </View>
          </>
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
                { borderColor: colors.border, backgroundColor: colors.cardBg },
                filter === 'pending' && [styles.filterButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
              ]}
              onPress={() => setFilter('pending')}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={filter === 'pending' ? colors.cardBg : colors.accent}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  { color: colors.text },
                  filter === 'pending' && [styles.filterButtonTextActive, { color: colors.cardBg }],
                ]}
              >
                Venter
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.filterButton,
              { borderColor: colors.border, backgroundColor: colors.cardBg },
              filter === 'upcoming' && [styles.filterButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
            onPress={() => setFilter('upcoming')}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={filter === 'upcoming' ? colors.cardBg : colors.primary}
            />
            <Text
              style={[
                styles.filterButtonText,
                { color: colors.text },
                filter === 'upcoming' && [styles.filterButtonTextActive, { color: colors.cardBg }],
              ]}
            >
              Kommende
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { borderColor: colors.border, backgroundColor: colors.cardBg },
              filter === 'completed' && [styles.filterButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
            onPress={() => setFilter('completed')}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={16}
              color={filter === 'completed' ? colors.cardBg : colors.success}
            />
            <Text
              style={[
                styles.filterButtonText,
                { color: colors.text },
                filter === 'completed' && [styles.filterButtonTextActive, { color: colors.cardBg }],
              ]}
            >
              Fullført
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { borderColor: colors.border, backgroundColor: colors.cardBg },
              filter === 'all' && [styles.filterButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
            onPress={() => setFilter('all')}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={filter === 'all' ? colors.cardBg : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterButtonText,
                { color: colors.text },
                filter === 'all' && [styles.filterButtonTextActive, { color: colors.cardBg }],
              ]}
            >
              Alle
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sessionsList}>
          {filteredSessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>Ingen økter funnet</Text>
              {user?.role === 'CUSTOMER' && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('Shop', { filter: 'PT_SESSION' })}
                >
                  <Text style={[styles.emptyButtonText, { color: colors.cardBg }]}>Kjøp PT-pakke</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredSessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={[styles.sessionCard, { backgroundColor: colors.cardBg }]}
                onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
                activeOpacity={0.7}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionDateContainer}>
                    <Text style={[styles.sessionDate, { color: colors.primary }]}>
                      {formatDate(session.startTime)}
                    </Text>
                    <Text style={[styles.sessionTime, { color: colors.text }]}>
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

                <Text style={[styles.sessionTitle, { color: colors.text }]}>{session.title}</Text>
                {session.description && (
                  <Text style={[styles.sessionDescription, { color: colors.textSecondary }]}>
                    {session.description}
                  </Text>
                )}

                <View style={styles.sessionInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person" size={16} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      {user?.role === 'CUSTOMER'
                        ? `Trener: ${session.trainer?.firstName || ''} ${session.trainer?.lastName || ''}`
                        : `Kunde: ${session.customer?.firstName || ''} ${session.customer?.lastName || ''}`}
                    </Text>
                  </View>
                  {session.location && (
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={16} color={colors.textSecondary} />
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>{session.location}</Text>
                    </View>
                  )}
                </View>

                {session.notes && (
                  <View style={[styles.notesContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notater:</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>{session.notes}</Text>
                  </View>
                )}

                {/* Customer actions for PENDING_APPROVAL */}
                {user?.role === 'CUSTOMER' && session.status === 'PENDING_APPROVAL' && (
                  <View style={styles.actionContainer}>
                    <TouchableOpacity
                      style={[styles.approveButton, { backgroundColor: colors.success }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        approveSession(session.id);
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.cardBg} />
                      <Text style={[styles.approveButtonText, { color: colors.cardBg }]}>Godta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectButton, { backgroundColor: colors.danger }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedSession(session);
                        setRejectModalVisible(true);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={colors.cardBg} />
                      <Text style={[styles.rejectButtonText, { color: colors.cardBg }]}>Avslå</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Trainer actions for CONFIRMED */}
                {(user?.role === 'TRAINER' || user?.role === 'ADMIN') &&
                  session.status === 'CONFIRMED' && (
                    <View style={styles.actionContainer}>
                      <TouchableOpacity
                        style={[styles.completeButton, { backgroundColor: colors.success }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          completeSession(session.id);
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={20} color={colors.cardBg} />
                        <Text style={[styles.completeButtonText, { color: colors.cardBg }]}>Fullfør økt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editButton, { borderColor: colors.primary }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate('EditPTSession', { sessionId: session.id });
                        }}
                      >
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}

                {/* Cancel button for both parties (not for completed/cancelled/rejected) */}
                {session.status !== 'COMPLETED' &&
                  session.status !== 'CANCELLED' &&
                  session.status !== 'REJECTED' && (
                    <TouchableOpacity
                      style={[styles.cancelButton, { borderColor: colors.danger }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedSession(session);
                        setCancelModalVisible(true);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      <Text style={[styles.cancelButtonText, { color: colors.danger }]}>Avlys økt</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Avslå PT-økt</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Hvorfor avslår du denne økten?</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Skriv en grunn (valgfritt)"
              placeholderTextColor={colors.textLight}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, { borderColor: colors.border }]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason('');
                }}
              >
                <Text style={[styles.modalButtonCancelText, { color: colors.text }]}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonReject, { backgroundColor: colors.danger }]}
                onPress={rejectSession}
              >
                <Text style={[styles.modalButtonRejectText, { color: colors.cardBg }]}>Avslå</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Avlys PT-økt</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Hvorfor avlyser du denne økten?</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Skriv en grunn (valgfritt)"
              placeholderTextColor={colors.textLight}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, { borderColor: colors.border }]}
                onPress={() => {
                  setCancelModalVisible(false);
                  setCancellationReason('');
                }}
              >
                <Text style={[styles.modalButtonCancelText, { color: colors.text }]}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonReject, { backgroundColor: colors.danger }]}
                onPress={cancelSession}
              >
                <Text style={[styles.modalButtonRejectText, { color: colors.cardBg }]}>Avlys</Text>
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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  creditsInfo: {
    flex: 1,
  },
  creditsLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  creditsValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trainerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  trainerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  trainerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  trainerSubtext: {
    fontSize: 14,
  },
  availabilityButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  filterButtonActive: {
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
  },
  sessionsList: {
    gap: 16,
    paddingBottom: 24,
  },
  sessionCard: {
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
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 16,
    fontWeight: 'bold',
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
    marginBottom: 8,
  },
  sessionDescription: {
    fontSize: 14,
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
  },
  notesContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
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
    paddingVertical: 12,
    borderRadius: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
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
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonReject: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonRejectText: {
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
