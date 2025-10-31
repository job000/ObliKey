import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';
import type { PTSession } from '../types';

type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export default function PTManagementScreen({ navigation }: any) {
  const [sessions, setSessions] = useState<PTSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PTSession | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    customerId: '',
    trainerId: '',
  });

  // Lists for pickers
  const [trainers, setTrainers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // Search states
  const [trainerSearch, setTrainerSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Dropdown modals
  const [showTrainerDropdown, setShowTrainerDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date(Date.now() + 60 * 60 * 1000));

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    console.log('[PTManagement] State updated - Trainers:', trainers.length, 'Customers:', customers.length, 'Loading:', loadingLists);
  }, [trainers, customers, loadingLists]);

  useEffect(() => {
    console.log('[PTManagement] Trainer dropdown visibility changed:', showTrainerDropdown);
  }, [showTrainerDropdown]);

  useEffect(() => {
    console.log('[PTManagement] Customer dropdown visibility changed:', showCustomerDropdown);
  }, [showCustomerDropdown]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await api.getPTSessions();
      if (response.success) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error('Failed to load PT sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const loadTrainersAndCustomers = async () => {
    try {
      setLoadingLists(true);
      console.log('Loading trainers and customers...');
      console.log('loadingLists set to true');

      const [trainersRes, customersRes] = await Promise.all([
        api.getPTTrainers(),
        api.getPTClients(),
      ]);

      console.log('Trainers response:', trainersRes);
      console.log('Customers response:', customersRes);

      if (trainersRes.success) {
        const trainersData = trainersRes.data || [];
        console.log(`Loaded ${trainersData.length} trainers:`, trainersData);
        setTrainers(trainersData);
      }

      if (customersRes.success) {
        const customersData = customersRes.data || [];
        console.log(`Loaded ${customersData.length} customers:`, customersData);
        setCustomers(customersData);
      }

      console.log('Data loading complete. Setting loadingLists to false');
    } catch (error) {
      console.error('Failed to load trainers and customers:', error);
      Alert.alert('Feil', 'Kunne ikke laste PT og kunder. Prøv igjen.');
    } finally {
      setLoadingLists(false);
      console.log('loadingLists set to false');
    }
  };

  const filterTrainers = () => {
    if (!trainerSearch.trim()) return trainers;
    const search = trainerSearch.toLowerCase();
    return trainers.filter(trainer =>
      `${trainer.firstName} ${trainer.lastName}`.toLowerCase().includes(search) ||
      trainer.email?.toLowerCase().includes(search)
    );
  };

  const filterCustomers = () => {
    if (!customerSearch.trim()) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(customer =>
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
    );
  };

  const openAddModal = async () => {
    setEditMode(false);
    setSelectedSession(null);
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    setStartDateTime(now);
    setEndDateTime(later);
    setFormData({
      title: '',
      description: '',
      startTime: now.toISOString(),
      endTime: later.toISOString(),
      customerId: '',
      trainerId: '',
    });
    setTrainerSearch('');
    setCustomerSearch('');
    setModalVisible(true);
    await loadTrainersAndCustomers();
  };

  const openEditModal = async (session: PTSession) => {
    setEditMode(true);
    setSelectedSession(session);
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    setStartDateTime(start);
    setEndDateTime(end);
    setFormData({
      title: session.title,
      description: session.description || '',
      startTime: session.startTime,
      endTime: session.endTime,
      customerId: session.customerId || '',
      trainerId: session.trainerId || '',
    });
    setTrainerSearch('');
    setCustomerSearch('');
    setModalVisible(true);
    await loadTrainersAndCustomers();
  };

  const closeAllPickers = () => {
    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDateTime = new Date(startDateTime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setStartDateTime(newDateTime);
      setFormData({ ...formData, startTime: newDateTime.toISOString() });
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDateTime = new Date(startDateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setStartDateTime(newDateTime);
      setFormData({ ...formData, startTime: newDateTime.toISOString() });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDateTime = new Date(endDateTime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setEndDateTime(newDateTime);
      setFormData({ ...formData, endTime: newDateTime.toISOString() });
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDateTime = new Date(endDateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setEndDateTime(newDateTime);
      setFormData({ ...formData, endTime: newDateTime.toISOString() });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
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

  const handleSaveSession = async () => {
    if (!formData.title || !formData.startTime || !formData.endTime) {
      Alert.alert('Feil', 'Vennligst fyll ut alle obligatoriske felt');
      return;
    }

    if (!formData.customerId || !formData.trainerId) {
      Alert.alert('Feil', 'Du må velge både PT og kunde');
      return;
    }

    try {
      const sessionData = {
        title: formData.title,
        description: formData.description,
        startTime: formData.startTime,
        endTime: formData.endTime,
        customerId: formData.customerId,
        trainerId: formData.trainerId,
      };

      if (editMode && selectedSession) {
        const response = await api.updatePTSession(selectedSession.id, sessionData);
        if (response.success) {
          setSessions(
            sessions.map((s) => (s.id === selectedSession.id ? response.data : s))
          );
          Alert.alert('Suksess', 'PT-økt oppdatert');
        }
      } else {
        const response = await api.createPTSession(sessionData);
        if (response.success) {
          setSessions([response.data, ...sessions]);
          Alert.alert('Suksess', 'PT-økt opprettet');
        }
      }

      setModalVisible(false);
    } catch (error: any) {
      console.error('Save session error:', error);
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke lagre PT-økt');
    }
  };

  const handleUpdateStatus = async (sessionId: string, status: SessionStatus) => {
    try {
      const response = await api.updatePTSessionStatus(sessionId, status);
      if (response.success) {
        setSessions(
          sessions.map((s) => (s.id === sessionId ? { ...s, status } : s))
        );
        Alert.alert('Suksess', 'Status oppdatert');
      }
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke oppdatere status');
    }
  };

  const handleDeleteSession = (sessionId: string) => {
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
              await api.deletePTSession(sessionId);
              setSessions(sessions.filter((s) => s.id !== sessionId));
              Alert.alert('Suksess', 'PT-økt slettet');
            } catch (error: any) {
              Alert.alert(
                'Feil',
                error.response?.data?.error || 'Kunne ikke slette PT-økt'
              );
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return '#3B82F6';
      case 'COMPLETED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      case 'NO_SHOW':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'Planlagt';
      case 'COMPLETED':
        return 'Fullført';
      case 'CANCELLED':
        return 'Avlyst';
      case 'NO_SHOW':
        return 'Møtte ikke';
      default:
        return status;
    }
  };

  const getFilteredSessions = () => {
    const now = new Date();

    if (filter === 'upcoming') {
      return sessions.filter(
        (s) =>
          new Date(s.startTime) > now && s.status === 'SCHEDULED'
      );
    }
    if (filter === 'completed') {
      return sessions.filter((s) => s.status === 'COMPLETED');
    }
    return sessions;
  };

  const getSessionStats = () => {
    const total = sessions.length;
    const scheduled = sessions.filter((s) => s.status === 'SCHEDULED').length;
    const completed = sessions.filter((s) => s.status === 'COMPLETED').length;
    const noShow = sessions.filter((s) => s.status === 'NO_SHOW').length;

    return { total, scheduled, completed, noShow };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const filteredSessions = getFilteredSessions();
  const stats = getSessionStats();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <Container>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>PT-administrasjon</Text>
            <Text style={styles.subtitle}>Administrer PT-økter og kreditter</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Ny økt</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="barbell-outline" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Totalt</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="time-outline" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.scheduled}</Text>
            <Text style={styles.statLabel}>Planlagt</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Fullført</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{stats.noShow}</Text>
            <Text style={styles.statLabel}>Møtte ikke</Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              Alle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'upcoming' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('upcoming')}
          >
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
            <Text
              style={[
                styles.filterButtonText,
                filter === 'completed' && styles.filterButtonTextActive,
              ]}
            >
              Fullført
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sessions List */}
        <View style={styles.sessionsList}>
          {filteredSessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Ingen PT-økter funnet</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                <Text style={styles.emptyButtonText}>Opprett PT-økt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionDescription} numberOfLines={2}>
                      {session.description}
                    </Text>
                    <View style={styles.sessionMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                        <Text style={styles.metaText}>
                          {formatDate(session.startTime)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color="#6B7280" />
                        <Text style={styles.metaText}>
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(session.status) + '20',
                      },
                    ]}
                  >
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

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(session)}
                  >
                    <Ionicons name="create-outline" size={18} color="#3B82F6" />
                    <Text style={styles.editButtonText}>Rediger</Text>
                  </TouchableOpacity>

                  {session.status === 'SCHEDULED' && (
                    <>
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => handleUpdateStatus(session.id, 'COMPLETED')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                        <Text style={styles.completeButtonText}>Fullfør</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.noShowButton}
                        onPress={() => handleUpdateStatus(session.id, 'NO_SHOW')}
                      >
                        <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteSession(session.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </Container>

      {/* Add/Edit Session Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderContent}>
                      <View style={styles.modalIconContainer}>
                        <Ionicons name="barbell" size={24} color="#3B82F6" />
                      </View>
                      <View>
                        <Text style={styles.modalTitle}>
                          {editMode ? 'Rediger PT-økt' : 'Ny PT-økt'}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                          {editMode ? 'Oppdater detaljer for økten' : 'Fyll inn informasjon om økten'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.modalBody}
                    contentContainerStyle={styles.modalBodyContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    scrollEnabled={true}
                    nestedScrollEnabled={true}
                  >
                  <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="text-outline" size={16} color="#6B7280" />
                      <Text style={styles.label}>Tittel *</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={formData.title}
                      onChangeText={(text) =>
                        setFormData({ ...formData, title: text })
                      }
                      placeholder="Eks: PT-økt med John"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                      <Text style={styles.label}>Beskrivelse</Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.description}
                      onChangeText={(text) =>
                        setFormData({ ...formData, description: text })
                      }
                      placeholder="Beskrivelse av økten"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="fitness-outline" size={16} color="#6B7280" />
                      <Text style={styles.label}>Velg PT *</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => {
                        console.log('[PTManagement] Opening trainer dropdown. Trainers:', trainers.length);
                        setShowTrainerDropdown(true);
                      }}
                      disabled={loadingLists}
                    >
                      <View style={styles.dropdownContent}>
                        {formData.trainerId && trainers.find(t => t.id === formData.trainerId) ? (
                          <>
                            <View style={[styles.dropdownAvatar, styles.dropdownAvatarTrainer]}>
                              <Text style={styles.dropdownAvatarText}>
                                {trainers.find(t => t.id === formData.trainerId)?.firstName?.charAt(0)}
                                {trainers.find(t => t.id === formData.trainerId)?.lastName?.charAt(0)}
                              </Text>
                            </View>
                            <View style={styles.dropdownInfo}>
                              <Text style={styles.dropdownName}>
                                {trainers.find(t => t.id === formData.trainerId)?.firstName} {trainers.find(t => t.id === formData.trainerId)?.lastName}
                              </Text>
                              <Text style={styles.dropdownEmail}>
                                {trainers.find(t => t.id === formData.trainerId)?.email}
                              </Text>
                            </View>
                          </>
                        ) : (
                          <Text style={styles.dropdownPlaceholder}>
                            {loadingLists ? 'Laster PT-ere...' : 'Velg PT...'}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="people-outline" size={16} color="#6B7280" />
                      <Text style={styles.label}>Velg kunde *</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => {
                        console.log('[PTManagement] Opening customer dropdown. Customers:', customers.length);
                        setShowCustomerDropdown(true);
                      }}
                      disabled={loadingLists}
                    >
                      <View style={styles.dropdownContent}>
                        {formData.customerId && customers.find(c => c.id === formData.customerId) ? (
                          <>
                            <View style={styles.dropdownAvatar}>
                              <Text style={styles.dropdownAvatarText}>
                                {customers.find(c => c.id === formData.customerId)?.firstName?.charAt(0)}
                                {customers.find(c => c.id === formData.customerId)?.lastName?.charAt(0)}
                              </Text>
                            </View>
                            <View style={styles.dropdownInfo}>
                              <Text style={styles.dropdownName}>
                                {customers.find(c => c.id === formData.customerId)?.firstName} {customers.find(c => c.id === formData.customerId)?.lastName}
                              </Text>
                              <Text style={styles.dropdownEmail}>
                                {customers.find(c => c.id === formData.customerId)?.email}
                              </Text>
                            </View>
                          </>
                        ) : (
                          <Text style={styles.dropdownPlaceholder}>
                            {loadingLists ? 'Laster kunder...' : 'Velg kunde...'}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="play-outline" size={16} color="#6B7280" />
                      <Text style={styles.label}>Starttid *</Text>
                    </View>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity
                        style={styles.modernDateButton}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <View style={styles.dateIconContainer}>
                          <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
                        </View>
                        <Text style={styles.modernDateButtonText}>
                          {formatDate(startDateTime.toISOString())}
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
                          {formatTime(startDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="stop-outline" size={16} color="#6B7280" />
                      <Text style={styles.label}>Sluttid *</Text>
                    </View>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity
                        style={styles.modernDateButton}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <View style={styles.dateIconContainer}>
                          <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
                        </View>
                        <Text style={styles.modernDateButtonText}>
                          {formatDate(endDateTime.toISOString())}
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
                          {formatTime(endDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>

                {/* Action Buttons - Always Visible */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Avbryt</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modernSaveButton}
                    onPress={handleSaveSession}
                  >
                    <Ionicons name={editMode ? "refresh" : "add-circle"} size={20} color="#FFF" />
                    <Text style={styles.modernSaveButtonText}>
                      {editMode ? 'Oppdater' : 'Opprett'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* iOS Date/Time Pickers in Modal */}
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
                                value={startDateTime}
                                mode="date"
                                display="spinner"
                                onChange={handleStartDateChange}
                                textColor="#111827"
                              />
                            )}
                            {showStartTimePicker && (
                              <DateTimePicker
                                value={startDateTime}
                                mode="time"
                                display="spinner"
                                onChange={handleStartTimeChange}
                                textColor="#111827"
                              />
                            )}
                            {showEndDatePicker && (
                              <DateTimePicker
                                value={endDateTime}
                                mode="date"
                                display="spinner"
                                onChange={handleEndDateChange}
                                textColor="#111827"
                              />
                            )}
                            {showEndTimePicker && (
                              <DateTimePicker
                                value={endDateTime}
                                mode="time"
                                display="spinner"
                                onChange={handleEndTimeChange}
                                textColor="#111827"
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
                    value={startDateTime}
                    mode="date"
                    display="default"
                    onChange={handleStartDateChange}
                  />
                )}

                {showStartTimePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={startDateTime}
                    mode="time"
                    display="default"
                    onChange={handleStartTimeChange}
                  />
                )}

                {showEndDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={endDateTime}
                    mode="date"
                    display="default"
                    onChange={handleEndDateChange}
                  />
                )}

                {showEndTimePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={endDateTime}
                    mode="time"
                    display="default"
                    onChange={handleEndTimeChange}
                  />
                )}
                </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Dropdown Modals - Inside main modal to work on iOS */}
      {/* Trainer Dropdown Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTrainerDropdown}
        onRequestClose={() => setShowTrainerDropdown(false)}
      >
        <View style={styles.dropdownModalOverlay}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
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
                    setFormData({ ...formData, trainerId: item.id });
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
                  {formData.trainerId === item.id && (
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

      {/* Customer Dropdown Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCustomerDropdown}
        onRequestClose={() => setShowCustomerDropdown(false)}
      >
        <View style={styles.dropdownModalOverlay}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
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
                    setFormData({ ...formData, customerId: item.id });
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
                  {formData.customerId === item.id && (
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
      </Modal>
    </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? '23%' : '47%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  sessionsList: {
    gap: 12,
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
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
    marginRight: 12,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  sessionMeta: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    height: 32,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  noShowButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
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
  // Dropdown Modal styles (for PT and Customer selection)
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 20,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  // Main Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  keyboardAvoidingView: {
    width: '100%',
    height: '93%',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFBFC',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FAFBFC',
  },
  formGroup: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#FAFBFC',
    color: '#111827',
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
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
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modernSaveButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modernSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  loadingBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  selectScrollContainer: {
    maxHeight: 250,
  },
  selectContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  selectOptionActive: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  selectOptionIconContainer: {
    marginRight: 4,
  },
  selectOptionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectOptionAvatarCustomer: {
    backgroundColor: '#10B981',
  },
  selectOptionAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  selectOptionContent: {
    flex: 1,
  },
  selectOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  selectOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  selectOptionRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectOptionEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  compactLoadingBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compactEmptyBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compactEmptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  compactSelectContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    maxHeight: 150,
  },
  compactSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  compactSelectOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  compactSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  compactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactAvatarCustomer: {
    backgroundColor: '#10B981',
  },
  compactAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  compactSelectText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  compactSelectTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  modernLoadingBox: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FAFBFC',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modernEmptyBox: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FAFBFC',
    padding: 20,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modernEmptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modernSelectScrollContainer: {
    maxHeight: 180,
  },
  modernSelectContainer: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  modernSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFBFC',
  },
  modernSelectOptionActive: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  modernSelectOptionLast: {
    borderBottomWidth: 0,
  },
  modernSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modernAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modernAvatarActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  modernAvatarCustomer: {
    backgroundColor: '#D1FAE5',
    borderColor: '#E5E7EB',
  },
  modernAvatarCustomerActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  modernAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
  },
  modernAvatarTextActive: {
    color: '#FFF',
  },
  modernSelectText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  modernSelectTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  // Improved selector styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  improvedSelectScrollContainer: {
    maxHeight: 200,
  },
  improvedSelectContainer: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  improvedSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  improvedSelectOptionLast: {
    borderBottomWidth: 0,
  },
  improvedSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  improvedAvatarPT: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  improvedAvatarCustomer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  improvedAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
  },
  improvedPersonInfo: {
    flex: 1,
  },
  improvedPersonName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  improvedPersonEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  selectedPersonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  selectedPersonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedAvatarPT: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatarCustomer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  selectedPersonInfo: {
    flex: 1,
  },
  selectedPersonName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  selectedPersonRole: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedPersonEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  changeButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  // Select button styles
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 16,
  },
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedCustomerCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  // Picker Modal Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  pickerSearchContainer: {
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
  pickerSearchIcon: {
    marginRight: 10,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  pickerClearButton: {
    padding: 4,
  },
  pickerListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pickerPersonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  pickerPersonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  pickerAvatarPT: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerAvatarCustomer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
  },
  pickerPersonInfo: {
    flex: 1,
  },
  pickerPersonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  pickerPersonEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  pickerSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  pickerEmptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 6,
  },
  pickerEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
