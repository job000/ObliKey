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
import { useTheme } from '../contexts/ThemeContext';
import type { Class, Booking } from '../types';

export default function ClassManagementScreen({ navigation }: any) {
  const { colors } = useTheme();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const stats = getClassStats();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container>
          <View style={styles.header}>
            <View>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>Klasseadministrasjon</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Administrer klasser og bookinger</Text>
            </View>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }} onPress={openAddModal}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>Ny klasse</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={{ flex: 1, minWidth: Platform.OS === 'web' ? '23%' : '47%', backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: colors.primary + '20' }}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{stats.total}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Totalt</Text>
            </View>

            <View style={{ flex: 1, minWidth: Platform.OS === 'web' ? '23%' : '47%', backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: colors.success + '20' }}>
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{stats.published}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Publisert</Text>
            </View>

            <View style={{ flex: 1, minWidth: Platform.OS === 'web' ? '23%' : '47%', backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: colors.danger + '20' }}>
                <Ionicons name="close-circle-outline" size={24} color={colors.danger} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{stats.cancelled}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Avlyst</Text>
            </View>

            <View style={{ flex: 1, minWidth: Platform.OS === 'web' ? '23%' : '47%', backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: colors.warning + '20' }}>
                <Ionicons name="people-outline" size={24} color={colors.warning} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{stats.totalBookings}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Bookinger</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: statusFilter === 'all' ? colors.primary : colors.cardBg, borderWidth: 1, borderColor: statusFilter === 'all' ? colors.primary : colors.border }}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: statusFilter === 'all' ? '#FFF' : colors.textSecondary }}>
                    Alle
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: statusFilter === 'ACTIVE' ? colors.primary : colors.cardBg, borderWidth: 1, borderColor: statusFilter === 'ACTIVE' ? colors.primary : colors.border }}
                  onPress={() => setStatusFilter('ACTIVE')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: statusFilter === 'ACTIVE' ? '#FFF' : colors.textSecondary }}>
                    Aktive
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: statusFilter === 'CANCELLED' ? colors.primary : colors.cardBg, borderWidth: 1, borderColor: statusFilter === 'CANCELLED' ? colors.primary : colors.border }}
                  onPress={() => setStatusFilter('CANCELLED')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: statusFilter === 'CANCELLED' ? '#FFF' : colors.textSecondary }}>
                    Avlyste
                  </Text>
                </TouchableOpacity>
                <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 8 }} />
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: publishedFilter === 'all' ? colors.primary : colors.cardBg, borderWidth: 1, borderColor: publishedFilter === 'all' ? colors.primary : colors.border }}
                  onPress={() => setPublishedFilter('all')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: publishedFilter === 'all' ? '#FFF' : colors.textSecondary }}>
                    Alle
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: publishedFilter === 'published' ? colors.primary : colors.cardBg, borderWidth: 1, borderColor: publishedFilter === 'published' ? colors.primary : colors.border }}
                  onPress={() => setPublishedFilter('published')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: publishedFilter === 'published' ? '#FFF' : colors.textSecondary }}>
                    Publisert
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: publishedFilter === 'draft' ? colors.primary : colors.cardBg, borderWidth: 1, borderColor: publishedFilter === 'draft' ? colors.primary : colors.border }}
                  onPress={() => setPublishedFilter('draft')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: publishedFilter === 'draft' ? '#FFF' : colors.textSecondary }}>
                    Utkast
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Classes List */}
          <View style={styles.classesList}>
            {filteredClasses.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 64 }}>
                <Ionicons name="calendar-outline" size={64} color={colors.border} />
                <Text style={{ fontSize: 16, color: colors.textLight, marginTop: 16, marginBottom: 24 }}>
                  {classes.length === 0 ? 'Ingen klasser funnet' : 'Ingen klasser matcher filtrene'}
                </Text>
                {classes.length === 0 && (
                  <TouchableOpacity style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }} onPress={openAddModal}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>Opprett klasse</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredClasses.map((classItem) => {
                const statusBadge = getStatusBadge(classItem);
                return (
                <TouchableOpacity
                  key={classItem.id}
                  style={{ backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
                  onPress={() => openEditModal(classItem)}
                  activeOpacity={0.7}
                >
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{classItem.name}</Text>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: statusBadge.bg }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', color: statusBadge.color }}>
                            {statusBadge.text}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }} numberOfLines={2}>
                        {classItem.description}
                      </Text>
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                            {formatDate(classItem.startTime)} {formatTime(classItem.startTime)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="hourglass-outline" size={16} color={colors.textSecondary} />
                          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                            {formatTime(classItem.startTime)} - {formatTime(classItem.endTime)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={{ marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                        {classItem._count?.bookings || 0} / {classItem.capacity} plasser
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color:
                            getAvailableSpots(classItem) === 0
                              ? colors.danger
                              : getAvailableSpots(classItem) < 5
                              ? colors.warning
                              : colors.success,
                        }}
                      >
                        {getAvailableSpots(classItem)} ledige
                      </Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
                      <View
                        style={{
                          height: '100%',
                          borderRadius: 4,
                          width: `${
                            ((classItem._count?.bookings || 0) / classItem.capacity) *
                            100
                          }%`,
                          backgroundColor:
                            getAvailableSpots(classItem) === 0
                              ? colors.danger
                              : getAvailableSpots(classItem) < 5
                              ? colors.warning
                              : colors.primary,
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary + '10' }}
                      onPress={() => openEditModal(classItem)}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Rediger</Text>
                    </TouchableOpacity>

                    {classItem.status === 'ACTIVE' && (
                      <>
                        {classItem.published ? (
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.textSecondary, backgroundColor: colors.textSecondary + '10' }}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleUnpublishClass(classItem.id);
                            }}
                          >
                            <Ionicons name="eye-off-outline" size={18} color={colors.textSecondary} />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Skjul</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.success, backgroundColor: colors.success + '10' }}
                            onPress={(e) => {
                              e.stopPropagation();
                              handlePublishClass(classItem.id);
                            }}
                          >
                            <Ionicons name="eye-outline" size={18} color={colors.success} />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.success }}>Publiser</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}

                    {classItem.status === 'ACTIVE' && (
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.warning + '10' }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelClass(classItem.id);
                        }}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={colors.warning} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.warning }}>Avlys</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.danger + '10', justifyContent: 'center', alignItems: 'center' }}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(classItem.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
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
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                    {editMode ? 'Rediger klasse' : 'Ny klasse'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ padding: 20 }}>
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Klassenavn *</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.cardBg, color: colors.text }}
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, name: text })
                      }
                      placeholder="Eks: Yoga for nybegynnere"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Beskrivelse</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.cardBg, color: colors.text, minHeight: 100, textAlignVertical: 'top' }}
                      value={formData.description}
                      onChangeText={(text) =>
                        setFormData({ ...formData, description: text })
                      }
                      placeholder="Beskrivelse av klassen"
                      placeholderTextColor={colors.textLight}
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Starttid *</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, minHeight: 48 }}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                        <Text style={{ fontSize: 16, color: colors.text }}>
                          {formatDate(startDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, minHeight: 48 }}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                        <Text style={{ fontSize: 16, color: colors.text }}>
                          {formatTime(startDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Sluttid *</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, minHeight: 48 }}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                        <Text style={{ fontSize: 16, color: colors.text }}>
                          {formatDate(endDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, minHeight: 48 }}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                        <Text style={{ fontSize: 16, color: colors.text }}>
                          {formatTime(endDateTime.toISOString())}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Kapasitet *</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity
                        style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary + '10', justifyContent: 'center', alignItems: 'center' }}
                        onPress={decreaseCapacity}
                      >
                        <Ionicons name="remove" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TextInput
                        style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.cardBg, color: colors.text, textAlign: 'center' }}
                        value={formData.capacity}
                        onChangeText={(text) =>
                          setFormData({ ...formData, capacity: text.replace(/[^0-9]/g, '') })
                        }
                        placeholder="Antall plasser"
                        placeholderTextColor={colors.textLight}
                        keyboardType="number-pad"
                      />
                      <TouchableOpacity
                        style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary + '10', justifyContent: 'center', alignItems: 'center' }}
                        onPress={increaseCapacity}
                      >
                        <Ionicons name="add" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {editMode && (
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.warning + '10' }}
                        onPress={() => handleCancelClass(selectedClass?.id || '')}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.warning} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.warning }}>Avlys klasse</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.danger + '10' }}
                        onPress={() => handleDeleteClass(selectedClass?.id || '')}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.danger }}>Slett klasse</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 }}
                    onPress={handleSaveClass}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>
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
                      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                          <View style={{ backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                              <TouchableOpacity onPress={closeAllPickers}>
                                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>Ferdig</Text>
                              </TouchableOpacity>
                            </View>
                            {showStartDatePicker && (
                              <DateTimePicker
                                value={startDateTime}
                                mode="date"
                                display="spinner"
                                onChange={handleStartDateChange}
                                textColor={colors.text}
                              />
                            )}
                            {showStartTimePicker && (
                              <DateTimePicker
                                value={startDateTime}
                                mode="time"
                                display="spinner"
                                onChange={handleStartTimeChange}
                                textColor={colors.text}
                              />
                            )}
                            {showEndDatePicker && (
                              <DateTimePicker
                                value={endDateTime}
                                mode="date"
                                display="spinner"
                                onChange={handleEndDateChange}
                                textColor={colors.text}
                              />
                            )}
                            {showEndTimePicker && (
                              <DateTimePicker
                                value={endDateTime}
                                mode="time"
                                display="spinner"
                                onChange={handleEndTimeChange}
                                textColor={colors.text}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 24,
    paddingBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  classesList: {
    gap: 12,
    paddingBottom: 24,
  },
});
