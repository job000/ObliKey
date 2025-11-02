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
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Container from '../components/Container';
import { SystemExercise } from '../types/workout';
import { ExerciseMediaGallery } from '../components/workout/ExerciseMediaGallery';
import { useAuth } from '../contexts/AuthContext';

// Constants for exercise types, equipment, muscles, and difficulty
const EXERCISE_TYPES = [
  'STRENGTH',
  'CARDIO',
  'FLEXIBILITY',
  'BALANCE',
  'PLYOMETRIC',
  'POWERLIFTING',
  'OLYMPIC',
  'STRETCHING',
];

const EQUIPMENT_OPTIONS = [
  'BARBELL',
  'DUMBBELL',
  'KETTLEBELL',
  'MACHINE',
  'CABLE',
  'BODYWEIGHT',
  'BANDS',
  'MEDICINE_BALL',
  'FOAM_ROLLER',
  'BENCH',
  'PULL_UP_BAR',
  'PLATE',
  'LANDMINE',
  'TRX',
  'BATTLE_ROPE',
  'BOSU_BALL',
  'SMITH_MACHINE',
  'TRAP_BAR',
];

const MUSCLE_GROUPS = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'ABS',
  'OBLIQUES',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'TRAPS',
  'LATS',
  'LOWER_BACK',
  'HIP_FLEXORS',
];

const DIFFICULTY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export default function ExerciseManagementScreen({ navigation }: any) {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<SystemExercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<SystemExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<SystemExercise | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [mediaGalleryVisible, setMediaGalleryVisible] = useState(false);
  const [mediaExercise, setMediaExercise] = useState<SystemExercise | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    type: 'STRENGTH',
    equipment: [] as string[],
    primaryMuscles: [] as string[],
    secondaryMuscles: [] as string[],
    difficulty: 'BEGINNER',
    tips: '',
    warnings: '',
    published: true,
  });

  // Check if user has permission
  const hasPermission = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TRAINER';

  useEffect(() => {
    if (hasPermission) {
      loadExercises();
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [exercises, searchQuery, muscleFilter, equipmentFilter]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      // Load custom exercises (tenant-specific) instead of system exercises
      // This ensures exercises are isolated per tenant
      const response = await api.getCustomExercises();
      if (response.success) {
        setExercises(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load exercises:', error);
      Alert.alert('Feil', 'Kunne ikke laste øvelser');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...exercises];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.description?.toLowerCase().includes(query)
      );
    }

    // Muscle group filter
    if (muscleFilter !== 'all') {
      filtered = filtered.filter(
        (ex) =>
          ex.primaryMuscles.includes(muscleFilter) ||
          ex.secondaryMuscles?.includes(muscleFilter)
      );
    }

    // Equipment filter
    if (equipmentFilter !== 'all') {
      filtered = filtered.filter((ex) => ex.equipment.includes(equipmentFilter));
    }

    setFilteredExercises(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExercises();
  };

  const openAddModal = () => {
    setEditMode(false);
    setSelectedExercise(null);
    setFormData({
      name: '',
      description: '',
      instructions: '',
      type: 'STRENGTH',
      equipment: [],
      primaryMuscles: [],
      secondaryMuscles: [],
      difficulty: 'BEGINNER',
      tips: '',
      warnings: '',
      published: true,
    });
    setModalVisible(true);
  };

  const openEditModal = (exercise: SystemExercise) => {
    setEditMode(true);
    setSelectedExercise(exercise);
    setFormData({
      name: exercise.name,
      description: exercise.description || '',
      instructions: exercise.instructions || '',
      type: exercise.type,
      equipment: exercise.equipment,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles || [],
      difficulty: exercise.difficulty,
      tips: exercise.tips || '',
      warnings: exercise.warnings || '',
      published: exercise.published !== undefined ? exercise.published : true,
    });
    setModalVisible(true);
  };

  const handleSaveExercise = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Feil', 'Vennligst fyll ut navn');
      return;
    }

    if (formData.primaryMuscles.length === 0) {
      Alert.alert('Feil', 'Vennligst velg minst én primær muskelgruppe');
      return;
    }

    if (formData.equipment.length === 0) {
      Alert.alert('Feil', 'Vennligst velg minst ett utstyr');
      return;
    }

    try {
      const exerciseData = {
        name: formData.name,
        description: formData.description || undefined,
        instructions: formData.instructions || undefined,
        type: formData.type,
        equipment: formData.equipment,
        primaryMuscles: formData.primaryMuscles,
        secondaryMuscles: formData.secondaryMuscles.length > 0 ? formData.secondaryMuscles : undefined,
        difficulty: formData.difficulty,
        tips: formData.tips || undefined,
        warnings: formData.warnings || undefined,
      };

      if (editMode && selectedExercise) {
        // Note: Backend may need to add update endpoint for system exercises
        const response = await api.updateCustomExercise(selectedExercise.id, exerciseData);
        if (response.success) {
          setExercises(
            exercises.map((ex) => (ex.id === selectedExercise.id ? response.data : ex))
          );
          Alert.alert('Suksess', 'Øvelse oppdatert');
        }
      } else {
        // Create new custom exercise (will be used as system exercise)
        const response = await api.createCustomExercise(exerciseData);
        if (response.success) {
          // Add to list
          setExercises([response.data, ...exercises]);
          Alert.alert('Suksess', 'Øvelse opprettet');
        }
      }

      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Feil', error.response?.data?.error || 'Kunne ikke lagre øvelse');
    }
  };

  const handleDeleteExercise = (exerciseId: string) => {
    setModalVisible(false);
    setTimeout(() => {
      Alert.alert(
        'Slett øvelse',
        'Er du sikker på at du vil slette denne øvelsen?',
        [
          { text: 'Avbryt', style: 'cancel' },
          {
            text: 'Slett',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.deleteCustomExercise(exerciseId);
                setExercises(exercises.filter((ex) => ex.id !== exerciseId));
                Alert.alert('Suksess', 'Øvelse slettet');
              } catch (error: any) {
                Alert.alert(
                  'Feil',
                  error.response?.data?.error || 'Kunne ikke slette øvelse'
                );
              }
            },
          },
        ]
      );
    }, 300);
  };

  const handleTogglePublished = async (exerciseId: string, currentStatus: boolean) => {
    try {
      const response = await api.updateCustomExercise(exerciseId, {
        published: !currentStatus,
      });

      if (response.success) {
        setExercises(
          exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, published: !currentStatus } : ex
          )
        );
        Alert.alert('Suksess', !currentStatus ? 'Øvelse publisert' : 'Øvelse avpublisert');
      }
    } catch (error: any) {
      Alert.alert(
        'Feil',
        error.response?.data?.error || 'Kunne ikke endre publisert status'
      );
    }
  };

  const toggleEquipment = (equipment: string) => {
    if (formData.equipment.includes(equipment)) {
      setFormData({
        ...formData,
        equipment: formData.equipment.filter((e) => e !== equipment),
      });
    } else {
      setFormData({
        ...formData,
        equipment: [...formData.equipment, equipment],
      });
    }
  };

  const togglePrimaryMuscle = (muscle: string) => {
    if (formData.primaryMuscles.includes(muscle)) {
      setFormData({
        ...formData,
        primaryMuscles: formData.primaryMuscles.filter((m) => m !== muscle),
      });
    } else {
      setFormData({
        ...formData,
        primaryMuscles: [...formData.primaryMuscles, muscle],
      });
    }
  };

  const toggleSecondaryMuscle = (muscle: string) => {
    if (formData.secondaryMuscles.includes(muscle)) {
      setFormData({
        ...formData,
        secondaryMuscles: formData.secondaryMuscles.filter((m) => m !== muscle),
      });
    } else {
      setFormData({
        ...formData,
        secondaryMuscles: [...formData.secondaryMuscles, muscle],
      });
    }
  };

  const openMediaGallery = (exercise: SystemExercise) => {
    setMediaExercise(exercise);
    setMediaGalleryVisible(true);
  };

  const formatMuscles = (muscles: string[]) => {
    return muscles.map((m) => m.replace('_', ' ')).join(', ');
  };

  const formatEquipment = (equipment: string[]) => {
    return equipment.map((e) => e.replace('_', ' ')).join(', ');
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Container>
          <View style={styles.unauthorizedContainer}>
            <Ionicons name="lock-closed-outline" size={64} color="#EF4444" />
            <Text style={styles.unauthorizedText}>
              Du har ikke tilgang til denne siden
            </Text>
            <Text style={styles.unauthorizedSubtext}>
              Kun administratorer og trenere kan administrere øvelser
            </Text>
          </View>
        </Container>
      </SafeAreaView>
    );
  }

  if (loading) {
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
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Container>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Mine Øvelser</Text>
              <Text style={styles.subtitle}>Administrer tenant-spesifikke øvelser</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Ny øvelse</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Søk etter øvelser..."
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <Text style={styles.filterLabel}>Muskelgruppe</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    muscleFilter === 'all' && styles.filterChipActive,
                  ]}
                  onPress={() => setMuscleFilter('all')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      muscleFilter === 'all' && styles.filterChipTextActive,
                    ]}
                  >
                    Alle
                  </Text>
                </TouchableOpacity>
                {MUSCLE_GROUPS.slice(0, 8).map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    style={[
                      styles.filterChip,
                      muscleFilter === muscle && styles.filterChipActive,
                    ]}
                    onPress={() => setMuscleFilter(muscle)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        muscleFilter === muscle && styles.filterChipTextActive,
                      ]}
                    >
                      {muscle.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.filtersContainer}>
            <Text style={styles.filterLabel}>Utstyr</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    equipmentFilter === 'all' && styles.filterChipActive,
                  ]}
                  onPress={() => setEquipmentFilter('all')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      equipmentFilter === 'all' && styles.filterChipTextActive,
                    ]}
                  >
                    Alle
                  </Text>
                </TouchableOpacity>
                {EQUIPMENT_OPTIONS.slice(0, 8).map((equipment) => (
                  <TouchableOpacity
                    key={equipment}
                    style={[
                      styles.filterChip,
                      equipmentFilter === equipment && styles.filterChipActive,
                    ]}
                    onPress={() => setEquipmentFilter(equipment)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        equipmentFilter === equipment && styles.filterChipTextActive,
                      ]}
                    >
                      {equipment.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {filteredExercises.length} av {exercises.length} øvelser
            </Text>
          </View>

          {/* Exercise List */}
          <View style={styles.exercisesList}>
            {filteredExercises.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="barbell-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  {exercises.length === 0
                    ? 'Ingen øvelser funnet'
                    : 'Ingen øvelser matcher filtrene'}
                </Text>
                {exercises.length === 0 && (
                  <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                    <Text style={styles.emptyButtonText}>Opprett øvelse</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.exerciseCard}
                  onPress={() => openEditModal(exercise)}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseCardContent}>
                    {/* Exercise Image */}
                    <View style={styles.exerciseImageContainer}>
                      {exercise.imageUrl || exercise.media?.[0]?.url ? (
                        <Image
                          source={{ uri: exercise.imageUrl || exercise.media?.[0]?.url }}
                          style={styles.exerciseImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.exerciseImagePlaceholder}>
                          <Ionicons name="barbell" size={40} color="#9CA3AF" />
                        </View>
                      )}
                    </View>

                    {/* Exercise Info */}
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      {exercise.description && (
                        <Text style={styles.exerciseDescription} numberOfLines={2}>
                          {exercise.description}
                        </Text>
                      )}
                      <View style={styles.exerciseMeta}>
                        <View style={styles.metaChip}>
                          <Ionicons name="fitness" size={14} color="#6B7280" />
                          <Text style={styles.metaText}>
                            {exercise.type.replace('_', ' ')}
                          </Text>
                        </View>
                        <View style={styles.metaChip}>
                          <Ionicons name="bar-chart" size={14} color="#6B7280" />
                          <Text style={styles.metaText}>{exercise.difficulty}</Text>
                        </View>
                      </View>
                      <View style={styles.musclesRow}>
                        <Ionicons name="body" size={14} color="#6B7280" />
                        <Text style={styles.musclesText} numberOfLines={1}>
                          {formatMuscles(exercise.primaryMuscles)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.publishButton,
                        exercise.published ? styles.unpublishButton : null,
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTogglePublished(exercise.id, exercise.published !== false);
                      }}
                    >
                      <Ionicons
                        name={exercise.published !== false ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={exercise.published !== false ? '#9CA3AF' : '#10B981'}
                      />
                      <Text
                        style={[
                          styles.publishButtonText,
                          exercise.published !== false
                            ? styles.unpublishButtonText
                            : null,
                        ]}
                      >
                        {exercise.published !== false ? 'Skjul' : 'Vis'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mediaButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        openMediaGallery(exercise);
                      }}
                    >
                      <Ionicons name="images-outline" size={18} color="#8B5CF6" />
                      <Text style={styles.mediaButtonText}>Media</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditModal(exercise)}
                    >
                      <Ionicons name="create-outline" size={18} color="#3B82F6" />
                      <Text style={styles.editButtonText}>Rediger</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteExercise(exercise.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Container>
      </ScrollView>

      {/* Add/Edit Exercise Modal */}
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
                    {editMode ? 'Rediger øvelse' : 'Ny øvelse'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#111827" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Navn *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder="Eks: Benkpress"
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
                      placeholder="Kort beskrivelse av øvelsen"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Instruksjoner</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.instructions}
                      onChangeText={(text) =>
                        setFormData({ ...formData, instructions: text })
                      }
                      placeholder="Trinn-for-trinn instruksjoner"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Type *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.chipsContainer}>
                        {EXERCISE_TYPES.map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.chip,
                              formData.type === type && styles.chipActive,
                            ]}
                            onPress={() => setFormData({ ...formData, type })}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                formData.type === type && styles.chipTextActive,
                              ]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Vanskelighetsgrad *</Text>
                    <View style={styles.chipsContainer}>
                      {DIFFICULTY_LEVELS.map((difficulty) => (
                        <TouchableOpacity
                          key={difficulty}
                          style={[
                            styles.chip,
                            formData.difficulty === difficulty && styles.chipActive,
                          ]}
                          onPress={() => setFormData({ ...formData, difficulty })}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              formData.difficulty === difficulty && styles.chipTextActive,
                            ]}
                          >
                            {difficulty}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Utstyr * (velg minst ett)</Text>
                    <View style={styles.chipsContainer}>
                      {EQUIPMENT_OPTIONS.map((equipment) => (
                        <TouchableOpacity
                          key={equipment}
                          style={[
                            styles.chip,
                            formData.equipment.includes(equipment) && styles.chipActive,
                          ]}
                          onPress={() => toggleEquipment(equipment)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              formData.equipment.includes(equipment) &&
                                styles.chipTextActive,
                            ]}
                          >
                            {equipment.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Primære muskelgrupper * (velg minst én)
                    </Text>
                    <View style={styles.chipsContainer}>
                      {MUSCLE_GROUPS.map((muscle) => (
                        <TouchableOpacity
                          key={muscle}
                          style={[
                            styles.chip,
                            formData.primaryMuscles.includes(muscle) && styles.chipActive,
                          ]}
                          onPress={() => togglePrimaryMuscle(muscle)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              formData.primaryMuscles.includes(muscle) &&
                                styles.chipTextActive,
                            ]}
                          >
                            {muscle.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Sekundære muskelgrupper (valgfritt)</Text>
                    <View style={styles.chipsContainer}>
                      {MUSCLE_GROUPS.map((muscle) => (
                        <TouchableOpacity
                          key={muscle}
                          style={[
                            styles.chip,
                            formData.secondaryMuscles.includes(muscle) &&
                              styles.chipActive,
                          ]}
                          onPress={() => toggleSecondaryMuscle(muscle)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              formData.secondaryMuscles.includes(muscle) &&
                                styles.chipTextActive,
                            ]}
                          >
                            {muscle.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Tips (valgfritt)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.tips}
                      onChangeText={(text) => setFormData({ ...formData, tips: text })}
                      placeholder="Nyttige tips for å utføre øvelsen korrekt"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Advarsler (valgfritt)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.warnings}
                      onChangeText={(text) =>
                        setFormData({ ...formData, warnings: text })
                      }
                      placeholder="Viktige advarsler eller forsiktighetsregler"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {editMode && (
                    <View style={styles.modalActionButtons}>
                      <TouchableOpacity
                        style={styles.modalDeleteButton}
                        onPress={() => handleDeleteExercise(selectedExercise?.id || '')}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text style={styles.modalDeleteButtonText}>Slett øvelse</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>

                {/* Fixed Footer with Save Button */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveExercise}>
                    <Text style={styles.saveButtonText}>
                      {editMode ? 'Oppdater øvelse' : 'Opprett øvelse'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Media Gallery Modal */}
      <Modal visible={mediaGalleryVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          {mediaExercise && (
            <ExerciseMediaGallery
              exerciseId={mediaExercise.id}
              exerciseType="system"
              exerciseName={mediaExercise.name}
              canEdit={true}
              onClose={() => setMediaGalleryVisible(false)}
            />
          )}
        </SafeAreaView>
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
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  unauthorizedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  unauthorizedSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
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
  statsContainer: {
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  exercisesList: {
    gap: 12,
    paddingBottom: 24,
  },
  exerciseCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  exerciseImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  exerciseImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  musclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  musclesText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
  unpublishButton: {
    borderColor: '#9CA3AF',
    backgroundColor: '#F3F4F6',
  },
  publishButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  unpublishButtonText: {
    color: '#6B7280',
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
  mediaButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
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
  modalFooter: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#FFF',
  },
  modalActionButtons: {
    marginBottom: 16,
  },
  modalDeleteButton: {
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
});
