import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Container from '../components/Container';
import type { Class, Booking } from '../types';

export default function ClassesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'my'>('upcoming');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesRes, bookingsRes] = await Promise.all([
        api.getClasses(),
        user?.role === 'CUSTOMER' ? api.getBookings() : Promise.resolve({ success: true, data: [] }),
      ]);

      if (classesRes.success) {
        setClasses(classesRes.data);
      }

      if (bookingsRes.success && user?.role === 'CUSTOMER') {
        setMyBookings(bookingsRes.data);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
      Alert.alert('Feil', 'Kunne ikke laste klasser');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const bookClass = async (classId: string) => {
    try {
      const response = await api.bookClass(classId);
      if (response.success) {
        Alert.alert('Suksess', 'Booking opprettet!');
        loadData();
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Kunne ikke booke klasse';
      Alert.alert('Feil', message);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    Alert.alert(
      'Avbestill booking',
      'Er du sikker på at du vil avbestille denne bookingen?',
      [
        { text: 'Nei', style: 'cancel' },
        {
          text: 'Ja',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelBooking(bookingId);
              Alert.alert('Suksess', 'Booking avbestilt');
              loadData();
            } catch (error: any) {
              Alert.alert('Feil', 'Kunne ikke avbestille booking');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvailableSpots = (cls: Class) => {
    const booked = cls._count?.bookings || 0;
    return cls.capacity - booked;
  };

  const isBooked = (classId: string) => {
    return myBookings.some(
      (b) => b.class.id === classId && b.status !== 'CANCELLED'
    );
  };

  const getBookingForClass = (classId: string) => {
    return myBookings.find(
      (b) => b.class.id === classId && b.status !== 'CANCELLED'
    );
  };

  const getFilteredClasses = () => {
    const now = new Date();

    if (filter === 'upcoming') {
      return classes.filter((cls) => new Date(cls.startTime) > now);
    }

    if (filter === 'my') {
      const myClassIds = myBookings
        .filter((b) => b.status !== 'CANCELLED')
        .map((b) => b.class.id);
      return classes.filter((cls) => myClassIds.includes(cls.id));
    }

    return classes;
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

  const filteredClasses = getFilteredClasses();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenHeader}>
        <Container>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Klasser</Text>
            {(user?.role === 'ADMIN' || user?.role === 'TRAINER') && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('ClassManagement')}
              >
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </Container>
      </View>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <Container>

        {user?.role === 'CUSTOMER' && (
          <View style={styles.filterContainer}>
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
                filter === 'my' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('my')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === 'my' && styles.filterButtonTextActive,
                ]}
              >
                Mine bookinger
              </Text>
            </TouchableOpacity>
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
          </View>
        )}

        <View style={styles.classList}>
          {filteredClasses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Ingen klasser funnet</Text>
            </View>
          ) : (
            filteredClasses.map((cls) => {
              const availableSpots = getAvailableSpots(cls);
              const booked = isBooked(cls.id);
              const booking = getBookingForClass(cls.id);

              return (
                <View key={cls.id} style={styles.classCard}>
                  <View style={styles.classHeader}>
                    <View style={styles.classDateContainer}>
                      <Text style={styles.classDate}>
                        {formatDate(cls.startTime)}
                      </Text>
                      <Text style={styles.classTime}>
                        {formatTime(cls.startTime)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.spotsIndicator,
                        availableSpots === 0 && styles.spotsIndicatorFull,
                      ]}
                    >
                      <Ionicons
                        name="people"
                        size={16}
                        color={availableSpots === 0 ? '#EF4444' : '#10B981'}
                      />
                      <Text
                        style={[
                          styles.spotsText,
                          availableSpots === 0 && styles.spotsTextFull,
                        ]}
                      >
                        {availableSpots} ledige
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.className}>{cls.name}</Text>
                  {cls.description && (
                    <Text style={styles.classDescription}>
                      {cls.description}
                    </Text>
                  )}

                  <View style={styles.classInfo}>
                    <View style={styles.infoItem}>
                      <Ionicons name="person" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>
                        {cls.trainer.firstName} {cls.trainer.lastName}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="time" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>{`${cls.duration} min`}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="location" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>{cls.type}</Text>
                    </View>
                  </View>

                  {user?.role === 'CUSTOMER' && (
                    <View style={styles.actionContainer}>
                      {booked ? (
                        <>
                          <View style={styles.bookedBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#10B981"
                            />
                            <Text style={styles.bookedText}>Booket</Text>
                          </View>
                          {booking && (
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={() => cancelBooking(booking.id)}
                            >
                              <Text style={styles.cancelButtonText}>
                                Avbestill
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.bookButton,
                            availableSpots === 0 && styles.bookButtonDisabled,
                          ]}
                          onPress={() => bookClass(cls.id)}
                          disabled={availableSpots === 0}
                        >
                          <Text
                            style={[
                              styles.bookButtonText,
                              availableSpots === 0 &&
                                styles.bookButtonTextDisabled,
                            ]}
                          >
                            {availableSpots === 0 ? 'Fullt' : 'Book'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {(user?.role === 'ADMIN' || user?.role === 'TRAINER') && (
                    <View style={styles.actionContainer}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate('ClassManagement')}
                      >
                        <Ionicons name="create-outline" size={20} color="#3B82F6" />
                        <Text style={styles.editButtonText}>Administrer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => Alert.alert('Info', `Klasse: ${cls.name}\nTrener: ${cls.trainer.firstName} ${cls.trainer.lastName}\nVarighet: ${cls.duration} min\nKapasitet: ${cls.capacity} plasser\nType: ${cls.type}\nBeskrivelse: ${cls.description || 'Ingen beskrivelse'}`)}
                      >
                        <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                        <Text style={styles.viewButtonText}>Info</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
        </Container>
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
  screenHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  classList: {
    gap: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classDateContainer: {
    flex: 1,
  },
  classDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    textTransform: 'capitalize',
  },
  classTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  spotsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
  },
  spotsIndicatorFull: {
    backgroundColor: '#FEE2E2',
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  spotsTextFull: {
    color: '#EF4444',
  },
  className: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  classDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  classInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
  },
  bookedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  bookButtonTextDisabled: {
    color: '#9CA3AF',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
});
