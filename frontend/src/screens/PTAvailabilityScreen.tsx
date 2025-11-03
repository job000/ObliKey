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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Container from '../components/Container';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface Availability {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const DAYS_OF_WEEK = [
  { key: 'MONDAY', label: 'Mandag' },
  { key: 'TUESDAY', label: 'Tirsdag' },
  { key: 'WEDNESDAY', label: 'Onsdag' },
  { key: 'THURSDAY', label: 'Torsdag' },
  { key: 'FRIDAY', label: 'Fredag' },
  { key: 'SATURDAY', label: 'Lørdag' },
  { key: 'SUNDAY', label: 'Søndag' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

export default function PTAvailabilityScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const response = await api.getPTTrainerAvailability();

      if (response.success && response.data) {
        setAvailability(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load availability:', error);
      Alert.alert('Feil', 'Kunne ikke laste tilgjengelighet');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (day: string) => {
    const existing = availability.find(a => a.dayOfWeek === day);

    if (existing) {
      setEditingId(existing.id);
      setStartTime(existing.startTime);
      setEndTime(existing.endTime);
    } else {
      setEditingId(null);
      setStartTime('09:00');
      setEndTime('17:00');
    }

    setSelectedDay(day);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedDay) return;

    if (startTime >= endTime) {
      Alert.alert('Feil', 'Starttid må være før sluttid');
      return;
    }

    try {
      if (editingId) {
        // Update existing
        await api.updatePTTrainerAvailability(editingId, {
          startTime,
          endTime,
          isActive: true,
        });
      } else {
        // Create new
        await api.setPTTrainerAvailability({
          dayOfWeek: selectedDay,
          startTime,
          endTime,
        });
      }

      Alert.alert('Suksess', 'Tilgjengelighet lagret');
      setModalVisible(false);
      loadAvailability();
    } catch (error: any) {
      console.error('Failed to save availability:', error);
      Alert.alert('Feil', 'Kunne ikke lagre tilgjengelighet');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Bekreft sletting',
      'Er du sikker på at du vil slette denne tilgjengeligheten?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deletePTTrainerAvailability(id);
              Alert.alert('Suksess', 'Tilgjengelighet slettet');
              loadAvailability();
            } catch (error: any) {
              console.error('Failed to delete availability:', error);
              Alert.alert('Feil', 'Kunne ikke slette tilgjengelighet');
            }
          },
        },
      ]
    );
  };

  const renderDayCard = (day: { key: string; label: string }) => {
    const dayAvailability = availability.find(a => a.dayOfWeek === day.key);

    return (
      <View key={day.key} style={[styles.dayCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.dayHeader}>
          <Text style={[styles.dayLabel, { color: colors.text }]}>{day.label}</Text>
          {dayAvailability ? (
            <View style={[styles.timeChip, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="time-outline" size={16} color="#059669" />
              <Text style={styles.timeText}>
                {dayAvailability.startTime} - {dayAvailability.endTime}
              </Text>
            </View>
          ) : (
            <Text style={[styles.notAvailableText, { color: colors.textLight }]}>Ikke tilgjengelig</Text>
          )}
        </View>

        <View style={styles.dayActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton, { backgroundColor: '#EFF6FF' }]}
            onPress={() => openAddModal(day.key)}
          >
            <Ionicons
              name={dayAvailability ? 'create-outline' : 'add-circle-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.editButtonText, { color: colors.primary }]}>
              {dayAvailability ? 'Rediger' : 'Legg til'}
            </Text>
          </TouchableOpacity>

          {dayAvailability && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton, { backgroundColor: '#FEE2E2' }]}
              onPress={() => handleDelete(dayAvailability.id)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Slett</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Container title="Min Tilgjengelighet">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Laster...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container title="Min Tilgjengelighet">
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.infoCard, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: '#1E40AF' }]}>
            Sett opp din ukentlige arbeidsplan. Kunder kan kun booke timer i disse tidsrommene.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ukentlig Timeplan</Text>
          {DAYS_OF_WEEK.map(renderDayCard)}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingId ? 'Rediger Tilgjengelighet' : 'Legg til Tilgjengelighet'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.selectedDayText, { color: colors.text }]}>
                {DAYS_OF_WEEK.find(d => d.key === selectedDay)?.label}
              </Text>

              <View style={styles.timeSelectionRow}>
                <View style={styles.timeSelection}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Fra</Text>
                  <ScrollView
                    style={[styles.timeScroll, { borderColor: colors.border, backgroundColor: colors.background }]}
                    showsVerticalScrollIndicator={false}
                  >
                    {TIME_OPTIONS.map(time => (
                      <TouchableOpacity
                        key={`start-${time}`}
                        style={[
                          styles.timeOption,
                          { borderBottomColor: colors.border },
                          startTime === time && { backgroundColor: colors.primary }
                        ]}
                        onPress={() => setStartTime(time)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            { color: startTime === time ? colors.cardBg : colors.text }
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timeSelection}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Til</Text>
                  <ScrollView
                    style={[styles.timeScroll, { borderColor: colors.border, backgroundColor: colors.background }]}
                    showsVerticalScrollIndicator={false}
                  >
                    {TIME_OPTIONS.map(time => (
                      <TouchableOpacity
                        key={`end-${time}`}
                        style={[
                          styles.timeOption,
                          { borderBottomColor: colors.border },
                          endTime === time && { backgroundColor: colors.primary }
                        ]}
                        onPress={() => setEndTime(time)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            { color: endTime === time ? colors.cardBg : colors.text }
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.success }]}
                onPress={handleSave}
              >
                <Text style={[styles.saveButtonText, { color: colors.cardBg }]}>Lagre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  dayCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  notAvailableText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  dayActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  editButton: {},
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {},
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  modalBody: {
    padding: 20,
  },
  selectedDayText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  timeSelectionRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  timeSelection: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeScroll: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
  },
  timeOption: {
    padding: 12,
    borderBottomWidth: 1,
  },
  timeOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  saveButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
