import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Container from '../components/Container';
import type { PTSession } from '../types/ptSession';

export default function SessionDetailScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const { user } = useAuth();
  const [session, setSession] = useState<PTSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');

  // Check if user can edit/delete
  const canEdit = () => {
    if (!session || !user) return false;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isOwnTrainer = user.role === 'TRAINER' && session.trainerId === user.userId;
    return isAdmin || isOwnTrainer;
  };

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await api.getPTSession(sessionId);
      if (response.success) {
        setSession(response.data);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      Alert.alert('Feil', 'Kunne ikke laste PT-økt');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditPTSession', { sessionId: session?.id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Slett PT-økt',
      'Er du sikker på at du vil slette denne økten?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.deletePTSession(sessionId);
              Alert.alert('Suksess', 'PT-økt slettet');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke slette PT-økt');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const submitFeedback = async () => {
    if (!session) return;

    try {
      setFeedbackModalVisible(false);
      setLoading(true);

      const feedbackData: any = {
        rating,
      };

      if (user?.role === 'CUSTOMER') {
        feedbackData.clientFeedback = clientFeedback;
      } else {
        feedbackData.notes = feedbackNotes;
      }

      const response = await api.submitPTSessionFeedback(sessionId, feedbackData);
      if (response.success) {
        Alert.alert('Suksess', 'Tilbakemelding lagret');
        await loadSession();
      }
      setRating(0);
      setFeedbackNotes('');
      setClientFeedback('');
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke lagre tilbakemelding');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Container>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>PT-økt detaljer</Text>
            {canEdit() ? (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                  <Ionicons name="create-outline" size={22} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>
        </Container>
      </View>

      <ScrollView style={styles.container}>
        <Container>
          {/* Status Section */}
          <View style={styles.section}>
            <View
              style={[
                styles.statusBanner,
                { backgroundColor: getStatusColor(session.status) + '15' },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(session.status) }]}>
                {getStatusText(session.status)}
              </Text>
            </View>
          </View>

          {/* Session Info */}
          <View style={styles.section}>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            {session.description && (
              <Text style={styles.sessionDescription}>{session.description}</Text>
            )}

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={20} color="#3B82F6" />
                <Text style={styles.infoLabel}>Dato</Text>
                <Text style={styles.infoValue}>{formatDate(session.startTime)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={20} color="#3B82F6" />
                <Text style={styles.infoLabel}>Tid</Text>
                <Text style={styles.infoValue}>
                  {formatTime(session.startTime)} - {formatTime(session.endTime)}
                </Text>
              </View>
              {session.location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#3B82F6" />
                  <Text style={styles.infoLabel}>Lokasjon</Text>
                  <Text style={styles.infoValue}>{session.location}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="person" size={20} color="#3B82F6" />
                <Text style={styles.infoLabel}>
                  {user?.role === 'CUSTOMER' ? 'Trener' : 'Kunde'}
                </Text>
                <Text style={styles.infoValue}>
                  {user?.role === 'CUSTOMER'
                    ? `${session.trainer.firstName} ${session.trainer.lastName}`
                    : `${session.customer.firstName} ${session.customer.lastName}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Planned Exercises */}
          {session.plannedExercises && session.plannedExercises.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Planlagte øvelser</Text>
              {session.plannedExercises.map((exercise, index) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                    <View style={styles.exerciseNumber}>
                      <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                    </View>
                  </View>
                  <View style={styles.exerciseDetails}>
                    {exercise.sets && (
                      <View style={styles.exerciseDetail}>
                        <Text style={styles.exerciseDetailLabel}>Sett:</Text>
                        <Text style={styles.exerciseDetailValue}>{exercise.sets}</Text>
                      </View>
                    )}
                    {exercise.reps && (
                      <View style={styles.exerciseDetail}>
                        <Text style={styles.exerciseDetailLabel}>Reps:</Text>
                        <Text style={styles.exerciseDetailValue}>{exercise.reps}</Text>
                      </View>
                    )}
                    {exercise.weight && (
                      <View style={styles.exerciseDetail}>
                        <Text style={styles.exerciseDetailLabel}>Vekt:</Text>
                        <Text style={styles.exerciseDetailValue}>{exercise.weight} kg</Text>
                      </View>
                    )}
                    {exercise.duration && (
                      <View style={styles.exerciseDetail}>
                        <Text style={styles.exerciseDetailLabel}>Varighet:</Text>
                        <Text style={styles.exerciseDetailValue}>{exercise.duration} min</Text>
                      </View>
                    )}
                  </View>
                  {exercise.notes && (
                    <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Notes */}
          {session.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notater fra trener</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{session.notes}</Text>
              </View>
            </View>
          )}

          {session.customerNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notater fra kunde</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{session.customerNotes}</Text>
              </View>
            </View>
          )}

          {/* Session Result */}
          {session.sessionResult && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tilbakemelding</Text>
              <View style={styles.feedbackCard}>
                {session.sessionResult.rating && (
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingLabel}>Vurdering:</Text>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= session.sessionResult!.rating! ? 'star' : 'star-outline'}
                          size={24}
                          color="#F59E0B"
                        />
                      ))}
                    </View>
                  </View>
                )}
                {session.sessionResult.notes && (
                  <View style={styles.feedbackSection}>
                    <Text style={styles.feedbackLabel}>Trenerens kommentar:</Text>
                    <Text style={styles.feedbackText}>{session.sessionResult.notes}</Text>
                  </View>
                )}
                {session.sessionResult.clientFeedback && (
                  <View style={styles.feedbackSection}>
                    <Text style={styles.feedbackLabel}>Kundens tilbakemelding:</Text>
                    <Text style={styles.feedbackText}>{session.sessionResult.clientFeedback}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Feedback Button */}
          {session.status === 'COMPLETED' && !session.sessionResult && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.feedbackButton}
                onPress={() => setFeedbackModalVisible(true)}
              >
                <Ionicons name="chatbox-ellipses-outline" size={20} color="#FFF" />
                <Text style={styles.feedbackButtonText}>Gi tilbakemelding</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Rejection/Cancellation Reason */}
          {session.rejectionReason && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Grunn til avslag</Text>
              <View style={[styles.notesCard, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.notesText, { color: '#DC2626' }]}>
                  {session.rejectionReason}
                </Text>
              </View>
            </View>
          )}

          {session.cancellationReason && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Grunn til avlysning</Text>
              <View style={[styles.notesCard, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.notesText, { color: '#DC2626' }]}>
                  {session.cancellationReason}
                </Text>
              </View>
            </View>
          )}
        </Container>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={feedbackModalVisible}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gi tilbakemelding</Text>
              <TouchableOpacity onPress={() => setFeedbackModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Vurdering</Text>
            <View style={styles.starRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>
              {user?.role === 'CUSTOMER' ? 'Din tilbakemelding' : 'Kommentar til økt'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Skriv din tilbakemelding her"
              value={user?.role === 'CUSTOMER' ? clientFeedback : feedbackNotes}
              onChangeText={user?.role === 'CUSTOMER' ? setClientFeedback : setFeedbackNotes}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setFeedbackModalVisible(false);
                  setRating(0);
                  setFeedbackNotes('');
                  setClientFeedback('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSubmit, rating === 0 && styles.modalButtonDisabled]}
                onPress={submitFeedback}
                disabled={rating === 0}
              >
                <Text style={styles.modalButtonSubmitText}>Send inn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  statusBanner: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sessionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sessionDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  exerciseCard: {
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
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exerciseDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exerciseDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
  },
  exerciseDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  exerciseNotes: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    fontStyle: 'italic',
  },
  notesCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  feedbackCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  feedbackSection: {
    marginTop: 12,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  feedbackButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
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
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  starRating: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
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
    minHeight: 120,
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
  modalButtonSubmit: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalButtonSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  modalButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});
