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
import { useTheme } from '../contexts/ThemeContext';
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
  const { colors } = useTheme();
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
        { borderBottomColor: colors.borderLight },
        selectedTrainer?.id === item.id && { backgroundColor: colors.background },
      ]}
      onPress={() => {
        setSelectedTrainer(item);
        setSelectedSlot(null);
        setTrainerModalVisible(false);
      }}
    >
      <View style={[styles.trainerAvatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.trainerInitials, { color: colors.cardBg }]}>
          {item.firstName[0]}
          {item.lastName[0]}
        </Text>
      </View>
      <View style={styles.trainerInfo}>
        <Text
          style={[
            styles.trainerName,
            { color: selectedTrainer?.id === item.id ? colors.primary : colors.text },
          ]}
        >
          {item.firstName} {item.lastName}
        </Text>
        <Text style={[styles.trainerEmail, { color: colors.textSecondary }]}>{item.email}</Text>
      </View>
      {selectedTrainer?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
      )}
    </TouchableOpacity>
  );

  const renderDateOption = (date: Date, index: number) => {
    const isSelected = selectedDate &&
      date.toDateString() === selectedDate.toDateString();

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dateCard,
          { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.background : colors.cardBg },
        ]}
        onPress={() => {
          setSelectedDate(date);
          setSelectedSlot(null);
        }}
      >
        <Text style={[styles.dateDay, { color: isSelected ? colors.primary : colors.textSecondary }]}>
          {date.toLocaleDateString('nb-NO', { weekday: 'short' })}
        </Text>
        <Text style={[styles.dateNumber, { color: isSelected ? colors.primary : colors.text }]}>
          {date.getDate()}
        </Text>
        <Text style={[styles.dateMonth, { color: isSelected ? colors.primary : colors.textSecondary }]}>
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
        style={[
          styles.timeSlot,
          { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : colors.cardBg },
        ]}
        onPress={() => setSelectedSlot(slot)}
      >
        <View style={styles.timeSlotContent}>
          <Ionicons
            name="time-outline"
            size={20}
            color={isSelected ? colors.cardBg : colors.primary}
          />
          <Text style={[styles.timeSlotText, { color: isSelected ? colors.cardBg : colors.text }]}>
            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={colors.cardBg} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Laster...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Container maxWidth={600}>
          {/* Credits Display */}
          {credits && (
            <View style={[styles.creditsCard, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
              <View style={styles.creditsHeader}>
                <Ionicons name="trophy-outline" size={20} color={colors.primary} />
                <Text style={[styles.creditsText, { color: colors.primary }]}>
                  Tilgjengelige PT-timer: <Text style={[styles.creditsNumber, { color: colors.primary }]}>{credits.available}</Text>
                </Text>
              </View>
              {credits.available === 0 && (
                <TouchableOpacity
                  style={[styles.buyMoreButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('PTShop')}
                >
                  <Ionicons name="cart-outline" size={16} color={colors.cardBg} />
                  <Text style={[styles.buyMoreText, { color: colors.cardBg }]}>Kjøp flere timer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Step 1: Select Trainer */}
          <View style={styles.section}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stepNumberText, { color: colors.cardBg }]}>1</Text>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Velg trener</Text>
            </View>
            <TouchableOpacity
              style={[styles.trainerSelector, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
              onPress={() => setTrainerModalVisible(true)}
            >
              {selectedTrainer ? (
                <View style={styles.selectedTrainerRow}>
                  <View style={[styles.selectedTrainerAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.selectedTrainerInitials, { color: colors.cardBg }]}>
                      {selectedTrainer.firstName[0]}
                      {selectedTrainer.lastName[0]}
                    </Text>
                  </View>
                  <Text style={[styles.selectedTrainerText, { color: colors.text }]}>
                    {selectedTrainer.firstName} {selectedTrainer.lastName}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.trainerSelectorPlaceholder, { color: colors.textLight }]}>
                  Trykk for å velge trener
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Step 2: Select Date */}
          {selectedTrainer && (
            <View style={styles.section}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.cardBg }]}>2</Text>
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Velg dato</Text>
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
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.cardBg }]}>3</Text>
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Velg tidspunkt</Text>
              </View>

              {loadingSlots ? (
                <View style={styles.loadingSlots}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.loadingSlotsText, { color: colors.textSecondary }]}>Laster ledige tider...</Text>
                </View>
              ) : availableSlots.length === 0 ? (
                <View style={[styles.noSlotsContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={48} color={colors.border} />
                  <Text style={[styles.noSlotsText, { color: colors.textSecondary }]}>
                    Ingen ledige tider på denne dagen
                  </Text>
                  <Text style={[styles.noSlotsHint, { color: colors.textLight }]}>
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
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: colors.cardBg }]}>4</Text>
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Detaljer</Text>
              </View>

              <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Tittel</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Hva skal du trene?"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Lokasjon</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Hvor skal økten være?"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Notater (valgfritt)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Eventuelle skader, fokusområder eller annen info til treneren..."
                    placeholderTextColor={colors.textLight}
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
                { backgroundColor: colors.success },
                (booking || !credits || credits.available < 1) &&
                  [styles.bookButtonDisabled, { backgroundColor: colors.textLight }],
              ]}
              onPress={handleBookSession}
              disabled={booking || !credits || credits.available < 1}
            >
              {booking ? (
                <ActivityIndicator color={colors.cardBg} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color={colors.cardBg} />
                  <Text style={[styles.bookButtonText, { color: colors.cardBg }]}>Book PT-time</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {(!credits || credits.available < 1) && selectedSlot && (
            <Text style={[styles.warningText, { color: colors.danger }]}>
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
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Velg trener</Text>
              <TouchableOpacity
                onPress={() => setTrainerModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={trainers}
              keyExtractor={(item) => item.id}
              renderItem={renderTrainerItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="person-outline" size={48} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>Ingen trenere tilgjengelig</Text>
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  creditsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  creditsNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  buyMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  buyMoreText: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  trainerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTrainerInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  selectedTrainerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  trainerSelectorPlaceholder: {
    fontSize: 16,
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
    minWidth: 70,
  },
  dateCardSelected: {
  },
  dateDay: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateDaySelected: {
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 4,
  },
  dateNumberSelected: {
  },
  dateMonth: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  dateMonthSelected: {
  },
  loadingSlots: {
    padding: 32,
    alignItems: 'center',
  },
  loadingSlotsText: {
    marginTop: 12,
    fontSize: 14,
  },
  noSlotsContainer: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  noSlotsHint: {
    fontSize: 14,
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
  },
  timeSlotSelected: {
  },
  timeSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeSlotTextSelected: {
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 18,
    gap: 12,
    marginTop: 8,
  },
  bookButtonDisabled: {
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  trainerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  trainerItemSelected: {
  },
  trainerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trainerInitials: {
    fontSize: 18,
    fontWeight: '700',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trainerNameSelected: {
  },
  trainerEmail: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  formCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
