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
      <View key={day.key} style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          {dayAvailability ? (
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={16} color="#059669" />
              <Text style={styles.timeText}>
                {dayAvailability.startTime} - {dayAvailability.endTime}
              </Text>
            </View>
          ) : (
            <Text style={styles.notAvailableText}>Ikke tilgjengelig</Text>
          )}
        </View>

        <View style={styles.dayActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openAddModal(day.key)}
          >
            <Ionicons
              name={dayAvailability ? 'create-outline' : 'add-circle-outline'}
              size={20}
              color="#3B82F6"
            />
            <Text style={styles.editButtonText}>
              {dayAvailability ? 'Rediger' : 'Legg til'}
            </Text>
          </TouchableOpacity>

          {dayAvailability && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(dayAvailability.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Slett</Text>
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
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Laster...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container title="Min Tilgjengelighet">
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Sett opp din ukentlige arbeidsplan. Kunder kan kun booke timer i disse tidsrommene.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ukentlig Timeplan</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Rediger Tilgjengelighet' : 'Legg til Tilgjengelighet'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.selectedDayText}>
                {DAYS_OF_WEEK.find(d => d.key === selectedDay)?.label}
              </Text>

              <View style={styles.timeSelectionRow}>
                <View style={styles.timeSelection}>
                  <Text style={styles.timeLabel}>Fra</Text>
                  <ScrollView
                    style={styles.timeScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {TIME_OPTIONS.map(time => (
                      <TouchableOpacity
                        key={`start-${time}`}
                        style={[
                          styles.timeOption,
                          startTime === time && styles.timeOptionSelected,
                        ]}
                        onPress={() => setStartTime(time)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            startTime === time && styles.timeOptionTextSelected,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timeSelection}>
                  <Text style={styles.timeLabel}>Til</Text>
                  <ScrollView
                    style={styles.timeScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {TIME_OPTIONS.map(time => (
                      <TouchableOpacity
                        key={`end-${time}`}
                        style={[
                          styles.timeOption,
                          endTime === time && styles.timeOptionSelected,
                        ]}
                        onPress={() => setEndTime(time)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            endTime === time && styles.timeOptionTextSelected,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Lagre</Text>
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
    backgroundColor: '#F9FAFB',
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
    color: '#6B7280',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#111827',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
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
    color: '#9CA3AF',
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
  editButton: {
    backgroundColor: '#EFF6FF',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
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
  modalBody: {
    padding: 20,
  },
  selectedDayText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
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
    color: '#374151',
    marginBottom: 8,
  },
  timeScroll: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  timeOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timeOptionSelected: {
    backgroundColor: '#3B82F6',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
