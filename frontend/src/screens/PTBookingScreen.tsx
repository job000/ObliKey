import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Container from '../components/Container';
import { api } from '../services/api';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface PTCredits {
  available: number;
  total: number;
  used: number;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  trainerId: string;
  trainerName: string;
}

export default function PTBookingScreen({ navigation }: any) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [credits, setCredits] = useState<PTCredits | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [trainerModalVisible, setTrainerModalVisible] = useState(false);

  // Form fields
  const [title, setTitle] = useState('PT-time');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('Gym');

  // Generate next 14 days for date selection
  const [dateOptions, setDateOptions] = useState<Date[]>([]);

  useEffect(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    setDateOptions(dates);
    setSelectedDate(dates[0]);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTrainer && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedTrainer, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trainersResponse, creditsResponse] = await Promise.all([
        api.getPTTrainers(),
        api.getPTCredits(),
      ]);

      if (trainersResponse.success && trainersResponse.data) {
        const actualTrainers = trainersResponse.data.filter(
          (t: Trainer) => t.role === 'TRAINER'
        );
        setTrainers(actualTrainers);
      }

      if (creditsResponse.success && creditsResponse.data) {
        setCredits(creditsResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to load booking data:', error);
      Alert.alert('Feil', 'Kunne ikke laste data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedTrainer || !selectedDate) return;

    try {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await api.getPTAvailableSlots(selectedTrainer.id, dateStr);

      if (response.success && response.data) {
        setAvailableSlots(response.data);
      } else {
        setAvailableSlots([]);
      }
    } catch (error: any) {
      console.error('Failed to load available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookSession = async () => {
    if (!selectedTrainer || !selectedSlot) {
      Alert.alert('Feil', 'Vennligst velg trener og tidspunkt');
      return;
    }

    if (!credits || credits.available < 1) {
      Alert.alert(
        'Ingen timer tilgjengelig',
        'Du har ikke nok PT-timer. Gå til PT Shop for å kjøpe timer.',
        [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Gå til Shop', onPress: () => navigation.navigate('PTShop') },
        ]
      );
      return;
    }

    try {
      setBooking(true);

      const response = await api.createPTSession({
        trainerId: selectedTrainer.id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        title: title || 'PT-time',
        description: notes,
        location: location || 'Gym',
      });

      if (response.success) {
        Alert.alert(
          'Booking vellykket!',
          `PT-time med ${selectedTrainer.firstName} ${selectedTrainer.lastName} er booket.\n\n1 PT-time er trukket fra kontoen din.`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Booking failed:', error);
      Alert.alert(
        'Booking feilet',
        error.response?.data?.error || 'Kunne ikke booke PT-time'
      );
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck.getTime() === today.getTime()) {
      return 'I dag';
    } else if (dateToCheck.getTime() === tomorrow.getTime()) {
      return 'I morgen';
    } else {
      return date.toLocaleDateString('nb-NO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTrainerItem = ({ item }: { item: Trainer }) => (
    <TouchableOpacity
      style={[
        styles.trainerItem,
        selectedTrainer?.id === item.id && styles.trainerItemSelected,
      ]}
      onPress={() => {
        setSelectedTrainer(item);
        setSelectedSlot(null);
        setTrainerModalVisible(false);
      }}
    >
      <View style={styles.trainerAvatar}>
        <Text style={styles.trainerInitials}>
          {item.firstName[0]}
          {item.lastName[0]}
        </Text>
      </View>
      <View style={styles.trainerInfo}>
        <Text
          style={[
            styles.trainerName,
            selectedTrainer?.id === item.id && styles.trainerNameSelected,
          ]}
        >
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.trainerEmail}>{item.email}</Text>
      </View>
      {selectedTrainer?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
      )}
    </TouchableOpacity>
  );

  const renderDateOption = (date: Date, index: number) => {
    const isSelected = selectedDate &&
      date.toDateString() === selectedDate.toDateString();

    return (
      <TouchableOpacity
        key={index}
        style={[styles.dateCard, isSelected && styles.dateCardSelected]}
        onPress={() => {
          setSelectedDate(date);
          setSelectedSlot(null);
        }}
      >
        <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>
          {date.toLocaleDateString('nb-NO', { weekday: 'short' })}
        </Text>
        <Text style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}>
          {date.getDate()}
        </Text>
        <Text style={[styles.dateMonth, isSelected && styles.dateMonthSelected]}>
          {date.toLocaleDateString('nb-NO', { month: 'short' })}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTimeSlot = (slot: AvailableSlot, index: number) => {
    const isSelected = selectedSlot?.startTime === slot.startTime;

    return (
      <TouchableOpacity
        key={index}
        style={[styles.timeSlot, isSelected && styles.timeSlotSelected]}
        onPress={() => setSelectedSlot(slot)}
      >
        <View style={styles.timeSlotContent}>
          <Ionicons
            name="time-outline"
            size={20}
            color={isSelected ? '#FFF' : '#3B82F6'}
          />
          <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextSelected]}>
            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Container maxWidth={600}>
          {/* Credits Display */}
          {credits && (
            <View style={styles.creditsCard}>
              <View style={styles.creditsHeader}>
                <Ionicons name="trophy-outline" size={20} color="#3B82F6" />
                <Text style={styles.creditsText}>
                  Tilgjengelige PT-timer: <Text style={styles.creditsNumber}>{credits.available}</Text>
                </Text>
              </View>
              {credits.available === 0 && (
                <TouchableOpacity
                  style={styles.buyMoreButton}
                  onPress={() => navigation.navigate('PTShop')}
                >
                  <Ionicons name="cart-outline" size={16} color="#FFF" />
                  <Text style={styles.buyMoreText}>Kjøp flere timer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Step 1: Select Trainer */}
          <View style={styles.section}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Velg trener</Text>
            </View>
            <TouchableOpacity
              style={styles.trainerSelector}
              onPress={() => setTrainerModalVisible(true)}
            >
              {selectedTrainer ? (
                <View style={styles.selectedTrainerRow}>
                  <View style={styles.selectedTrainerAvatar}>
                    <Text style={styles.selectedTrainerInitials}>
                      {selectedTrainer.firstName[0]}
                      {selectedTrainer.lastName[0]}
                    </Text>
                  </View>
                  <Text style={styles.selectedTrainerText}>
                    {selectedTrainer.firstName} {selectedTrainer.lastName}
                  </Text>
                </View>
              ) : (
                <Text style={styles.trainerSelectorPlaceholder}>
                  Trykk for å velge trener
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Step 2: Select Date */}
          {selectedTrainer && (
            <View style={styles.section}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Velg dato</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.datesScroll}
                contentContainerStyle={styles.datesContainer}
              >
                {dateOptions.map((date, index) => renderDateOption(date, index))}
              </ScrollView>
            </View>
          )}

          {/* Step 3: Select Time */}
          {selectedTrainer && selectedDate && (
            <View style={styles.section}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepTitle}>Velg tidspunkt</Text>
              </View>

              {loadingSlots ? (
                <View style={styles.loadingSlots}>
                  <ActivityIndicator color="#3B82F6" />
                  <Text style={styles.loadingSlotsText}>Laster ledige tider...</Text>
                </View>
              ) : availableSlots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.noSlotsText}>
                    Ingen ledige tider på denne dagen
                  </Text>
                  <Text style={styles.noSlotsHint}>
                    Prøv en annen dag eller trener
                  </Text>
                </View>
              ) : (
                <View style={styles.timeSlotsContainer}>
                  {availableSlots.map((slot, index) => renderTimeSlot(slot, index))}
                </View>
              )}
            </View>
          )}

          {/* Step 4: Additional Details */}
          {selectedTrainer && selectedDate && selectedSlot && (
            <View style={styles.section}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepTitle}>Detaljer</Text>
              </View>

              <View style={styles.formCard}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tittel</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Hva skal du trene?"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Lokasjon</Text>
                  <TextInput
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Hvor skal økten være?"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Notater (valgfritt)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Eventuelle skader, fokusområder eller annen info til treneren..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Book Button */}
          {selectedTrainer && selectedDate && selectedSlot && (
            <TouchableOpacity
              style={[
                styles.bookButton,
                (booking || !credits || credits.available < 1) &&
                  styles.bookButtonDisabled,
              ]}
              onPress={handleBookSession}
              disabled={booking || !credits || credits.available < 1}
            >
              {booking ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
                  <Text style={styles.bookButtonText}>Book PT-time</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {(!credits || credits.available < 1) && selectedSlot && (
            <Text style={styles.warningText}>
              Du må ha minst 1 tilgjengelig PT-time for å booke
            </Text>
          )}
        </Container>
      </ScrollView>

      {/* Trainer Selection Modal */}
      <Modal
        visible={trainerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTrainerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Velg trener</Text>
              <TouchableOpacity
                onPress={() => setTrainerModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={trainers}
              keyExtractor={(item) => item.id}
              renderItem={renderTrainerItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="person-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Ingen trenere tilgjengelig</Text>
                </View>
              }
            />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 16,
  },
  creditsCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditsText: {
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: '600',
  },
  creditsNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  buyMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  buyMoreText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  trainerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFF',
  },
  selectedTrainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedTrainerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTrainerInitials: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedTrainerText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  trainerSelectorPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  datesScroll: {
    marginHorizontal: -16,
  },
  datesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  dateCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    minWidth: 70,
  },
  dateCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  dateDay: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateDaySelected: {
    color: '#3B82F6',
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginVertical: 4,
  },
  dateNumberSelected: {
    color: '#3B82F6',
  },
  dateMonth: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  dateMonthSelected: {
    color: '#3B82F6',
  },
  loadingSlots: {
    padding: 32,
    alignItems: 'center',
  },
  loadingSlotsText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  noSlotsContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  noSlotsHint: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  timeSlotsContainer: {
    gap: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  timeSlotSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  timeSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  timeSlotTextSelected: {
    color: '#FFF',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 18,
    gap: 12,
    marginTop: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
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
    maxHeight: '80%',
    paddingBottom: 20,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  trainerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  trainerItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  trainerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trainerInitials: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  trainerNameSelected: {
    color: '#1E40AF',
  },
  trainerEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formGroup: {
    marginBottom: 16,
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
    backgroundColor: '#FFF',
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
