import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';
import Container from '../components/Container';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function CreatePTSessionScreen({ navigation }: any) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<User[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedTrainerId, setSelectedTrainerId] = useState(user?.userId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Modal picker state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);

      // Load customers (for trainers and admins)
      if (isAdmin || user?.role === 'TRAINER') {
        const clientsResponse = await api.getPTClients();
        if (clientsResponse.success) {
          setCustomers(clientsResponse.data || []);
        }
      }

      // Load trainers (for customers and admins)
      if (isAdmin || user?.role === 'CUSTOMER') {
        const trainersResponse = await api.getPTTrainers();
        if (trainersResponse.success) {
          setTrainers(trainersResponse.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Feil', 'Kunne ikke laste brukere');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Helper function to close all pickers
  const closeAllPickers = () => {
    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Feil', 'Vennligst oppgi en tittel');
      return;
    }

    if (!selectedCustomerId) {
      Alert.alert('Feil', 'Vennligst velg en kunde');
      return;
    }

    if (startDate >= endDate) {
      Alert.alert('Feil', 'Sluttidspunkt må være etter starttidspunkt');
      return;
    }

    try {
      setLoading(true);

      const sessionData = {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        customerId: selectedCustomerId,
        trainerId: isAdmin ? selectedTrainerId : user?.userId,
        status: 'SCHEDULED',
      };

      const response = await api.createPTSession(sessionData);

      if (response.success) {
        Alert.alert('Suksess', 'PT-økt opprettet', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Feil', response.error || 'Kunne ikke opprette PT-økt');
      }
    } catch (error) {
      console.error('Failed to create PT session:', error);
      Alert.alert('Feil', 'Kunne ikke opprette PT-økt');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loadingUsers) {
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Ny PT-økt</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView}>
          <Container>
            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Tittel <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="F.eks. Styrketrening"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Beskrivelse</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Beskrivelse av økten..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Customer Selection (for Trainers and Admins) */}
            {(user?.role === 'TRAINER' || isAdmin) && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Kunde <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowCustomerModal(true)}
                >
                  <Text style={selectedCustomerId ? styles.selectButtonTextSelected : styles.selectButtonText}>
                    {selectedCustomerId
                      ? customers.find(c => c.id === selectedCustomerId)?.firstName + ' ' + customers.find(c => c.id === selectedCustomerId)?.lastName
                      : 'Velg kunde...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}

            {/* Trainer Selection (for Customers and Admins) */}
            {(user?.role === 'CUSTOMER' || isAdmin) && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Trener <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowTrainerModal(true)}
                >
                  <Text style={selectedTrainerId ? styles.selectButtonTextSelected : styles.selectButtonText}>
                    {selectedTrainerId
                      ? trainers.find(t => t.id === selectedTrainerId)?.firstName + ' ' + trainers.find(t => t.id === selectedTrainerId)?.lastName
                      : 'Velg trener...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}

            {/* Start Date and Time */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Starttidspunkt <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.dateButton, { flex: 1 }]}
                  onPress={() => {
                    closeAllPickers();
                    setShowStartDatePicker(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  <Text style={styles.dateButtonText}>
                    {formatDate(startDate)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateButton, { flex: 1 }]}
                  onPress={() => {
                    closeAllPickers();
                    setShowStartTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color="#6B7280" />
                  <Text style={styles.dateButtonText}>
                    {formatTime(startDate)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* End Date and Time */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Sluttidspunkt <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.dateButton, { flex: 1 }]}
                  onPress={() => {
                    closeAllPickers();
                    setShowEndDatePicker(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateButton, { flex: 1 }]}
                  onPress={() => {
                    closeAllPickers();
                    setShowEndTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color="#6B7280" />
                  <Text style={styles.dateButtonText}>{formatTime(endDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Lokasjon</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="F.eks. Treningssenter A"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Notater</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Interne notater..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>Opprett økt</Text>
                </>
              )}
            </TouchableOpacity>
          </Container>
        </ScrollView>

        {/* Date/Time Pickers with backdrop */}
        {(showStartDatePicker || showStartTimePicker || showEndDatePicker || showEndTimePicker) && Platform.OS === 'ios' && (
          <Modal
            transparent
            animationType="slide"
            visible={true}
            onRequestClose={closeAllPickers}
          >
            <TouchableWithoutFeedback onPress={closeAllPickers}>
              <View style={styles.pickerModalOverlay}>
                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                  <View style={styles.pickerModalContent}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={closeAllPickers}>
                        <Text style={styles.pickerDoneText}>Ferdig</Text>
                      </TouchableOpacity>
                    </View>
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            // Preserve the time from existing startDate
                            const newDate = new Date(selectedDate);
                            newDate.setHours(startDate.getHours());
                            newDate.setMinutes(startDate.getMinutes());
                            newDate.setSeconds(0);
                            newDate.setMilliseconds(0);
                            setStartDate(newDate);
                          }
                        }}
                      />
                    )}
                    {showStartTimePicker && (
                      <DateTimePicker
                        value={startDate}
                        mode="time"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            // Preserve the date from existing startDate, update time
                            const newDate = new Date(startDate);
                            newDate.setHours(selectedDate.getHours());
                            newDate.setMinutes(selectedDate.getMinutes());
                            newDate.setSeconds(0);
                            newDate.setMilliseconds(0);
                            setStartDate(newDate);
                            // Auto-set end time to 1 hour later
                            const newEndDate = new Date(newDate.getTime() + 60 * 60 * 1000);
                            setEndDate(newEndDate);
                          }
                        }}
                      />
                    )}
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            // Preserve the time from existing endDate
                            const newDate = new Date(selectedDate);
                            newDate.setHours(endDate.getHours());
                            newDate.setMinutes(endDate.getMinutes());
                            newDate.setSeconds(0);
                            newDate.setMilliseconds(0);
                            setEndDate(newDate);
                          }
                        }}
                      />
                    )}
                    {showEndTimePicker && (
                      <DateTimePicker
                        value={endDate}
                        mode="time"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            // Preserve the date from existing endDate, update time
                            const newDate = new Date(endDate);
                            newDate.setHours(selectedDate.getHours());
                            newDate.setMinutes(selectedDate.getMinutes());
                            newDate.setSeconds(0);
                            newDate.setMilliseconds(0);
                            setEndDate(newDate);
                          }
                        }}
                      />
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {/* Android Date/Time Pickers */}
        {showStartDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                // Preserve the time from existing startDate
                const newDate = new Date(selectedDate);
                newDate.setHours(startDate.getHours());
                newDate.setMinutes(startDate.getMinutes());
                newDate.setSeconds(0);
                newDate.setMilliseconds(0);
                setStartDate(newDate);
              }
            }}
          />
        )}

        {showStartTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={startDate}
            mode="time"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartTimePicker(false);
              if (event.type === 'set' && selectedDate) {
                // Preserve the date from existing startDate, update time
                const newDate = new Date(startDate);
                newDate.setHours(selectedDate.getHours());
                newDate.setMinutes(selectedDate.getMinutes());
                newDate.setSeconds(0);
                newDate.setMilliseconds(0);
                setStartDate(newDate);
                // Auto-set end time to 1 hour later
                const newEndDate = new Date(newDate.getTime() + 60 * 60 * 1000);
                setEndDate(newEndDate);
              }
            }}
          />
        )}

        {showEndDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                // Preserve the time from existing endDate
                const newDate = new Date(selectedDate);
                newDate.setHours(endDate.getHours());
                newDate.setMinutes(endDate.getMinutes());
                newDate.setSeconds(0);
                newDate.setMilliseconds(0);
                setEndDate(newDate);
              }
            }}
          />
        )}

        {showEndTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={endDate}
            mode="time"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndTimePicker(false);
              if (event.type === 'set' && selectedDate) {
                // Preserve the date from existing endDate, update time
                const newDate = new Date(endDate);
                newDate.setHours(selectedDate.getHours());
                newDate.setMinutes(selectedDate.getMinutes());
                newDate.setSeconds(0);
                newDate.setMilliseconds(0);
                setEndDate(newDate);
              }
            }}
          />
        )}

        {/* Customer Selection Modal */}
        <Modal
          visible={showCustomerModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowCustomerModal(false);
            setSearchQuery('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Velg kunde</Text>
                <TouchableOpacity onPress={() => {
                  setShowCustomerModal(false);
                  setSearchQuery('');
                }}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Søk kunde..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <FlatList
                data={customers.filter(c =>
                  `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => {
                      setSelectedCustomerId(item.id);
                      setShowCustomerModal(false);
                      setSearchQuery('');
                    }}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemText}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.listItemSubtext}>{item.email}</Text>
                    </View>
                    {selectedCustomerId === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Ingen kunder funnet</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>

        {/* Trainer Selection Modal */}
        <Modal
          visible={showTrainerModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowTrainerModal(false);
            setSearchQuery('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Velg trener</Text>
                <TouchableOpacity onPress={() => {
                  setShowTrainerModal(false);
                  setSearchQuery('');
                }}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Søk trener..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <FlatList
                data={trainers.filter(t =>
                  `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => {
                      setSelectedTrainerId(item.id);
                      setShowTrainerModal(false);
                      setSearchQuery('');
                    }}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemText}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.listItemSubtext}>{item.email}</Text>
                    </View>
                    {selectedTrainerId === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Ingen trenere funnet</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
    width: '100%',
  },
  pickerItem: {
    height: Platform.OS === 'ios' ? 120 : undefined,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 0,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  selectButtonTextSelected: {
    fontSize: 16,
    color: '#111827',
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
    paddingTop: 20,
    paddingHorizontal: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  listItemContent: {
    flex: 1,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  listItemSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickerDoneText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
