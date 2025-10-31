import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { api } from '../services/api';
import Container from '../components/Container';
import { useAuth } from '../contexts/AuthContext';
import type { PTSession, PTSessionStatus } from '../types';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function EditPTSessionScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [customers, setCustomers] = useState<User[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [session, setSession] = useState<PTSession | null>(null);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<PTSessionStatus>('SCHEDULED');

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Dropdown modals
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showTrainerDropdown, setShowTrainerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [trainerSearch, setTrainerSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingSession(true);

      // Load session data and users in parallel
      const [sessionsRes, usersRes] = await Promise.all([
        api.getPTSessions(),
        api.getUsers(),
      ]);

      // Find the specific session
      if (sessionsRes.success && sessionsRes.data) {
        const foundSession = sessionsRes.data.find((s: PTSession) => s.id === sessionId);
        if (foundSession) {
          setSession(foundSession);
          // Pre-fill form
          setTitle(foundSession.title);
          setDescription(foundSession.description || '');
          setStartDate(new Date(foundSession.startTime));
          setEndDate(new Date(foundSession.endTime));
          setLocation(foundSession.location || '');
          setNotes(foundSession.notes || '');
          setStatus(foundSession.status);
          setSelectedCustomerId(foundSession.customer.id);
          setSelectedTrainerId(foundSession.trainer.id);
        } else {
          Alert.alert('Feil', 'Kunne ikke finne PT-økt');
          navigation.goBack();
          return;
        }
      }

      // Load users
      if (usersRes.success) {
        const users = usersRes.data || [];
        const customerList = users.filter((u: User) => u.role === 'CUSTOMER');
        setCustomers(customerList);

        if (isAdmin) {
          const trainerList = users.filter(
            (u: User) => u.role === 'TRAINER' || u.role === 'ADMIN'
          );
          setTrainers(trainerList);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Feil', 'Kunne ikke laste data');
    } finally {
      setLoadingSession(false);
    }
  };

  // Filter functions
  const filterCustomers = () => {
    if (!customerSearch.trim()) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(customer =>
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
    );
  };

  const filterTrainers = () => {
    if (!trainerSearch.trim()) return trainers;
    const search = trainerSearch.toLowerCase();
    return trainers.filter(trainer =>
      `${trainer.firstName} ${trainer.lastName}`.toLowerCase().includes(search) ||
      trainer.email?.toLowerCase().includes(search)
    );
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
        clientId: selectedCustomerId,
        trainerId: isAdmin ? selectedTrainerId : session?.trainer.id,
        status,
      };

      const response = await api.updatePTSession(sessionId, sessionData);

      if (response.success) {
        Alert.alert('Suksess', 'PT-økt oppdatert', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Feil', response.error || 'Kunne ikke oppdatere PT-økt');
      }
    } catch (error) {
      console.error('Failed to update PT session:', error);
      Alert.alert('Feil', 'Kunne ikke oppdatere PT-økt');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Avlys økt',
      'Er du sikker på at du vil avlyse denne økten?',
      [
        { text: 'Nei', style: 'cancel' },
        {
          text: 'Ja, avlys',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.cancelPTSession(sessionId);
              if (response.success) {
                Alert.alert('Suksess', 'PT-økt avlyst', [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]);
              } else {
                Alert.alert('Feil', 'Kunne ikke avlyse PT-økt');
              }
            } catch (error) {
              console.error('Failed to cancel PT session:', error);
              Alert.alert('Feil', 'Kunne ikke avlyse PT-økt');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Slett økt',
      'Er du sikker på at du vil slette denne økten permanent?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.deletePTSession(sessionId);
              if (response.success) {
                Alert.alert('Suksess', 'PT-økt slettet', [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]);
              } else {
                Alert.alert('Feil', 'Kunne ikke slette PT-økt');
              }
            } catch (error) {
              console.error('Failed to delete PT session:', error);
              Alert.alert('Feil', 'Kunne ikke slette PT-økt');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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

  if (loadingSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Kunne ikke laste PT-økt</Text>
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
        <Text style={styles.title}>Rediger PT-økt</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <Container>
          {/* Status */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={status}
                onValueChange={(value) => setStatus(value as PTSessionStatus)}
                style={styles.picker}
              >
                <Picker.Item label="Planlagt" value="SCHEDULED" />
                <Picker.Item label="Bekreftet" value="CONFIRMED" />
                <Picker.Item label="Fullført" value="COMPLETED" />
                <Picker.Item label="Avlyst" value="CANCELLED" />
                <Picker.Item label="Ikke møtt" value="NO_SHOW" />
              </Picker>
            </View>
          </View>

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

          {/* Customer Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Kunde <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowCustomerDropdown(true)}
            >
              <View style={styles.dropdownContent}>
                {selectedCustomerId ? (
                  <>
                    <View style={styles.dropdownAvatar}>
                      <Text style={styles.dropdownAvatarText}>
                        {customers.find(c => c.id === selectedCustomerId)?.firstName?.charAt(0)}
                        {customers.find(c => c.id === selectedCustomerId)?.lastName?.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.dropdownInfo}>
                      <Text style={styles.dropdownName}>
                        {customers.find(c => c.id === selectedCustomerId)?.firstName} {customers.find(c => c.id === selectedCustomerId)?.lastName}
                      </Text>
                      <Text style={styles.dropdownEmail}>
                        {customers.find(c => c.id === selectedCustomerId)?.email}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.dropdownPlaceholder}>Velg kunde...</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Trainer Selection (Admin only) */}
          {isAdmin && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Trener <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowTrainerDropdown(true)}
              >
                <View style={styles.dropdownContent}>
                  {selectedTrainerId ? (
                    <>
                      <View style={[styles.dropdownAvatar, styles.dropdownAvatarTrainer]}>
                        <Text style={styles.dropdownAvatarText}>
                          {trainers.find(t => t.id === selectedTrainerId)?.firstName?.charAt(0)}
                          {trainers.find(t => t.id === selectedTrainerId)?.lastName?.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.dropdownInfo}>
                        <Text style={styles.dropdownName}>
                          {trainers.find(t => t.id === selectedTrainerId)?.firstName} {trainers.find(t => t.id === selectedTrainerId)?.lastName}
                        </Text>
                        <Text style={styles.dropdownEmail}>
                          {trainers.find(t => t.id === selectedTrainerId)?.email}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.dropdownPlaceholder}>Velg trener...</Text>
                  )}
                </View>
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
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

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Update Button */}
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
                  <Text style={styles.submitButtonText}>Lagre endringer</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel Session Button */}
            {status !== 'CANCELLED' && status !== 'COMPLETED' && (
              <TouchableOpacity
                style={[styles.cancelButton, loading && styles.submitButtonDisabled]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Ionicons name="close-circle-outline" size={20} color="#F59E0B" />
                <Text style={styles.cancelButtonText}>Avlys økt</Text>
              </TouchableOpacity>
            )}

            {/* Delete Button (Admin only) */}
            {isAdmin && (
              <TouchableOpacity
                style={[styles.deleteButton, loading && styles.submitButtonDisabled]}
                onPress={handleDelete}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Slett økt</Text>
              </TouchableOpacity>
            )}
          </View>
        </Container>
      </ScrollView>

      {/* Date/Time Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={startDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartTimePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={endDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndTimePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}

      {/* Customer Dropdown Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCustomerDropdown}
        onRequestClose={() => setShowCustomerDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Velg kunde</Text>
              <TouchableOpacity onPress={() => setShowCustomerDropdown(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Søk etter kunde..."
                placeholderTextColor="#9CA3AF"
                value={customerSearch}
                onChangeText={setCustomerSearch}
                autoCapitalize="none"
              />
              {customerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCustomerSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filterCustomers()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalPersonItem}
                  onPress={() => {
                    setSelectedCustomerId(item.id);
                    setCustomerSearch('');
                    setShowCustomerDropdown(false);
                  }}
                >
                  <View style={styles.modalPersonContent}>
                    <View style={styles.modalAvatarCustomer}>
                      <Text style={styles.modalAvatarText}>
                        {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.modalPersonInfo}>
                      <Text style={styles.modalPersonName}>
                        {item.firstName} {item.lastName}
                      </Text>
                      {item.email && (
                        <Text style={styles.modalPersonEmail}>{item.email}</Text>
                      )}
                    </View>
                  </View>
                  {selectedCustomerId === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.modalEmptyTitle}>
                    {customerSearch ? 'Ingen treff' : 'Ingen kunder funnet'}
                  </Text>
                </View>
              }
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
              contentContainerStyle={styles.modalListContent}
            />
          </View>
        </View>
      </Modal>

      {/* Trainer Dropdown Modal */}
      {isAdmin && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showTrainerDropdown}
          onRequestClose={() => setShowTrainerDropdown(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Velg trener</Text>
                <TouchableOpacity onPress={() => setShowTrainerDropdown(false)}>
                  <Ionicons name="close" size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalSearchContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.modalSearchIcon} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Søk etter trener..."
                  placeholderTextColor="#9CA3AF"
                  value={trainerSearch}
                  onChangeText={setTrainerSearch}
                  autoCapitalize="none"
                />
                {trainerSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setTrainerSearch('')}>
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filterTrainers()}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalPersonItem}
                    onPress={() => {
                      setSelectedTrainerId(item.id);
                      setTrainerSearch('');
                      setShowTrainerDropdown(false);
                    }}
                  >
                    <View style={styles.modalPersonContent}>
                      <View style={styles.modalAvatarTrainer}>
                        <Text style={styles.modalAvatarText}>
                          {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.modalPersonInfo}>
                        <Text style={styles.modalPersonName}>
                          {item.firstName} {item.lastName}
                        </Text>
                        {item.email && (
                          <Text style={styles.modalPersonEmail}>{item.email}</Text>
                        )}
                      </View>
                    </View>
                    {selectedTrainerId === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.modalEmptyContainer}>
                    <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.modalEmptyTitle}>
                      {trainerSearch ? 'Ingen treff' : 'Ingen trenere funnet'}
                    </Text>
                  </View>
                }
                ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
                contentContainerStyle={styles.modalListContent}
              />
            </View>
          </View>
        </Modal>
      )}
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
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  pickerContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
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
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    minHeight: 56,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dropdownAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownAvatarTrainer: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  dropdownAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
  },
  dropdownInfo: {
    flex: 1,
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  dropdownEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
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
    maxHeight: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  modalSearchIcon: {
    marginRight: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  modalListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalPersonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  modalPersonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  modalAvatarCustomer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarTrainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
  },
  modalPersonInfo: {
    flex: 1,
  },
  modalPersonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  modalPersonEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  modalEmptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
});
