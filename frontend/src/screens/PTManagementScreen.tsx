import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
    } catch (error) {
      console.error('Failed to load trainers and customers:', error);
      Alert.alert('Feil', 'Kunne ikke laste PT og kunder. Prøv igjen.');
    } finally {
      setLoadingLists(false);
    }
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
                    <Text style={styles.modalTitle}>
                      {editMode ? 'Rediger PT-økt' : 'Ny PT-økt'}
                    </Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#111827" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.modalBody}
                    contentContainerStyle={styles.modalBodyContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Tittel *</Text>
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
                    <Text style={styles.label}>Beskrivelse</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.description}
                      onChangeText={(text) =>
                        setFormData({ ...formData, description: text })
                      }
                      placeholder="Beskrivelse av økten"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>PT *</Text>
                    {loadingLists ? (
                      <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#3B82F6" />
                        <Text style={styles.loadingText}>Laster PT-ere...</Text>
                      </View>
                    ) : trainers.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Ionicons name="person-outline" size={32} color="#9CA3AF" />
                        <Text style={styles.emptyText}>Ingen PT-ere funnet</Text>
                        <Text style={styles.emptySubtext}>Opprett en PT-bruker først</Text>
                      </View>
                    ) : (
                      <ScrollView style={styles.selectScrollContainer} nestedScrollEnabled>
                        <View style={styles.selectContainer}>
                          {trainers.map((trainer) => (
                            <TouchableOpacity
                              key={trainer.id}
                              style={[
                                styles.selectOption,
                                formData.trainerId === trainer.id && styles.selectOptionActive,
                              ]}
                              onPress={() => setFormData({ ...formData, trainerId: trainer.id })}
                            >
                              <View style={styles.selectOptionIconContainer}>
                                <View style={styles.selectOptionAvatar}>
                                  <Text style={styles.selectOptionAvatarText}>
                                    {trainer.firstName?.charAt(0)}{trainer.lastName?.charAt(0)}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.selectOptionContent}>
                                <Text
                                  style={[
                                    styles.selectOptionText,
                                    formData.trainerId === trainer.id && styles.selectOptionTextActive,
                                  ]}
                                >
                                  {trainer.firstName} {trainer.lastName}
                                </Text>
                                {trainer.email && (
                                  <Text style={styles.selectOptionRole}>{trainer.email}</Text>
                                )}
                              </View>
                              {formData.trainerId === trainer.id && (
                                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Kunde *</Text>
                    {loadingLists ? (
                      <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#3B82F6" />
                        <Text style={styles.loadingText}>Laster kunder...</Text>
                      </View>
                    ) : customers.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                        <Text style={styles.emptyText}>Ingen kunder funnet</Text>
                        <Text style={styles.emptySubtext}>Opprett en kunde først</Text>
                      </View>
                    ) : (
                      <ScrollView style={styles.selectScrollContainer} nestedScrollEnabled>
                        <View style={styles.selectContainer}>
                          {customers.map((customer) => (
                            <TouchableOpacity
                              key={customer.id}
                              style={[
                                styles.selectOption,
                                formData.customerId === customer.id && styles.selectOptionActive,
                              ]}
                              onPress={() => setFormData({ ...formData, customerId: customer.id })}
                            >
                              <View style={styles.selectOptionIconContainer}>
                                <View style={[styles.selectOptionAvatar, styles.selectOptionAvatarCustomer]}>
                                  <Text style={styles.selectOptionAvatarText}>
                                    {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.selectOptionContent}>
                                <Text
                                  style={[
                                    styles.selectOptionText,
                                    formData.customerId === customer.id && styles.selectOptionTextActive,
                                  ]}
                                >
                                  {customer.firstName} {customer.lastName}
                                </Text>
                                {customer.email && (
                                  <Text style={styles.selectOptionEmail}>{customer.email}</Text>
                                )}
                              </View>
                              {formData.customerId === customer.id && (
                                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Starttid *</Text>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity
                        style={[styles.dateButton, { flex: 1 }]}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                        <Text style={styles.dateButtonText}>
                          {formatDate(startDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.dateButton, { flex: 1 }]}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Ionicons name="time-outline" size={20} color="#6B7280" />
                        <Text style={styles.dateButtonText}>
                          {formatTime(startDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Sluttid *</Text>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity
                        style={[styles.dateButton, { flex: 1 }]}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                        <Text style={styles.dateButtonText}>
                          {formatDate(endDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.dateButton, { flex: 1 }]}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Ionicons name="time-outline" size={20} color="#6B7280" />
                        <Text style={styles.dateButtonText}>
                          {formatTime(endDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveSession}
                  >
                    <Text style={styles.saveButtonText}>
                      {editMode ? 'Oppdater PT-økt' : 'Opprett PT-økt'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

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
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    flex: 1,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
  dateTimeRow: {
    flexDirection: 'row',
    gap: 8,
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
  emptyText: {
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
});
