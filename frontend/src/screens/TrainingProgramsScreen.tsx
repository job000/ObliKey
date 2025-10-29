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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Container from '../components/Container';
import type { TrainingProgram } from '../types';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export default function TrainingProgramsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const isTrainer = user?.role === 'TRAINER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadPrograms();
  }, [filter]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? {} : { active: filter === 'active' };
      const response = await api.getTrainingPrograms(params);
      if (response.success) {
        setPrograms(response.data);
      }
    } catch (error: any) {
      console.log('Training programs endpoint not yet implemented, using mock data');
      // Mock data for demonstration (endpoint not yet implemented in backend)
      setPrograms([
        {
          id: '1',
          name: 'Styrkeøkende Program',
          description: 'Fokus på å bygge styrke over 8 uker',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString(),
          goals: 'Øke maksimal styrke i knebøy, benkpress og markløft',
          exercises: JSON.stringify([
            { name: 'Knebøy', sets: 4, reps: '5', notes: 'Fokus på tyngde' },
            { name: 'Benkpress', sets: 4, reps: '5', notes: 'Pauser på brystet' },
            { name: 'Markløft', sets: 3, reps: '5', notes: 'God teknikk' },
          ]),
          active: true,
          trainer: {
            id: '1',
            firstName: 'Erik',
            lastName: 'Trener',
          },
          customer: {
            id: '1',
            firstName: 'Ole',
            lastName: 'Nordmann',
          },
        },
        {
          id: '2',
          name: 'Kondisjonsforbedring',
          description: 'Kardio-fokusert program',
          startDate: new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString(),
          goals: 'Forbedre VO2 max og utholdenhet',
          exercises: JSON.stringify([
            { name: 'Intervallløp', sets: 5, reps: '400m', notes: '90% max puls' },
            { name: 'Romaskin', sets: 3, reps: '2000m', notes: 'Steady state' },
          ]),
          active: true,
          trainer: {
            id: '1',
            firstName: 'Erik',
            lastName: 'Trener',
          },
          customer: {
            id: '2',
            firstName: 'Kari',
            lastName: 'Nordmann',
          },
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPrograms();
  };

  const openProgramDetail = (program: TrainingProgram) => {
    setSelectedProgram(program);
    setViewMode('detail');
  };

  const closeProgramDetail = () => {
    setSelectedProgram(null);
    setViewMode('list');
  };

  const parseExercises = (exercisesString: string): Exercise[] => {
    try {
      return JSON.parse(exercisesString);
    } catch {
      return [];
    }
  };

  const getProgramStatus = (program: TrainingProgram) => {
    const now = new Date();
    const start = new Date(program.startDate);
    const end = program.endDate ? new Date(program.endDate) : null;

    if (now < start) return { label: 'Planlagt', color: '#3B82F6' };
    if (!program.active) return { label: 'Fullført', color: '#6B7280' };
    if (end && now > end) return { label: 'Utløpt', color: '#EF4444' };
    return { label: 'Aktiv', color: '#10B981' };
  };

  const renderProgramList = () => (
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
            <Text style={styles.headerTitle}>Treningsprogrammer</Text>
            {isTrainer && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => Alert.alert('Info', 'Opprett nytt program - kommer snart')}
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

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Alle
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              Aktive
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
            onPress={() => setFilter('completed')}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              Fullførte
            </Text>
          </TouchableOpacity>
        </View>

        {/* Programs List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : programs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Ingen treningsprogrammer funnet</Text>
            {isTrainer && (
              <Text style={styles.emptySubtext}>
                Opprett et nytt program for å komme i gang
              </Text>
            )}
          </View>
        ) : (
          programs.map((program) => {
            const status = getProgramStatus(program);
            const exercises = parseExercises(program.exercises);

            return (
              <TouchableOpacity
                key={program.id}
                style={styles.programCard}
                onPress={() => openProgramDetail(program)}
              >
                <View style={styles.programHeader}>
                  <View style={styles.programTitleRow}>
                    <Text style={styles.programName}>{program.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                      <Text style={styles.statusText}>{status.label}</Text>
                    </View>
                  </View>
                  {program.description && (
                    <Text style={styles.programDescription} numberOfLines={2}>
                      {program.description}
                    </Text>
                  )}
                </View>

                <View style={styles.programMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={16} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {program.customer.firstName} {program.customer.lastName}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="fitness-outline" size={16} color="#6B7280" />
                    <Text style={styles.metaText}>{`${exercises.length} øvelser`}</Text>
                  </View>
                </View>

                <View style={styles.programFooter}>
                  <Text style={styles.dateText}>
                    {new Date(program.startDate).toLocaleDateString('nb-NO')}
                    {program.endDate &&
                      ` - ${new Date(program.endDate).toLocaleDateString('nb-NO')}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </Container>
    </ScrollView>
    </SafeAreaView>
  );

  const renderProgramDetail = () => {
    if (!selectedProgram) return null;

    const exercises = parseExercises(selectedProgram.exercises);
    const status = getProgramStatus(selectedProgram);

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
        <Container>
          <TouchableOpacity style={styles.backButton} onPress={closeProgramDetail}>
            <Ionicons name="arrow-back" size={24} color="#3B82F6" />
            <Text style={styles.backText}>Tilbake</Text>
          </TouchableOpacity>

          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selectedProgram.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.label}</Text>
            </View>
          </View>

          {selectedProgram.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Beskrivelse</Text>
              <Text style={styles.sectionContent}>{selectedProgram.description}</Text>
            </View>
          )}

          {selectedProgram.goals && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mål</Text>
              <Text style={styles.sectionContent}>{selectedProgram.goals}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Periode</Text>
            <Text style={styles.sectionContent}>
              Start: {new Date(selectedProgram.startDate).toLocaleDateString('nb-NO')}
              {'\n'}
              {selectedProgram.endDate &&
                `Slutt: ${new Date(selectedProgram.endDate).toLocaleDateString('nb-NO')}`}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Øvelser</Text>
              <Text style={styles.exerciseCount}>{`${exercises.length} total`}</Text>
            </View>
            {exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <View style={styles.exerciseMeta}>
                  <Text style={styles.exerciseDetails}>
                    {exercise.sets} sett × {exercise.reps} reps
                  </Text>
                </View>
                {exercise.notes && (
                  <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                )}
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trener</Text>
            <Text style={styles.sectionContent}>
              {selectedProgram.trainer.firstName} {selectedProgram.trainer.lastName}
            </Text>
          </View>
        </Container>
      </ScrollView>
      </SafeAreaView>
    );
  };

  return (
    <View style={styles.wrapper}>
      {viewMode === 'list' ? renderProgramList() : renderProgramDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  wrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
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
    marginBottom: 24,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFF',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  programCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  programHeader: {
    marginBottom: 12,
  },
  programTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  programName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  programDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  programMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  programFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  exerciseCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  exerciseMeta: {
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  exerciseNotes: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
