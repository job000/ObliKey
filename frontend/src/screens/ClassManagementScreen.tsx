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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';
import Container from '../components/Container';
import type { Class, Booking } from '../types';

export default function ClassManagementScreen({ navigation }: any) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'CANCELLED'>('all');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    capacity: '',
    trainerId: '',
  });

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date(Date.now() + 60 * 60 * 1000));

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [classes, statusFilter, publishedFilter]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await api.getClasses();
      if (response.success) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...classes];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Published filter
    if (publishedFilter === 'published') {
      filtered = filtered.filter(c => c.published === true);
    } else if (publishedFilter === 'draft') {
      filtered = filtered.filter(c => c.published === false);
    }

    setFilteredClasses(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClasses();
  };

  const openAddModal = () => {
    setEditMode(false);
    setSelectedClass(null);
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    setStartDateTime(now);
    setEndDateTime(later);
    setFormData({
      name: '',
      description: '',
      startTime: now.toISOString(),
      endTime: later.toISOString(),
      capacity: '',
      trainerId: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (classItem: Class) => {
    setEditMode(true);
    setSelectedClass(classItem);
    const start = new Date(classItem.startTime);
    const end = new Date(classItem.endTime);
    setStartDateTime(start);
    setEndDateTime(end);
    setFormData({
      name: classItem.name,
      description: classItem.description || '',
      startTime: classItem.startTime,
      endTime: classItem.endTime,
      capacity: classItem.capacity.toString(),
      trainerId: classItem.trainerId || '',
    });
    setModalVisible(true);
  };

  const handleSaveClass = async () => {
    if (!formData.name || !formData.startTime || !formData.endTime || !formData.capacity) {
      Alert.alert('Feil', 'Vennligst fyll ut alle obligatoriske felt');
      return;
    }

    try {
      // Calculate duration in minutes
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

      const classData = {
        name: formData.name,
        description: formData.description,
        startTime: formData.startTime,
        duration: durationMinutes,
        capacity: parseInt(formData.capacity),
        trainerId: formData.trainerId || null,
      };

      if (editMode && selectedClass) {
        const response = await api.updateClass(selectedClass.id, classData);
        if (response.success) {
          setClasses(
            classes.map((c) => (c.id === selectedClass.id ? response.data : c))
          );
          Alert.alert('Suksess', 'Klasse oppdatert');
        }
      } else {
        const response = await api.createClass(classData);
        if (response.success) {
          setClasses([response.data, ...classes]);
          Alert.alert('Suksess', 'Klasse opprettet');
        }
      }

      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke lagre klasse');
    }
  };

  const handleDeleteClass = (classId: string) => {
    setModalVisible(false);
    setTimeout(() => {
      Alert.alert(
        'Slett klasse',
        'Er du sikker på at du vil slette denne klassen?',
        [
          { text: 'Avbryt', style: 'cancel' },
          {
            text: 'Slett',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.deleteClass(classId);
                setClasses(classes.filter((c) => c.id !== classId));
                Alert.alert('Suksess', 'Klasse slettet');
              } catch (error: any) {
                Alert.alert(
                  'Feil',
                  error.response?.data?.error || 'Kunne ikke slette klasse'
                );
              }
            },
          },
        ]
      );
    }, 300);
  };

  const handleCancelClass = async (classId: string) => {
    setModalVisible(false);
    setTimeout(() => {
      Alert.alert(
        'Avlys klasse',
        'Er du sikker på at du vil avlyse denne klassen? Alle aktive bookinger vil bli kansellert.',
        [
          { text: 'Avbryt', style: 'cancel' },
          {
            text: 'Avlys',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await api.cancelClass(classId);
                if (response.success) {
                  await loadClasses();
                  const affectedCount = response.affectedBookings || 0;
                  Alert.alert(
                    'Suksess',
                    affectedCount > 0
                      ? `Klasse avlyst. ${affectedCount} bookinger kansellert.`
                      : 'Klasse avlyst'
                  );
                }
              } catch (error: any) {
                Alert.alert(
                  'Feil',
                  error.response?.data?.error || 'Kunne ikke avlyse klasse'
                );
              }
            },
          },
        ]
      );
    }, 300);
  };

  const handlePublishClass = async (classId: string) => {
    try {
      const response = await api.publishClass(classId);
      if (response.success) {
        await loadClasses();
        Alert.alert('Suksess', 'Klasse publisert og synlig for kunder');
      }
    } catch (error: any) {
      Alert.alert(
        'Feil',
        error.response?.data?.error || 'Kunne ikke publisere klasse'
      );
    }
  };

  const handleUnpublishClass = async (classId: string) => {
    try {
      const response = await api.unpublishClass(classId);
      if (response.success) {
        await loadClasses();
        Alert.alert('Suksess', 'Klasse gjort privat og skjult fra kunder');
      }
    } catch (error: any) {
      Alert.alert(
        'Feil',
        error.response?.data?.error || 'Kunne ikke avpublisere klasse'
      );
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

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getClassStats = () => {
    const total = classes.length;
    const upcoming = classes.filter(
      (c) => new Date(c.startTime) > new Date()
    ).length;
    const totalBookings = classes.reduce(
      (sum, c) => sum + (c._count?.bookings || 0),
      0
    );
    const avgCapacity = total > 0
      ? Math.round(
          (classes.reduce((sum, c) => sum + (c._count?.bookings || 0), 0) /
            classes.reduce((sum, c) => sum + c.capacity, 0)) *
            100
        )
      : 0;
    const published = classes.filter(c => c.published).length;
    const cancelled = classes.filter(c => c.status === 'CANCELLED').length;

    return { total, upcoming, totalBookings, avgCapacity, published, cancelled };
  };

  const getStatusBadge = (classItem: any) => {
    if (classItem.status === 'CANCELLED') {
      return { text: 'Avlyst', color: '#EF4444', bg: '#FEE2E2' };
    }
    if (!classItem.published) {
      return { text: 'Utkast', color: '#6B7280', bg: '#F3F4F6' };
    }
    return { text: 'Publisert', color: '#10B981', bg: '#D1FAE5' };
  };

  const getAvailableSpots = (classItem: Class) => {
    return classItem.capacity - (classItem._count?.bookings || 0);
  };

  // Helper function to close all pickers
  const closeAllPickers = () => {
    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      // Preserve the time from existing startDateTime
      const newDate = new Date(selectedDate);
      newDate.setHours(startDateTime.getHours());
      newDate.setMinutes(startDateTime.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setStartDateTime(newDate);
      setFormData({ ...formData, startTime: newDate.toISOString() });
    }
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      // Preserve the date from existing startDateTime, update time
      const newDate = new Date(startDateTime);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setStartDateTime(newDate);
      // Auto-set end time to 1 hour later
      const newEndTime = new Date(newDate.getTime() + 60 * 60 * 1000);
      setEndDateTime(newEndTime);
      // Update both startTime and endTime in a single setState call
      setFormData({ ...formData, startTime: newDate.toISOString(), endTime: newEndTime.toISOString() });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      // Preserve the time from existing endDateTime
      const newDate = new Date(selectedDate);
      newDate.setHours(endDateTime.getHours());
      newDate.setMinutes(endDateTime.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setEndDateTime(newDate);
      setFormData({ ...formData, endTime: newDate.toISOString() });
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      // Preserve the date from existing endDateTime, update time
      const newDate = new Date(endDateTime);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setEndDateTime(newDate);
      setFormData({ ...formData, endTime: newDate.toISOString() });
    }
  };

  const increaseCapacity = () => {
    const current = parseInt(formData.capacity) || 0;
    setFormData({ ...formData, capacity: (current + 1).toString() });
  };

  const decreaseCapacity = () => {
    const current = parseInt(formData.capacity) || 0;
    if (current > 0) {
      setFormData({ ...formData, capacity: (current - 1).toString() });
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

  const stats = getClassStats();

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
              <Text style={styles.title}>Klasseadministrasjon</Text>
              <Text style={styles.subtitle}>Administrer klasser og bookinger</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Ny klasse</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Totalt</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{stats.published}</Text>
              <Text style={styles.statLabel}>Publisert</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="close-circle-outline" size={24} color="#EF4444" />
              </View>
              <Text style={styles.statValue}>{stats.cancelled}</Text>
              <Text style={styles.statLabel}>Avlyst</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="people-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{stats.totalBookings}</Text>
              <Text style={styles.statLabel}>Bookinger</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
                    Alle
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'ACTIVE' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('ACTIVE')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'ACTIVE' && styles.filterChipTextActive]}>
                    Aktive
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'CANCELLED' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('CANCELLED')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'CANCELLED' && styles.filterChipTextActive]}>
                    Avlyste
                  </Text>
                </TouchableOpacity>
                <View style={styles.filterDivider} />
                <TouchableOpacity
                  style={[styles.filterChip, publishedFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setPublishedFilter('all')}
                >
                  <Text style={[styles.filterChipText, publishedFilter === 'all' && styles.filterChipTextActive]}>
                    Alle
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, publishedFilter === 'published' && styles.filterChipActive]}
                  onPress={() => setPublishedFilter('published')}
                >
                  <Text style={[styles.filterChipText, publishedFilter === 'published' && styles.filterChipTextActive]}>
                    Publisert
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, publishedFilter === 'draft' && styles.filterChipActive]}
                  onPress={() => setPublishedFilter('draft')}
                >
                  <Text style={[styles.filterChipText, publishedFilter === 'draft' && styles.filterChipTextActive]}>
                    Utkast
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Classes List */}
          <View style={styles.classesList}>
            {filteredClasses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  {classes.length === 0 ? 'Ingen klasser funnet' : 'Ingen klasser matcher filtrene'}
                </Text>
                {classes.length === 0 && (
                  <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                    <Text style={styles.emptyButtonText}>Opprett klasse</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredClasses.map((classItem) => {
                const statusBadge = getStatusBadge(classItem);
                return (
                <TouchableOpacity
                  key={classItem.id}
                  style={styles.classCard}
                  onPress={() => openEditModal(classItem)}
                  activeOpacity={0.7}
                >
                  <View style={styles.classHeader}>
                    <View style={styles.classInfo}>
                      <View style={styles.classNameRow}>
                        <Text style={styles.className}>{classItem.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                            {statusBadge.text}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.classDescription} numberOfLines={2}>
                        {classItem.description}
                      </Text>
                      <View style={styles.classMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="time-outline" size={16} color="#6B7280" />
                          <Text style={styles.metaText}>
                            {formatDate(classItem.startTime)} {formatTime(classItem.startTime)}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="hourglass-outline" size={16} color="#6B7280" />
                          <Text style={styles.metaText}>
                            {formatTime(classItem.startTime)} - {formatTime(classItem.endTime)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.capacityBar}>
                    <View style={styles.capacityInfo}>
                      <Text style={styles.capacityText}>
                        {classItem._count?.bookings || 0} / {classItem.capacity} plasser
                      </Text>
                      <Text
                        style={[
                          styles.spotsText,
                          {
                            color:
                              getAvailableSpots(classItem) === 0
                                ? '#EF4444'
                                : getAvailableSpots(classItem) < 5
                                ? '#F59E0B'
                                : '#10B981',
                          },
                        ]}
                      >
                        {getAvailableSpots(classItem)} ledige
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${
                              ((classItem._count?.bookings || 0) / classItem.capacity) *
                              100
                            }%`,
                            backgroundColor:
                              getAvailableSpots(classItem) === 0
                                ? '#EF4444'
                                : getAvailableSpots(classItem) < 5
                                ? '#F59E0B'
                                : '#3B82F6',
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditModal(classItem)}
                    >
                      <Ionicons name="create-outline" size={18} color="#3B82F6" />
                      <Text style={styles.editButtonText}>Rediger</Text>
                    </TouchableOpacity>

                    {classItem.status === 'ACTIVE' && (
                      <>
                        {classItem.published ? (
                          <TouchableOpacity
                            style={styles.unpublishButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleUnpublishClass(classItem.id);
                            }}
                          >
                            <Ionicons name="eye-off-outline" size={18} color="#6B7280" />
                            <Text style={styles.unpublishButtonText}>Skjul</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.publishButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handlePublishClass(classItem.id);
                            }}
                          >
                            <Ionicons name="eye-outline" size={18} color="#10B981" />
                            <Text style={styles.publishButtonText}>Publiser</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}

                    {classItem.status === 'ACTIVE' && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelClass(classItem.id);
                        }}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#F59E0B" />
                        <Text style={styles.cancelButtonText}>Avlys</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(classItem.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                );
              })
            )}
          </View>
        </Container>
      </ScrollView>

      {/* Add/Edit Class Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editMode ? 'Rediger klasse' : 'Ny klasse'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#111827" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Klassenavn *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, name: text })
                      }
                      placeholder="Eks: Yoga for nybegynnere"
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
                      placeholder="Beskrivelse av klassen"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                    />
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

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Kapasitet *</Text>
                    <View style={styles.capacityInputContainer}>
                      <TouchableOpacity
                        style={styles.capacityButton}
                        onPress={decreaseCapacity}
                      >
                        <Ionicons name="remove" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.capacityInput}
                        value={formData.capacity}
                        onChangeText={(text) =>
                          setFormData({ ...formData, capacity: text.replace(/[^0-9]/g, '') })
                        }
                        placeholder="Antall plasser"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                      />
                      <TouchableOpacity
                        style={styles.capacityButton}
                        onPress={increaseCapacity}
                      >
                        <Ionicons name="add" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {editMode && (
                    <View style={styles.modalActionButtons}>
                      <TouchableOpacity
                        style={styles.modalCancelButton}
                        onPress={() => handleCancelClass(selectedClass?.id || '')}
                      >
                        <Ionicons name="close-circle-outline" size={20} color="#F59E0B" />
                        <Text style={styles.modalCancelButtonText}>Avlys klasse</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalDeleteButton}
                        onPress={() => handleDeleteClass(selectedClass?.id || '')}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text style={styles.modalDeleteButtonText}>Slett klasse</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveClass}
                  >
                    <Text style={styles.saveButtonText}>
                      {editMode ? 'Oppdater klasse' : 'Opprett klasse'}
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  classesList: {
    gap: 12,
    paddingBottom: 24,
  },
  classCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  classHeader: {
    marginBottom: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  classDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  classMeta: {
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
  capacityBar: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  capacityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  spotsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
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
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
    padding: 20,
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
    minHeight: 48,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  capacityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  capacityButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capacityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#111827',
    textAlign: 'center',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  modalDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  modalDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
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
  filtersContainer: {
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  classNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  publishButton: {
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
  publishButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  unpublishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6B7280',
    backgroundColor: '#F3F4F6',
  },
  unpublishButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
});
