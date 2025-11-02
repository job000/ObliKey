import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../services/api';
import { ExerciseStatisticsModal } from '../components/workout/ExerciseStatisticsModal';
import { MuscleGroupAnalytics } from '../components/workout/MuscleGroupAnalytics';
import { ExerciseLog } from '../utils/exerciseStats';

const { width, height } = Dimensions.get('window');

// Modern color palette - Matching Dashboard design
const COLORS = {
  // Primary - Modern blue (matching Dashboard)
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',

  // Semantic colors
  success: '#10B981',
  successLight: '#34D399',
  danger: '#DC2626',
  warning: '#F59E0B',

  // Accent purple
  accent: '#8B5CF6',
  accentLight: '#A78BFA',

  // Neutral grays
  background: '#F8F9FA',
  cardBg: '#FFFFFF',
  text: '#212529',
  textSecondary: '#6C757D',
  textLight: '#9CA3AF',

  // Borders and dividers
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Shadow
  shadow: 'rgba(0, 0, 0, 0.05)',
};

interface SystemExercise {
  id: string;
  name: string;
  description?: string;
  type: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  difficulty: string;
  imageUrl?: string;
  instructions?: string;
}

interface ExerciseSet {
  setNumber: number;
  reps?: number;
  weight?: number;
  weightUnit: 'kg' | 'lb';
  duration?: number;
  distance?: number;
  completed: boolean;
  previous?: {
    reps?: number;
    weight?: number;
  };
}

interface ActiveExercise {
  id: string;
  exerciseId: string;
  name: string;
  type: string;
  sets: ExerciseSet[];
  notes?: string;
}

interface WorkoutSchedule {
  id: string;
  programId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime?: string;
  isActive: boolean;
}

interface WorkoutProgram {
  id: string;
  name: string;
  description?: string;
  exercises: any[];
  isActive?: boolean;
  schedules?: WorkoutSchedule[];
  _count?: {
    sessions: number;
  };
}

interface WorkoutSession {
  id: string;
  programId?: string;
  program?: WorkoutProgram;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  notes?: string;
  exerciseLogs?: any[];
}

interface ExercisePrediction {
  exerciseId: string;
  exerciseName: string;
  currentMax: number;
  predictedMax: number;
  confidence: number;
  progressionRate: number;
  weeksToGoal: number;
}

interface OptimalTimeData {
  hour: number;
  performanceScore: number;
  sessionCount: number;
}

interface VolumeIntensityData {
  weeklyVolume: Array<{ week: string; volume: number }>;
  intensityDistribution: { light: number; medium: number; heavy: number };
  recoveryScore: number;
}

interface SmartRecommendation {
  type: 'progression' | 'recovery' | 'frequency' | 'volume';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

type TabType = 'home' | 'workout' | 'history' | 'programs' | 'stats' | 'predictions';

const MUSCLE_GROUPS = [
  { key: 'ALL', label: 'Alle', icon: 'fitness-outline' },
  { key: 'CHEST', label: 'Bryst', icon: 'body-outline' },
  { key: 'BACK', label: 'Rygg', icon: 'shield-outline' },
  { key: 'SHOULDERS', label: 'Skuldre', icon: 'radio-button-on-outline' },
  { key: 'BICEPS', label: 'Biceps', icon: 'fitness-outline' },
  { key: 'TRICEPS', label: 'Triceps', icon: 'flash-outline' },
  { key: 'QUADS', label: 'Lår', icon: 'reorder-two-outline' },
  { key: 'HAMSTRINGS', label: 'Hamstrings', icon: 'remove-outline' },
  { key: 'GLUTES', label: 'Rumpe', icon: 'ellipse-outline' },
  { key: 'CALVES', label: 'Legger', icon: 'swap-vertical-outline' },
  { key: 'ABS', label: 'Mage', icon: 'grid-outline' },
];

const WEEKDAYS = [
  { key: 1, label: 'Man', fullLabel: 'Mandag' },
  { key: 2, label: 'Tir', fullLabel: 'Tirsdag' },
  { key: 3, label: 'Ons', fullLabel: 'Onsdag' },
  { key: 4, label: 'Tor', fullLabel: 'Torsdag' },
  { key: 5, label: 'Fre', fullLabel: 'Fredag' },
  { key: 6, label: 'Lør', fullLabel: 'Lørdag' },
  { key: 0, label: 'Søn', fullLabel: 'Søndag' },
];

// Exercise image mapping (placeholder URLs - replace with real images)
const getExerciseImage = (exerciseName: string) => {
  const imageMap: { [key: string]: string } = {
    'Barbell Bench Press': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/barbell_bench_press/images/0.jpg',
    'Incline Barbell Bench Press': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/incline_barbell_bench_press/images/0.jpg',
    'Dumbbell Bench Press': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/dumbbell_bench_press/images/0.jpg',
    'Push-ups': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/push_up/images/0.jpg',
    'Barbell Squat': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/barbell_squat/images/0.jpg',
    'Deadlift': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/deadlift/images/0.jpg',
    'Pull-ups': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/pull_up/images/0.jpg',
    'Lat Pulldown': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/lat_pulldown/images/0.jpg',
  };
  return imageMap[exerciseName] || 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=' + encodeURIComponent(exerciseName);
};

export default function WorkoutScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [loading, setLoading] = useState(false);

  // Home/Dashboard
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSession[]>([]);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);

  // Active Workout
  const [activeWorkout, setActiveWorkout] = useState<ActiveExercise[]>([]);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [currentProgram, setCurrentProgram] = useState<WorkoutProgram | null>(null);
  const [restTimer, setRestTimer] = useState(0);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);

  // Exercise Library
  const [exercises, setExercises] = useState<SystemExercise[]>([]);
  const [customExercises, setCustomExercises] = useState<any[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<SystemExercise | null>(null);

  // Programs
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [editingProgram, setEditingProgram] = useState<WorkoutProgram | null>(null);
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [programExercises, setProgramExercises] = useState<any[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // History
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);

  // Custom Exercise Modal
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customExerciseType, setCustomExerciseType] = useState('STRENGTH');

  // Exercise Statistics Modal
  const [showExerciseStats, setShowExerciseStats] = useState(false);
  const [selectedExerciseForStats, setSelectedExerciseForStats] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [exerciseStatsLogs, setExerciseStatsLogs] = useState<ExerciseLog[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Predictions Tab
  const [predictions, setPredictions] = useState<ExercisePrediction[]>([]);
  const [optimalTimeData, setOptimalTimeData] = useState<OptimalTimeData[]>([]);
  const [volumeIntensityData, setVolumeIntensityData] = useState<VolumeIntensityData | null>(null);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [hasEnoughData, setHasEnoughData] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'programs') {
      loadPrograms();
    } else if (activeTab === 'history') {
      loadSessions();
    } else if (activeTab === 'home') {
      loadDashboardData();
    } else if (activeTab === 'predictions') {
      loadPredictionsData();
    }
  }, [activeTab]);

  // Workout timer
  useEffect(() => {
    let interval: any;
    if (workoutStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - workoutStartTime.getTime()) / 1000);
        setWorkoutDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [workoutStartTime]);

  // Rest timer
  useEffect(() => {
    let interval: any;
    if (restTimerActive && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setRestTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimerActive, restTimer]);

  const loadInitialData = async () => {
    await Promise.all([
      loadExercises(),
      loadPrograms(),
      loadSessions(),
    ]);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [sessionsRes] = await Promise.all([
        api.getWorkoutSessions({ limit: 5 }),
      ]);

      if (sessionsRes.success) {
        setRecentWorkouts(sessionsRes.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async () => {
    try {
      const [systemRes, customRes] = await Promise.all([
        api.getSystemExercises(),
        api.getCustomExercises(),
      ]);

      if (systemRes.success) setExercises(systemRes.data || []);
      if (customRes.success) setCustomExercises(customRes.data || []);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    }
  };

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const response = await api.getWorkoutPrograms();
      if (response.success) {
        setPrograms(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      console.log('🔄 Loading templates...');
      setLoading(true);
      const response = await api.getWorkoutTemplates();
      console.log('📥 Templates response:', response);
      if (response.success) {
        console.log('✅ Templates data:', response.data?.length, 'templates');
        setTemplates(response.data || []);
      } else {
        console.log('❌ Response not successful:', response);
      }
    } catch (error) {
      console.error('❌ Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: any) => {
    setProgramName(template.name);
    setProgramDescription(template.description);
    setProgramExercises(template.exercises || []);
    setSelectedDays([]); // Templates start with no schedule
    setShowTemplates(false);
    setShowNewProgram(true);
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await api.getWorkoutSessions();
      if (response.success) {
        setSessions(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictionsData = async () => {
    try {
      console.log('[Predictions] ========== LOADING PREDICTIONS DATA ==========');
      setPredictionsLoading(true);

      // First, load sessions to check if we have enough data
      console.log('[Predictions] Fetching workout sessions...');
      const sessionsRes = await api.getWorkoutSessions();
      let totalSessions = 0;

      if (sessionsRes.success) {
        totalSessions = sessionsRes.data?.length || 0;
        setSessions(sessionsRes.data || []);
        console.log('[Predictions] ✓ Sessions loaded:', totalSessions);
        console.log('[Predictions] Sessions data:', JSON.stringify(sessionsRes.data?.slice(0, 2), null, 2));
      } else {
        console.log('[Predictions] ✗ Failed to load sessions:', sessionsRes);
      }

      // Check if we have enough data before making API calls
      if (totalSessions < 5) {
        console.log('[Predictions] ✗ Not enough data - only', totalSessions, 'sessions (need 5)');
        setHasEnoughData(false);
        setPredictionsLoading(false);
        return;
      }

      console.log('[Predictions] ✓ Enough sessions, loading prediction data...');
      setHasEnoughData(true);

      // Now load all prediction data
      const [predictionsRes, optimalTimeRes, volumeIntensityRes, recommendationsRes] = await Promise.all([
        api.getProgressionPredictions().catch(err => {
          console.error('[Predictions] ✗ Progression predictions error:', err);
          console.error('[Predictions] Error details:', err.response?.data || err.message);
          return { success: false, data: [], error: err.message };
        }),
        api.getOptimalTrainingTime().catch(err => {
          console.error('[Predictions] ✗ Optimal time error:', err);
          console.error('[Predictions] Error details:', err.response?.data || err.message);
          return { success: false, data: [], error: err.message };
        }),
        api.getVolumeIntensityAnalysis().catch(err => {
          console.error('[Predictions] ✗ Volume intensity error:', err);
          console.error('[Predictions] Error details:', err.response?.data || err.message);
          return { success: false, data: null, error: err.message };
        }),
        api.getSmartRecommendations().catch(err => {
          console.error('[Predictions] ✗ Recommendations error:', err);
          console.error('[Predictions] Error details:', err.response?.data || err.message);
          return { success: false, data: [], error: err.message };
        }),
      ]);

      console.log('[Predictions] ========== API RESPONSES ==========');
      console.log('[Predictions] Progression predictions response:', {
        success: predictionsRes.success,
        dataLength: predictionsRes.data?.length,
        error: predictionsRes.error
      });
      console.log('[Predictions] Optimal time response:', {
        success: optimalTimeRes.success,
        dataLength: optimalTimeRes.data?.length,
        error: optimalTimeRes.error
      });
      console.log('[Predictions] Volume intensity response:', {
        success: volumeIntensityRes.success,
        hasData: !!volumeIntensityRes.data,
        error: volumeIntensityRes.error
      });
      console.log('[Predictions] Recommendations response:', {
        success: recommendationsRes.success,
        dataLength: recommendationsRes.data?.length,
        error: recommendationsRes.error
      });

      if (predictionsRes.success) {
        // Backend returns { data: { exercises: [...], totalExercises: N, exercisesWithPredictions: M } }
        const exercisesList = predictionsRes.data?.exercises || predictionsRes.data || [];
        console.log('[Predictions] ✓ Setting predictions:', exercisesList?.length || 0);
        console.log('[Predictions] Raw predictions data:', predictionsRes.data);

        // Map the backend format to what the UI expects
        const mappedPredictions = Array.isArray(exercisesList) ? exercisesList.map((item: any) => {
          const prog = item.progression || {};
          return {
            exerciseId: item.exercise?.id,
            exerciseName: item.exercise?.name || 'Unknown Exercise',
            currentMax: prog.currentMax || 0,
            predictedMax: prog.predictedMax || 0,
            progressionRate: prog.progressionRate || 0,
            confidence: prog.confidence || 0,
            weeksAnalyzed: prog.weeksAnalyzed || 0,
            totalWorkouts: item.exercise?.workoutCount || 0
          };
        }) : [];

        console.log('[Predictions] Mapped predictions:', mappedPredictions.length);
        setPredictions(mappedPredictions);
      } else {
        console.log('[Predictions] ✗ Not setting predictions');
        setPredictions([]);
      }

      if (optimalTimeRes.success) {
        console.log('[Predictions] ✓ Setting optimal time data:', optimalTimeRes.data?.length || 0);
        setOptimalTimeData(optimalTimeRes.data || []);
      } else {
        console.log('[Predictions] ✗ Not setting optimal time data');
        setOptimalTimeData([]);
      }

      if (volumeIntensityRes.success) {
        console.log('[Predictions] ✓ Setting volume intensity data:', volumeIntensityRes.data);
        setVolumeIntensityData(volumeIntensityRes.data);
      } else {
        console.log('[Predictions] ✗ Not setting volume intensity data');
        setVolumeIntensityData(null);
      }

      if (recommendationsRes.success) {
        console.log('[Predictions] ✓ Setting recommendations:', recommendationsRes.data?.length || 0);
        setRecommendations(recommendationsRes.data || []);
      } else {
        console.log('[Predictions] ✗ Not setting recommendations');
        setRecommendations([]);
      }

      console.log('[Predictions] ========== STATE UPDATE COMPLETE ==========');
    } catch (error: any) {
      console.error('[Predictions] ✗ CRITICAL ERROR loading predictions:', error);
      console.error('[Predictions] Error stack:', error.stack);
      setHasEnoughData(false);
    } finally {
      setPredictionsLoading(false);
      console.log('[Predictions] ========== LOADING COMPLETE ==========');
    }
  };

  const startQuickWorkout = () => {
    setWorkoutStartTime(new Date());
    setActiveWorkout([]);
    setActiveTab('workout');
  };

  const startProgramWorkout = (program: WorkoutProgram) => {
    setCurrentProgram(program);
    setWorkoutStartTime(new Date());

    const activeExercises: ActiveExercise[] = program.exercises?.map((ex, idx) => ({
      id: `active-${idx}`,
      exerciseId: ex.customExerciseId || ex.exerciseId,
      name: ex.name || ex.customExercise?.name || 'Øvelse',
      type: ex.type || ex.customExercise?.type || 'STRENGTH',
      sets: ex.sets?.map((set: any, i: number) => ({
        setNumber: i + 1,
        reps: set.reps,
        weight: set.weight,
        weightUnit: ex.weightUnit || set.weightUnit || 'kg',
        completed: false,
        previous: undefined,
      })) || Array.from({ length: 3 }, (_, i) => ({
        setNumber: i + 1,
        reps: undefined,
        weight: ex.weight,
        weightUnit: ex.weightUnit || 'kg',
        completed: false,
        previous: undefined,
      })),
      notes: ex.notes,
    })) || [];

    setActiveWorkout(activeExercises);
    setActiveTab('workout');
  };

  const addExerciseToActiveWorkout = (exercise: SystemExercise) => {
    const newExercise: ActiveExercise = {
      id: `active-${Date.now()}`,
      exerciseId: exercise.id,
      name: exercise.name,
      type: exercise.type,
      sets: Array.from({ length: 3 }, (_, i) => ({
        setNumber: i + 1,
        reps: undefined,
        weight: undefined,
        weightUnit: 'kg',
        completed: false,
      })),
    };

    setActiveWorkout([...activeWorkout, newExercise]);
    setShowAddExercise(false);
  };

  const updateSet = (exerciseIdx: number, setIdx: number, field: string, value: any) => {
    const updated = [...activeWorkout];
    updated[exerciseIdx].sets[setIdx] = {
      ...updated[exerciseIdx].sets[setIdx],
      [field]: value,
    };
    setActiveWorkout(updated);
  };

  const completeSet = (exerciseIdx: number, setIdx: number) => {
    const updated = [...activeWorkout];
    const set = updated[exerciseIdx].sets[setIdx];
    const exercise = updated[exerciseIdx];

    // If trying to complete, validate required fields
    if (!set.completed) {
      if (exercise.type === 'CARDIO') {
        if (!set.duration && !set.distance) {
          Alert.alert('Manglende data', 'Legg til varighet eller distanse før du fullfører settet');
          return;
        }
      } else {
        // For STRENGTH exercises, require either reps or weight (or both)
        if (!set.reps && !set.weight) {
          Alert.alert('Manglende data', 'Legg til reps eller vekt før du fullfører settet');
          return;
        }
      }
    }

    updated[exerciseIdx].sets[setIdx].completed = !updated[exerciseIdx].sets[setIdx].completed;
    setActiveWorkout(updated);

    if (updated[exerciseIdx].sets[setIdx].completed) {
      setRestTimer(90);
      setRestTimerActive(true);
    }
  };

  const addSetToExercise = (exerciseIdx: number) => {
    const updated = [...activeWorkout];
    const lastSet = updated[exerciseIdx].sets[updated[exerciseIdx].sets.length - 1];
    updated[exerciseIdx].sets.push({
      setNumber: updated[exerciseIdx].sets.length + 1,
      reps: lastSet?.reps,
      weight: lastSet?.weight,
      weightUnit: lastSet?.weightUnit || 'kg',
      completed: false,
    });
    setActiveWorkout(updated);
  };

  const removeSetFromExercise = (exerciseIdx: number, setIdx: number) => {
    const updated = [...activeWorkout];

    // Don't allow removal if only one set remains
    if (updated[exerciseIdx].sets.length <= 1) {
      Alert.alert('Kan ikke fjerne', 'Du må ha minst ett sett per øvelse');
      return;
    }

    // Remove the set
    updated[exerciseIdx].sets.splice(setIdx, 1);

    // Renumber remaining sets
    updated[exerciseIdx].sets.forEach((set, idx) => {
      set.setNumber = idx + 1;
    });

    setActiveWorkout(updated);
  };

  const finishWorkout = async () => {
    if (!workoutStartTime) return;

    Alert.alert(
      'Fullfør økt',
      'Er du sikker på at du vil fullføre denne økten?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Fullfør',
          style: 'default',
          onPress: async () => {
            try {
              await api.startWorkoutSession({
                programId: currentProgram?.id,
                startedAt: workoutStartTime.toISOString(),
                completedAt: new Date().toISOString(),
                notes: '',
              });

              Alert.alert('Bra jobbet!', 'Økten er lagret');
              setWorkoutStartTime(null);
              setActiveWorkout([]);
              setCurrentProgram(null);
              setActiveTab('home');
              loadDashboardData();
            } catch (error) {
              Alert.alert('Feil', 'Kunne ikke lagre økten');
            }
          },
        },
      ]
    );
  };

  const cancelWorkout = () => {
    Alert.alert(
      'Avbryt økt',
      'Er du sikker? All progresjon vil gå tapt.',
      [
        { text: 'Nei', style: 'cancel' },
        {
          text: 'Ja, avbryt',
          style: 'destructive',
          onPress: () => {
            setWorkoutStartTime(null);
            setActiveWorkout([]);
            setCurrentProgram(null);
            setActiveTab('home');
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const allExercises = [...exercises, ...customExercises];
  const filteredExercises = allExercises.filter(ex => {
    const matchesMuscle = selectedMuscle === 'ALL' ||
      ex.primaryMuscles?.includes(selectedMuscle) ||
      ex.secondaryMuscles?.includes(selectedMuscle);
    const matchesSearch = !searchQuery ||
      ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  // Helper function to format schedule days
  const getScheduleDaysText = (schedules?: WorkoutSchedule[]) => {
    if (!schedules || schedules.length === 0) {
      return 'Når som helst';
    }
    const dayLabels = schedules
      .map(s => WEEKDAYS.find(d => d.key === s.dayOfWeek)?.label)
      .filter(Boolean)
      .join(', ');
    return dayLabels;
  };

  // Save program function
  const saveProgram = async () => {
    if (!programName.trim()) {
      Alert.alert('Feil', 'Vennligst skriv inn programnavn');
      return;
    }

    try {
      setLoading(true);
      let programId: string;

      if (editingProgram) {
        await api.updateWorkoutProgram(editingProgram.id, {
          name: programName,
          description: programDescription,
          exercises: programExercises,
        });
        programId = editingProgram.id;

        // Delete old schedules
        const oldSchedules = editingProgram.schedules || [];
        for (const schedule of oldSchedules) {
          await api.deleteWorkoutSchedule(schedule.id);
        }

        Alert.alert('Suksess', 'Program oppdatert');
      } else {
        const response = await api.createWorkoutProgram({
          name: programName,
          description: programDescription,
          exercises: programExercises,
        });
        programId = response.data.id;
        Alert.alert('Suksess', 'Program opprettet');
      }

      // Create new schedules for selected days
      for (const dayOfWeek of selectedDays) {
        await api.createWorkoutSchedule({
          programId,
          dayOfWeek,
        });
      }

      setShowNewProgram(false);
      setSelectedDays([]);
      setProgramName('');
      setProgramDescription('');
      setProgramExercises([]);
      setEditingProgram(null);
      loadPrograms();
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke lagre program');
    } finally {
      setLoading(false);
    }
  };

  // Progress Calculation
  const calculateExerciseProgress = (exerciseId: string, currentSession: WorkoutSession) => {
    // Find previous sessions with the same exercise
    const previousSessions = sessions
      .filter(s => s.id !== currentSession.id && s.completedAt)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const currentExerciseLog = currentSession.exerciseLogs?.find(
      log => log.customExerciseId === exerciseId || log.exerciseId === exerciseId
    );

    if (!currentExerciseLog || !currentExerciseLog.setLogs?.length) {
      return null;
    }

    // Find the previous session with the same exercise
    for (const prevSession of previousSessions) {
      const prevExerciseLog = prevSession.exerciseLogs?.find(
        log => log.customExerciseId === exerciseId || log.exerciseId === exerciseId
      );

      if (prevExerciseLog && prevExerciseLog.setLogs?.length) {
        // Calculate total volume (weight * reps) for comparison
        const currentVolume = currentExerciseLog.setLogs.reduce((sum: number, set: any) =>
          sum + (set.weight || 0) * (set.reps || 0), 0
        );
        const prevVolume = prevExerciseLog.setLogs.reduce((sum: number, set: any) =>
          sum + (set.weight || 0) * (set.reps || 0), 0
        );

        // Calculate max weight
        const currentMaxWeight = Math.max(...currentExerciseLog.setLogs.map((set: any) => set.weight || 0));
        const prevMaxWeight = Math.max(...prevExerciseLog.setLogs.map((set: any) => set.weight || 0));

        // Calculate total reps
        const currentTotalReps = currentExerciseLog.setLogs.reduce((sum: number, set: any) =>
          sum + (set.reps || 0), 0
        );
        const prevTotalReps = prevExerciseLog.setLogs.reduce((sum: number, set: any) =>
          sum + (set.reps || 0), 0
        );

        const volumeChange = prevVolume > 0 ? ((currentVolume - prevVolume) / prevVolume) * 100 : 0;
        const weightChange = prevMaxWeight > 0 ? ((currentMaxWeight - prevMaxWeight) / prevMaxWeight) * 100 : 0;
        const repsChange = prevTotalReps > 0 ? ((currentTotalReps - prevTotalReps) / prevTotalReps) * 100 : 0;

        return {
          volumeChange,
          weightChange,
          repsChange,
          currentVolume,
          prevVolume,
          currentMaxWeight,
          prevMaxWeight,
          currentTotalReps,
          prevTotalReps,
          improved: volumeChange > 0 || (volumeChange === 0 && (weightChange > 0 || repsChange > 0)),
        };
      }
    }

    return null;
  };

  const getSessionProgress = (session: WorkoutSession) => {
    if (!session.exerciseLogs?.length) {
      return { improved: 0, regressed: 0, maintained: 0 };
    }

    let improved = 0;
    let regressed = 0;
    let maintained = 0;

    session.exerciseLogs.forEach(log => {
      const progress = calculateExerciseProgress(
        log.customExerciseId || log.exerciseId,
        session
      );

      if (progress) {
        if (progress.volumeChange > 5) {
          improved++;
        } else if (progress.volumeChange < -5) {
          regressed++;
        } else {
          maintained++;
        }
      }
    });

    return { improved, regressed, maintained };
  };

  // Render Functions
  const renderHomeTab = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroGreeting}>Hei! Klar for trening?</Text>
        <Text style={styles.heroSubtext}>La oss gjøre deg sterkere i dag 💪</Text>

        <TouchableOpacity
          style={styles.quickStartButton}
          onPress={startQuickWorkout}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={20} color="#FFF" />
          <Text style={styles.quickStartText}>Start Rask Økt</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="flame" size={28} color="#EF4444" />
          </View>
          <Text style={styles.statValue}>{workoutStreak}</Text>
          <Text style={styles.statLabel}>Dagers streak</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="barbell" size={28} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Totale økter</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="trophy" size={28} color="#8B5CF6" />
          </View>
          <Text style={styles.statValue}>{programs.length}</Text>
          <Text style={styles.statLabel}>Programmer</Text>
        </View>
      </View>

      {/* Quick Start Programs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mine Programmer</Text>
          <TouchableOpacity onPress={() => setActiveTab('programs')}>
            <Text style={styles.seeAllText}>Se alle →</Text>
          </TouchableOpacity>
        </View>

        {programs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Ingen programmer ennå</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setActiveTab('programs')}
            >
              <Text style={styles.emptyButtonText}>Opprett program</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.programsScroll}
          >
            {programs.slice(0, 5).map(program => (
              <TouchableOpacity
                key={program.id}
                style={styles.programCardHorizontal}
                onPress={() => startProgramWorkout(program)}
                activeOpacity={0.9}
              >
                <View style={styles.programCardIconCircle}>
                  <Ionicons name="fitness" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.programCardTitleNew}>{program.name}</Text>
                {program.description && (
                  <Text style={styles.programCardDescriptionNew} numberOfLines={2}>
                    {program.description}
                  </Text>
                )}
                <View style={styles.programCardInfo}>
                  <View style={styles.programInfoItem}>
                    <Ionicons name="barbell-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.programInfoText}>
                      {program.exercises?.length || 0} øvelser
                    </Text>
                  </View>
                  <View style={styles.programInfoItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.programInfoText}>
                      {program._count?.sessions || 0} økter
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.programStartButton}>
                  <Text style={styles.programStartButtonText}>Start</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recent Workouts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Siste Økter</Text>
          <TouchableOpacity onPress={() => setActiveTab('history')}>
            <Text style={styles.seeAllText}>Se alle →</Text>
          </TouchableOpacity>
        </View>

        {recentWorkouts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Ingen økter loggført ennå</Text>
          </View>
        ) : (
          recentWorkouts.map(session => {
            const progress = getSessionProgress(session);
            const exerciseCount = session.exerciseLogs?.length || 0;
            const totalSets = session.exerciseLogs?.reduce(
              (sum, log) => sum + (log.setLogs?.length || 0),
              0
            ) || 0;

            return (
              <TouchableOpacity
                key={session.id}
                style={styles.recentWorkoutCard}
                onPress={() => {
                  setSelectedSession(session);
                  setShowSessionDetail(true);
                }}
              >
                <View style={[
                  styles.recentWorkoutIcon,
                  { backgroundColor: session.completedAt ? '#D1FAE5' : '#FEF3C7' }
                ]}>
                  <Ionicons
                    name={session.completedAt ? 'checkmark-circle' : 'time'}
                    size={28}
                    color={session.completedAt ? '#10B981' : '#F59E0B'}
                  />
                </View>
                <View style={styles.recentWorkoutInfo}>
                  <Text style={styles.recentWorkoutName}>
                    {session.program?.name || 'Rask økt'}
                  </Text>
                  <Text style={styles.recentWorkoutDate}>
                    {new Date(session.startedAt).toLocaleDateString('nb-NO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </Text>
                  <View style={styles.sessionMetrics}>
                    <Text style={styles.sessionMetricText}>
                      {exerciseCount} øvelser • {totalSets} sett
                    </Text>
                    {session.duration && (
                      <Text style={styles.sessionMetricText}>
                        {' • '}{Math.floor(session.duration / 60)} min
                      </Text>
                    )}
                  </View>
                  {session.completedAt && (progress.improved > 0 || progress.regressed > 0) && (
                    <View style={styles.progressIndicators}>
                      {progress.improved > 0 && (
                        <View style={styles.progressBadge}>
                          <Ionicons name="trending-up" size={14} color={COLORS.success} />
                          <Text style={styles.progressBadgeTextGreen}>
                            +{progress.improved} forbedret
                          </Text>
                        </View>
                      )}
                      {progress.regressed > 0 && (
                        <View style={styles.progressBadge}>
                          <Ionicons name="trending-down" size={14} color={COLORS.danger} />
                          <Text style={styles.progressBadgeTextRed}>
                            -{progress.regressed} svakere
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderWorkoutTab = () => {
    if (!workoutStartTime) {
      return (
        <View style={styles.emptyWorkout}>
          <Ionicons name="barbell-outline" size={100} color={COLORS.textLight} />
          <Text style={styles.emptyWorkoutText}>Ingen aktiv økt</Text>
          <Text style={styles.emptyWorkoutSubtext}>
            Start en økt fra forsiden for å begynne
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Workout Header */}
        <View style={styles.workoutHeader}>
          <View style={styles.workoutHeaderTop}>
            <TouchableOpacity onPress={cancelWorkout} style={styles.workoutHeaderButton}>
              <Ionicons name="close" size={28} color={COLORS.danger} />
            </TouchableOpacity>
            <View style={styles.workoutHeaderCenter}>
              <Text style={styles.workoutHeaderTitle}>
                {currentProgram?.name || 'Rask Økt'}
              </Text>
              <Text style={styles.workoutHeaderDuration}>
                {formatDuration(workoutDuration)}
              </Text>
            </View>
            <TouchableOpacity onPress={finishWorkout} style={styles.workoutHeaderButton}>
              <Ionicons name="checkmark" size={28} color={COLORS.success} />
            </TouchableOpacity>
          </View>

          {/* Rest Timer */}
          {restTimerActive && (
            <View style={styles.restTimerContainer}>
              <Ionicons name="timer-outline" size={20} color="#FFF" />
              <Text style={styles.restTimerText}>Hvile: {formatDuration(restTimer)}</Text>
              <TouchableOpacity onPress={() => setRestTimerActive(false)}>
                <Ionicons name="close-circle-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Exercises List */}
        <ScrollView
          style={styles.workoutContent}
          contentContainerStyle={styles.workoutContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {activeWorkout.map((exercise, exerciseIdx) => (
            <View key={exercise.id} style={styles.activeExerciseCard}>
              <View style={styles.activeExerciseHeader}>
                <Text style={styles.activeExerciseName}>{exercise.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const updated = activeWorkout.filter((_, i) => i !== exerciseIdx);
                    setActiveWorkout(updated);
                  }}
                >
                  <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              {/* Sets Table Header */}
              <View style={styles.setsTableHeader}>
                <Text style={[styles.setsTableHeaderText, { flex: 0.8 }]}>Sett</Text>
                <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>Forrige</Text>
                {exercise.type === 'CARDIO' ? (
                  <>
                    <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>Min</Text>
                    <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>Km</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>Vekt</Text>
                    <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>Reps</Text>
                  </>
                )}
                <View style={{ flex: 1.1 }} />
              </View>

              {/* Sets Rows */}
              {exercise.sets.map((set, setIdx) => (
                <View
                  key={setIdx}
                  style={[
                    styles.setRow,
                    set.completed && styles.setRowCompleted,
                  ]}
                >
                  <Text style={[styles.setNumber, { flex: 0.8 }]}>{set.setNumber}</Text>

                  <Text style={[styles.previousValue, { flex: 1 }]}>
                    {set.previous?.weight
                      ? `${set.previous.weight} × ${set.previous.reps}`
                      : '-'}
                  </Text>

                  {exercise.type === 'CARDIO' ? (
                    <>
                      <TextInput
                        style={[styles.setInput, { flex: 1 }]}
                        placeholder="-"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="number-pad"
                        value={set.duration?.toString() || ''}
                        onChangeText={(val) => updateSet(exerciseIdx, setIdx, 'duration', parseInt(val) || undefined)}
                      />
                      <TextInput
                        style={[styles.setInput, { flex: 1 }]}
                        placeholder="-"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="decimal-pad"
                        value={set.distance?.toString() || ''}
                        onChangeText={(val) => updateSet(exerciseIdx, setIdx, 'distance', parseFloat(val) || undefined)}
                      />
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={[
                          styles.setInput,
                          { flex: 1 },
                          set.weight && !set.completed && styles.setInputPrefilled
                        ]}
                        placeholder="-"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="decimal-pad"
                        value={set.weight?.toString() || ''}
                        onChangeText={(val) => updateSet(exerciseIdx, setIdx, 'weight', parseFloat(val) || undefined)}
                      />
                      <TextInput
                        style={[
                          styles.setInput,
                          { flex: 1 },
                          set.reps && !set.completed && styles.setInputPrefilled
                        ]}
                        placeholder="-"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="number-pad"
                        value={set.reps?.toString() || ''}
                        onChangeText={(val) => updateSet(exerciseIdx, setIdx, 'reps', parseInt(val) || undefined)}
                      />
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.setCheckbox, { flex: 0.6 }]}
                    onPress={() => completeSet(exerciseIdx, setIdx)}
                  >
                    {set.completed ? (
                      <View style={styles.setCheckboxChecked}>
                        <Ionicons name="checkmark" size={18} color="#FFF" />
                      </View>
                    ) : (
                      <View style={styles.setCheckboxUnchecked} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.removeSetButton, { flex: 0.5 }]}
                    onPress={() => removeSetFromExercise(exerciseIdx, setIdx)}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add Set Button */}
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => addSetToExercise(exerciseIdx)}
              >
                <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
                <Text style={styles.addSetButtonText}>Legg til sett</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Exercise Button */}
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={() => setShowAddExercise(true)}
          >
            <Ionicons name="add" size={24} color={COLORS.primary} />
            <Text style={styles.addExerciseText}>Legg til øvelse</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  const renderProgramsTab = () => (
    <View style={styles.container}>
      {/* Action Buttons */}
      <View style={styles.programActionsRow}>
        <TouchableOpacity
          style={[styles.createProgramButtonNew, { flex: 1, marginRight: 8 }]}
          onPress={() => {
            setEditingProgram(null);
            setProgramName('');
            setProgramDescription('');
            setProgramExercises([]);
            setSelectedDays([]);
            setShowNewProgram(true);
          }}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.createProgramText}>Opprett Program</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.templateButtonNew, { flex: 1, marginLeft: 8 }]}
          onPress={() => {
            loadTemplates();
            setShowTemplates(true);
          }}
        >
          <Ionicons name="book-outline" size={20} color={COLORS.primary} />
          <Text style={styles.templateButtonText}>Mal</Text>
        </TouchableOpacity>
      </View>

      {/* Programs List */}
      <FlatList
        data={programs}
        renderItem={({ item }) => (
          <View style={styles.programCard}>
            <TouchableOpacity
              style={styles.programCardBody}
              onPress={() => {
                setEditingProgram(item);
                setProgramName(item.name);
                setProgramDescription(item.description || '');
                setProgramExercises(item.exercises || []);
                setSelectedDays(item.schedules?.map(s => s.dayOfWeek) || []);
                setShowNewProgram(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.programCardTop}>
                <View style={styles.programCardIconNew}>
                  <Ionicons name="barbell-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.programCardActions}>
                  <TouchableOpacity
                    style={styles.programStartButtonInline}
                    onPress={() => startProgramWorkout(item)}
                  >
                    <Text style={styles.programStartButtonInlineText}>Start</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.programActionButton}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.programCardName}>{item.name}</Text>
              {item.description && (
                <Text style={styles.programCardDesc}>{item.description}</Text>
              )}
              <View style={styles.programCardFooter}>
                <View style={styles.programCardStat}>
                  <Ionicons name="fitness-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.programCardStatText}>
                    {item.exercises?.length || 0} øvelser
                  </Text>
                </View>
                <View style={styles.programCardStat}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.programCardStatText}>
                    {item._count?.sessions || 0} økter
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.programsList}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={80} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Ingen programmer ennå</Text>
            <Text style={styles.emptySubtext}>Opprett ditt første treningsprogram</Text>
          </View>
        }
      />
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        renderItem={({ item }) => {
          const date = new Date(item.startedAt);
          const isCompleted = !!item.completedAt;

          return (
            <TouchableOpacity
              style={styles.historyCard}
              onPress={() => {
                setSelectedSession(item);
                setShowSessionDetail(true);
              }}
            >
              <View
                style={[
                  styles.historyCardIndicator,
                  { backgroundColor: isCompleted ? COLORS.success : COLORS.warning },
                ]}
              />
              <View style={styles.historyCardContent}>
                <View style={styles.historyCardHeader}>
                  <Text style={styles.historyCardTitle}>
                    {item.program?.name || 'Rask økt'}
                  </Text>
                  <View
                    style={[
                      styles.historyCardBadge,
                      { backgroundColor: isCompleted ? '#D1FAE5' : '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyCardBadgeText,
                        { color: isCompleted ? COLORS.success : COLORS.warning },
                      ]}
                    >
                      {isCompleted ? 'Fullført' : 'Planlagt'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyCardDate}>
                  {date.toLocaleDateString('nb-NO', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
                {item.duration && (
                  <View style={styles.historyCardMeta}>
                    <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.historyCardMetaText}>
                      {formatDuration(item.duration)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.historyList}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={80} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Ingen økter loggført</Text>
            <Text style={styles.emptySubtext}>Start din første treningsøkt i dag</Text>
          </View>
        }
      />
    </View>
  );

  const renderStatsTab = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.statsTab}>
      <Text style={styles.sectionTitle}>Statistikk og Fremgang</Text>

      {/* Weekly Progress */}
      <View style={styles.statsCard}>
        <Text style={styles.statsCardTitle}>Ukentlig Fremgang</Text>
        <View style={styles.weeklyBars}>
          {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((day, idx) => (
            <View key={idx} style={styles.weeklyBarContainer}>
              <View style={styles.weeklyBar}>
                <View
                  style={[
                    styles.weeklyBarFill,
                    { height: `${Math.random() * 100}%`, backgroundColor: COLORS.primary }
                  ]}
                />
              </View>
              <Text style={styles.weeklyBarLabel}>{day}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Personal Records */}
      <View style={styles.statsCard}>
        <Text style={styles.statsCardTitle}>Personlige Rekorder</Text>
        <View style={styles.prList}>
          <View style={styles.prItem}>
            <Ionicons name="trophy" size={24} color={COLORS.warning} />
            <View style={styles.prInfo}>
              <Text style={styles.prExercise}>Barbell Bench Press</Text>
              <Text style={styles.prValue}>120 kg × 5 reps</Text>
            </View>
          </View>
          <View style={styles.prItem}>
            <Ionicons name="trophy" size={24} color={COLORS.warning} />
            <View style={styles.prInfo}>
              <Text style={styles.prExercise}>Barbell Squat</Text>
              <Text style={styles.prValue}>150 kg × 3 reps</Text>
            </View>
          </View>
          <View style={styles.prItem}>
            <Ionicons name="trophy" size={24} color={COLORS.warning} />
            <View style={styles.prInfo}>
              <Text style={styles.prExercise}>Deadlift</Text>
              <Text style={styles.prValue}>180 kg × 1 rep</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Volume Over Time */}
      <View style={styles.statsCard}>
        <Text style={styles.statsCardTitle}>Volum Siste 30 Dager</Text>
        <View style={styles.volumeChart}>
          <Text style={styles.volumeValue}>24,500 kg</Text>
          <Text style={styles.volumeLabel}>Total volum</Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderPredictionsTab = () => {
    console.log('[Predictions] Rendering predictions tab');
    console.log('[Predictions] State:', {
      loading: predictionsLoading,
      hasEnoughData,
      predictions: predictions?.length || 0,
      optimalTime: optimalTimeData?.length || 0,
      volumeIntensity: !!volumeIntensityData,
      recommendations: recommendations?.length || 0
    });

    // Loading state
    if (predictionsLoading) {
      console.log('[Predictions] Rendering loading state');
      return (
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Analyserer treningsdata...</Text>
          </View>
        </View>
      );
    }

    // Empty state - not enough data
    if (!hasEnoughData) {
      console.log('[Predictions] Rendering not enough data state');
      return (
        <View style={styles.container}>
          <View style={styles.emptyPredictions}>
            <Ionicons name="analytics-outline" size={80} color={COLORS.textLight} />
            <Text style={styles.emptyPredictionsTitle}>Ikke nok treningsdata ennå</Text>
            <Text style={styles.emptyPredictionsText}>
              Logg minst 5 økter for å se prediksjoner og innsikt
            </Text>
            <Text style={styles.emptyPredictionsSubtext}>
              Våre ML-algoritmer trenger litt data for å kunne gi deg nøyaktige prediksjoner og anbefalinger.
            </Text>
          </View>
        </View>
      );
    }

    // Check if we have ANY data to display
    const hasAnyData = (predictions && predictions.length > 0) ||
                       (optimalTimeData && optimalTimeData.length > 0) ||
                       (volumeIntensityData) ||
                       (recommendations && recommendations.length > 0);

    console.log('[Predictions] Has any data:', hasAnyData);

    // Empty state - data loaded but no predictions available
    if (!hasAnyData) {
      console.log('[Predictions] Rendering no predictions available state');
      return (
        <View style={styles.container}>
          <View style={styles.emptyPredictions}>
            <Ionicons name="analytics-outline" size={80} color={COLORS.textLight} />
            <Text style={styles.emptyPredictionsTitle}>Prediksjoner ikke tilgjengelige</Text>
            <Text style={styles.emptyPredictionsText}>
              Vi kunne ikke generere prediksjoner basert på dine treningsdata.
            </Text>
            <Text style={styles.emptyPredictionsSubtext}>
              Dette kan skyldes manglende data med vektlogging eller treningstider.
              Fortsett å logge økter med detaljert informasjon for å få ML-drevne innsikter.
            </Text>
            <TouchableOpacity
              style={[styles.createProgramButton, { marginTop: 20 }]}
              onPress={() => {
                console.log('[Predictions] Retry button pressed');
                loadPredictionsData();
              }}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.createProgramGradient}
              >
                <Ionicons name="refresh" size={24} color="#FFF" />
                <Text style={styles.createProgramText}>Prøv igjen</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    console.log('[Predictions] Rendering predictions content');

    const getConfidenceColor = (confidence: number) => {
      if (confidence >= 0.8) return COLORS.success;
      if (confidence >= 0.6) return COLORS.warning;
      return COLORS.danger;
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return COLORS.danger;
        case 'medium': return COLORS.warning;
        case 'low': return COLORS.success;
        default: return COLORS.textSecondary;
      }
    };

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.predictionsTab}>
        <Text style={styles.sectionTitle}>ML-Drevne Innsikter</Text>

        {/* A. Progression Predictions Card */}
        {predictions && predictions.length > 0 && (() => {
          console.log('[Predictions] Rendering progression predictions card with', predictions.length, 'predictions');
          return true;
        })() && (
          <View style={styles.predictionCardNew}>
            <View style={styles.predictionCardHeaderNew}>
              <View style={styles.predictionIconCircle}>
                <Ionicons name="trending-up" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.predictionCardTitleNew}>Progresjonsprediksjon</Text>
                <Text style={styles.predictionCardSubtitleNew}>
                  Basert på dine siste treningsøkter
                </Text>
              </View>
            </View>

            {predictions.slice(0, 5).map((pred, index) => (
              <View key={index} style={styles.predictionItem}>
                <View style={styles.predictionItemHeader}>
                  <Text style={styles.predictionExerciseName}>{pred.exerciseName}</Text>
                  <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(pred.confidence) }]}>
                    <Text style={styles.confidenceBadgeText}>{Math.round(pred.confidence * 100)}%</Text>
                  </View>
                </View>

                <View style={styles.predictionStats}>
                  <View style={styles.predictionStatItem}>
                    <Text style={styles.predictionStatLabel}>Nåværende max</Text>
                    <Text style={styles.predictionStatValue}>{pred.currentMax} kg</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
                  <View style={styles.predictionStatItem}>
                    <Text style={styles.predictionStatLabel}>Om 4 uker</Text>
                    <Text style={styles.predictionStatValue}>{pred.predictedMax} kg</Text>
                  </View>
                </View>

                <View style={styles.progressionInfo}>
                  <Text style={styles.progressionRate}>
                    +{pred.progressionRate} kg/uke
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${(pred.currentMax / pred.predictedMax) * 100}%`,
                          backgroundColor: getConfidenceColor(pred.confidence)
                        }
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* B. Optimal Training Time Card */}
        {optimalTimeData && optimalTimeData.length > 0 && (() => {
          console.log('[Predictions] Rendering optimal time card with', optimalTimeData.length, 'time slots');
          return true;
        })() && (
          <View style={styles.statsCard}>
            <View style={styles.cardHeaderWithIcon}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
              <Text style={styles.statsCardTitle}>Beste treningstid for deg</Text>
            </View>

            <View style={styles.optimalTimeChart}>
              {optimalTimeData.map((timeData, index) => {
                const maxScore = Math.max(...optimalTimeData.map(d => d.performanceScore));
                const heightPercentage = (timeData.performanceScore / maxScore) * 100;
                const isBest = timeData.performanceScore === maxScore;

                return (
                  <View key={index} style={styles.timeBarContainer}>
                    <View style={styles.timeBar}>
                      <View
                        style={[
                          styles.timeBarFill,
                          {
                            height: `${heightPercentage}%`,
                            backgroundColor: isBest ? COLORS.success : COLORS.primary
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.timeLabel, isBest && styles.timeLabelBest]}>
                      {String(timeData.hour).padStart(2, '0')}:00
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.optimalTimeInsight}>
              <Ionicons name="bulb" size={20} color={COLORS.warning} />
              <Text style={styles.optimalTimeInsightText}>
                Du yter best kl {optimalTimeData.reduce((best, current) =>
                  current.performanceScore > best.performanceScore ? current : best
                ).hour}:00 - {optimalTimeData.reduce((best, current) =>
                  current.performanceScore > best.performanceScore ? current : best
                ).hour + 2}:00
              </Text>
            </View>
          </View>
        )}

        {/* C. Volume & Intensity Analysis */}
        {volumeIntensityData && (() => {
          console.log('[Predictions] Rendering volume intensity card');
          return true;
        })() && (
          <View style={styles.statsCard}>
            <View style={styles.cardHeaderWithIcon}>
              <Ionicons name="stats-chart-outline" size={24} color={COLORS.primary} />
              <Text style={styles.statsCardTitle}>Volum & Intensitet</Text>
            </View>

            {/* Weekly Volume Trend */}
            {volumeIntensityData.weeklyVolume && volumeIntensityData.weeklyVolume.length > 0 && (
              <View style={styles.volumeTrendContainer}>
                <Text style={styles.volumeTrendTitle}>Ukentlig volum</Text>
                <View style={styles.volumeBars}>
                  {volumeIntensityData.weeklyVolume.map((weekData, index) => {
                    const maxVolume = Math.max(...volumeIntensityData.weeklyVolume.map(w => w.volume));
                    const heightPercentage = (weekData.volume / maxVolume) * 100;

                    return (
                      <View key={index} style={styles.volumeBarContainer}>
                        <View style={styles.volumeBar}>
                          <View
                            style={[
                              styles.volumeBarFill,
                              { height: `${heightPercentage}%`, backgroundColor: COLORS.primaryLight }
                            ]}
                          />
                        </View>
                        <Text style={styles.volumeBarLabel}>{weekData.week}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Intensity Distribution */}
            {volumeIntensityData.intensityDistribution && (
              <View style={styles.intensityDistribution}>
                <Text style={styles.volumeTrendTitle}>Intensitetsfordeling</Text>
                <View style={styles.intensityBars}>
                  <View style={styles.intensityBarItem}>
                    <View style={[styles.intensityBar, { width: `${volumeIntensityData.intensityDistribution.light}%`, backgroundColor: COLORS.success }]} />
                    <Text style={styles.intensityLabel}>Lett ({volumeIntensityData.intensityDistribution.light}%)</Text>
                  </View>
                  <View style={styles.intensityBarItem}>
                    <View style={[styles.intensityBar, { width: `${volumeIntensityData.intensityDistribution.medium}%`, backgroundColor: COLORS.warning }]} />
                    <Text style={styles.intensityLabel}>Moderat ({volumeIntensityData.intensityDistribution.medium}%)</Text>
                  </View>
                  <View style={styles.intensityBarItem}>
                    <View style={[styles.intensityBar, { width: `${volumeIntensityData.intensityDistribution.heavy}%`, backgroundColor: COLORS.danger }]} />
                    <Text style={styles.intensityLabel}>Tung ({volumeIntensityData.intensityDistribution.heavy}%)</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Recovery Recommendation */}
            {volumeIntensityData.recoveryScore !== undefined && (
              <View style={styles.recoveryRecommendation}>
                <Ionicons
                  name={volumeIntensityData.recoveryScore < 50 ? "alert-circle" : "checkmark-circle"}
                  size={20}
                  color={volumeIntensityData.recoveryScore < 50 ? COLORS.danger : COLORS.success}
                />
                <Text style={styles.recoveryText}>
                  {volumeIntensityData.recoveryScore < 50
                    ? "Vurder mer hvile - restitusjonscore er lav"
                    : "God restitusjon - fortsett som normalt"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* D. Smart Recommendations */}
        {recommendations && recommendations.length > 0 && (() => {
          console.log('[Predictions] Rendering recommendations card with', recommendations.length, 'recommendations');
          return true;
        })() && (
          <View style={styles.statsCard}>
            <View style={styles.cardHeaderWithIcon}>
              <Ionicons name="sparkles" size={24} color={COLORS.primary} />
              <Text style={styles.statsCardTitle}>Smarte anbefalinger</Text>
            </View>

            {recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={[styles.recommendationIcon, { backgroundColor: `${getPriorityColor(rec.priority)}20` }]}>
                  <Ionicons name={rec.icon as any} size={24} color={getPriorityColor(rec.priority)} />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  <Text style={styles.recommendationMessage}>{rec.message}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>Trening</Text>
        <View style={styles.appHeaderActions} />

      </View>

      {/* Tab Content */}
      {activeTab === 'home' && renderHomeTab()}
      {activeTab === 'workout' && renderWorkoutTab()}
      {activeTab === 'programs' && renderProgramsTab()}
      {activeTab === 'history' && renderHistoryTab()}
      {activeTab === 'stats' && renderStatsTab()}
      {activeTab === 'predictions' && renderPredictionsTab()}

      {/* Bottom Navigation - Professional Design */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab('home')}
        >
          <View style={[
            styles.bottomNavIconContainer,
            activeTab === 'home' && styles.bottomNavIconContainerActive
          ]}>
            <Ionicons
              name={activeTab === 'home' ? 'home' : 'home-outline'}
              size={22}
              color={activeTab === 'home' ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.bottomNavText,
              activeTab === 'home' && styles.bottomNavTextActive,
            ]}
          >
            Hjem
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab('programs')}
        >
          <View style={[
            styles.bottomNavIconContainer,
            activeTab === 'programs' && styles.bottomNavIconContainerActive
          ]}>
            <Ionicons
              name={activeTab === 'programs' ? 'document-text' : 'document-text-outline'}
              size={22}
              color={activeTab === 'programs' ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.bottomNavText,
              activeTab === 'programs' && styles.bottomNavTextActive,
            ]}
          >
            Bibliotek
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab('history')}
        >
          <View style={[
            styles.bottomNavIconContainer,
            activeTab === 'history' && styles.bottomNavIconContainerActive
          ]}>
            <Ionicons
              name={activeTab === 'history' ? 'calendar' : 'calendar-outline'}
              size={22}
              color={activeTab === 'history' ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.bottomNavText,
              activeTab === 'history' && styles.bottomNavTextActive,
            ]}
          >
            Historikk
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab('stats')}
        >
          <View style={[
            styles.bottomNavIconContainer,
            activeTab === 'stats' && styles.bottomNavIconContainerActive
          ]}>
            <Ionicons
              name={activeTab === 'stats' ? 'bar-chart' : 'bar-chart-outline'}
              size={22}
              color={activeTab === 'stats' ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.bottomNavText,
              activeTab === 'stats' && styles.bottomNavTextActive,
            ]}
          >
            Statistikk
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setActiveTab('predictions')}
        >
          <View style={[
            styles.bottomNavIconContainer,
            activeTab === 'predictions' && styles.bottomNavIconContainerActive
          ]}>
            <Ionicons
              name={activeTab === 'predictions' ? 'analytics' : 'analytics-outline'}
              size={22}
              color={activeTab === 'predictions' ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.bottomNavText,
              activeTab === 'predictions' && styles.bottomNavTextActive,
            ]}
          >
            Prediksjon
          </Text>
        </TouchableOpacity>
      </View>

      {/* Exercise Selection Modal (for Active Workout only) */}
      <Modal visible={showAddExercise} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddExercise(false)}>
              <Ionicons name="close" size={30} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Velg Øvelse</Text>
            <TouchableOpacity onPress={() => setShowCustomExercise(true)}>
              <Ionicons name="add-circle-outline" size={30} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={22} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Søk etter øvelser..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Muscle Group Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
          >
            {MUSCLE_GROUPS.map(group => (
              <TouchableOpacity
                key={group.key}
                style={[
                  styles.muscleFilterChip,
                  selectedMuscle === group.key && {
                    backgroundColor: group.color,
                    borderColor: group.color,
                  },
                ]}
                onPress={() => setSelectedMuscle(group.key)}
              >
                <Ionicons
                  name={group.icon as any}
                  size={20}
                  color={selectedMuscle === group.key ? '#FFF' : group.color}
                />
                <Text
                  style={[
                    styles.muscleFilterText,
                    selectedMuscle === group.key && styles.muscleFilterTextActive,
                  ]}
                >
                  {group.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercises List with Images */}
          <FlatList
            data={filteredExercises}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exerciseCard}
                onPress={() => {
                  if (showExerciseSelector) {
                    // Add to program with individual sets
                    setProgramExercises([
                      ...programExercises,
                      {
                        exerciseId: item.id,
                        name: item.name,
                        type: item.type,
                        sets: [
                          { setNumber: 1, reps: 10, weight: undefined },
                          { setNumber: 2, reps: 10, weight: undefined },
                          { setNumber: 3, reps: 10, weight: undefined },
                        ],
                        weightUnit: 'kg',
                      },
                    ]);
                    setShowExerciseSelector(false);
                    // Don't close Program Modal, just close Exercise Selector
                  } else {
                    // Add to active workout
                    addExerciseToActiveWorkout(item);
                  }
                }}
              >
                <Image
                  source={{ uri: getExerciseImage(item.name) }}
                  style={styles.exerciseImage}
                  resizeMode="cover"
                />
                <View style={styles.exerciseCardContent}>
                  <Text style={styles.exerciseCardName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.exerciseCardDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.exerciseCardMuscles}>
                    {item.primaryMuscles?.slice(0, 2).map((muscle: string, idx: number) => (
                      <View key={idx} style={styles.muscleBadge}>
                        <Text style={styles.muscleBadgeText}>{muscle}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.exercisesList}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Ionicons name="barbell-outline" size={80} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Ingen øvelser funnet</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Exercise Detail Modal */}
      <Modal
        visible={showExerciseDetail}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowExerciseDetail(false)}>
              <Ionicons name="close" size={30} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Øvelsesdetaljer</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedExercise && (
              <>
                <Image
                  source={{ uri: getExerciseImage(selectedExercise.name) }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />
                <Text style={styles.detailName}>{selectedExercise.name}</Text>
                <Text style={styles.detailDescription}>
                  {selectedExercise.description || 'Ingen beskrivelse tilgjengelig'}
                </Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Primære muskler</Text>
                  <View style={styles.detailTags}>
                    {selectedExercise.primaryMuscles?.map((muscle: string, idx: number) => (
                      <View key={idx} style={styles.detailTag}>
                        <Text style={styles.detailTagText}>{muscle}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {selectedExercise.secondaryMuscles?.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Sekundære muskler</Text>
                    <View style={styles.detailTags}>
                      {selectedExercise.secondaryMuscles.map((muscle: string, idx: number) => (
                        <View key={idx} style={styles.detailTag}>
                          <Text style={styles.detailTagText}>{muscle}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {selectedExercise.instructions && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Instruksjoner</Text>
                    <Text style={styles.detailText}>{selectedExercise.instructions}</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Session Detail Modal */}
      <Modal
        visible={showSessionDetail}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSessionDetail(false)}>
              <Ionicons name="close" size={30} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Øktdetaljer</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedSession && (
              <>
                <Text style={styles.detailName}>
                  {selectedSession.program?.name || 'Rask økt'}
                </Text>
                <Text style={styles.detailDescription}>
                  {new Date(selectedSession.startedAt).toLocaleDateString('nb-NO', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>

                {selectedSession.duration && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Varighet</Text>
                    <Text style={styles.detailText}>
                      {formatDuration(selectedSession.duration)}
                    </Text>
                  </View>
                )}

                {selectedSession.exerciseLogs && selectedSession.exerciseLogs.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Øvelser</Text>
                    {selectedSession.exerciseLogs.map((log: any, idx: number) => (
                      <View key={idx} style={styles.sessionExerciseItem}>
                        <Text style={styles.sessionExerciseName}>
                          {log.customExercise?.name || 'Øvelse'}
                        </Text>
                        <Text style={styles.sessionExerciseSets}>
                          {log.setLogs?.length || 0} sett
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Program Creation/Edit Modal */}
      <Modal
        visible={showNewProgram}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Show Exercise Selector or Program Form */}
          {showExerciseSelector ? (
            <>
              {/* Exercise Selection View */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowExerciseSelector(false)}>
                  <Ionicons name="arrow-back" size={30} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Velg Øvelse</Text>
                <TouchableOpacity onPress={() => setShowCustomExercise(true)}>
                  <Ionicons name="add-circle-outline" size={30} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={22} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Søk etter øvelser..."
                  placeholderTextColor={COLORS.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Muscle Group Filter */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
              >
                {MUSCLE_GROUPS.map(group => (
                  <TouchableOpacity
                    key={group.key}
                    style={[
                      styles.muscleFilterChip,
                      selectedMuscle === group.key && {
                        backgroundColor: group.color,
                        borderColor: group.color,
                      },
                    ]}
                    onPress={() => setSelectedMuscle(group.key)}
                  >
                    <Ionicons
                      name={group.icon as any}
                      size={20}
                      color={selectedMuscle === group.key ? '#FFF' : group.color}
                    />
                    <Text
                      style={[
                        styles.muscleFilterText,
                        selectedMuscle === group.key && styles.muscleFilterTextActive,
                      ]}
                    >
                      {group.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Exercises List */}
              <FlatList
                data={filteredExercises}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.exerciseCard}
                    onPress={() => {
                      // Add to program with individual sets
                      setProgramExercises([
                        ...programExercises,
                        {
                          exerciseId: item.id,
                          name: item.name,
                          type: item.type,
                          sets: [
                            { setNumber: 1, reps: 10, weight: undefined },
                            { setNumber: 2, reps: 10, weight: undefined },
                            { setNumber: 3, reps: 10, weight: undefined },
                          ],
                          weightUnit: 'kg',
                        },
                      ]);
                      setShowExerciseSelector(false);
                    }}
                  >
                    <Image
                      source={{ uri: getExerciseImage(item.name) }}
                      style={styles.exerciseImage}
                      resizeMode="cover"
                    />
                    <View style={styles.exerciseCardContent}>
                      <Text style={styles.exerciseCardName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.exerciseCardDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                      <View style={styles.exerciseCardMuscles}>
                        {item.primaryMuscles?.slice(0, 2).map((muscle: string, idx: number) => (
                          <View key={idx} style={styles.muscleBadge}>
                            <Text style={styles.muscleBadgeText}>{muscle}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.exercisesList}
                ListEmptyComponent={
                  <View style={styles.emptyCard}>
                    <Ionicons name="barbell-outline" size={80} color={COLORS.textLight} />
                    <Text style={styles.emptyText}>Ingen øvelser funnet</Text>
                  </View>
                }
              />
            </>
          ) : (
            <>
              {/* Program Form View */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowNewProgram(false)}>
                  <Ionicons name="close" size={30} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingProgram ? 'Rediger Program' : 'Nytt Program'}
                </Text>
                <TouchableOpacity onPress={saveProgram}>
                  <Text style={styles.saveButtonText}>Lagre</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
            {/* Program Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Programnavn *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="F.eks. Push Day, Leg Day..."
                placeholderTextColor={COLORS.textLight}
                value={programName}
                onChangeText={setProgramName}
              />
            </View>

            {/* Program Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Beskrivelse</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Skriv en kort beskrivelse..."
                placeholderTextColor={COLORS.textLight}
                value={programDescription}
                onChangeText={setProgramDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Schedule Section */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Schema</Text>
              <Text style={styles.formHint}>
                {selectedDays.length === 0
                  ? 'Når som helst (ingen dager valgt)'
                  : `${selectedDays.length} dag${selectedDays.length > 1 ? 'er' : ''} valgt`}
              </Text>
              <View style={styles.daySelector}>
                {WEEKDAYS.map(day => {
                  const isSelected = selectedDays.includes(day.key);
                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[
                        styles.dayChip,
                        isSelected && styles.dayChipSelected,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedDays(selectedDays.filter(d => d !== day.key));
                        } else {
                          setSelectedDays([...selectedDays, day.key]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          isSelected && styles.dayChipTextSelected,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selected Exercises */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Øvelser ({programExercises.length})
              </Text>

              {programExercises.map((ex, exerciseIdx) => (
                <View key={exerciseIdx} style={styles.programExerciseCard}>
                  <View style={styles.programExerciseHeader}>
                    <Text style={styles.programExerciseName}>{ex.name}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setProgramExercises(programExercises.filter((_, i) => i !== exerciseIdx));
                      }}
                    >
                      <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>

                  {/* Individual Sets */}
                  <View style={styles.programSetsContainer}>
                    {/* Sets Header */}
                    <View style={styles.programSetsHeader}>
                      <Text style={[styles.programSetsHeaderText, { flex: 0.8 }]}>Sett</Text>
                      <Text style={[styles.programSetsHeaderText, { flex: 1 }]}>Reps</Text>
                      <Text style={[styles.programSetsHeaderText, { flex: 1 }]}>Vekt (kg)</Text>
                      <View style={{ flex: 0.5 }} />
                    </View>

                    {/* Sets Rows */}
                    {ex.sets?.map((set: any, setIdx: number) => (
                      <View key={setIdx} style={styles.programSetRow}>
                        <Text style={[styles.programSetNumber, { flex: 0.8 }]}>
                          {set.setNumber}
                        </Text>
                        <TextInput
                          style={[styles.programSetInput, { flex: 1 }]}
                          placeholder="10"
                          placeholderTextColor={COLORS.textLight}
                          keyboardType="number-pad"
                          value={set.reps?.toString() || ''}
                          onChangeText={(val) => {
                            const updated = [...programExercises];
                            updated[exerciseIdx].sets[setIdx].reps = parseInt(val) || undefined;
                            setProgramExercises(updated);
                          }}
                        />
                        <TextInput
                          style={[styles.programSetInput, { flex: 1 }]}
                          placeholder="60"
                          placeholderTextColor={COLORS.textLight}
                          keyboardType="decimal-pad"
                          value={set.weight?.toString() || ''}
                          onChangeText={(val) => {
                            const updated = [...programExercises];
                            updated[exerciseIdx].sets[setIdx].weight = parseFloat(val) || undefined;
                            setProgramExercises(updated);
                          }}
                        />
                        <TouchableOpacity
                          style={{ flex: 0.5, alignItems: 'center' }}
                          onPress={() => {
                            const updated = [...programExercises];
                            updated[exerciseIdx].sets = updated[exerciseIdx].sets.filter(
                              (_: any, i: number) => i !== setIdx
                            );
                            // Re-number sets
                            updated[exerciseIdx].sets = updated[exerciseIdx].sets.map(
                              (s: any, i: number) => ({ ...s, setNumber: i + 1 })
                            );
                            setProgramExercises(updated);
                          }}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Add Set Button */}
                    <TouchableOpacity
                      style={styles.addProgramSetButton}
                      onPress={() => {
                        const updated = [...programExercises];
                        const lastSet = updated[exerciseIdx].sets[updated[exerciseIdx].sets.length - 1];
                        updated[exerciseIdx].sets.push({
                          setNumber: updated[exerciseIdx].sets.length + 1,
                          reps: lastSet?.reps || 10,
                          weight: lastSet?.weight || undefined,
                        });
                        setProgramExercises(updated);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.addProgramSetText}>Legg til sett</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Add Exercise Button */}
              <TouchableOpacity
                style={styles.addProgramExerciseButton}
                onPress={() => {
                  setShowExerciseSelector(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
                <Text style={styles.addProgramExerciseText}>Legg til øvelse</Text>
              </TouchableOpacity>
            </View>

                {/* Save as Template Button (if editing) */}
                {editingProgram && !(editingProgram as any).isTemplate && (
                  <TouchableOpacity
                    style={styles.saveTemplateButton}
                    onPress={() => {
                      Alert.alert(
                        'Lagre som mal',
                        'Vil du lagre dette programmet som en gjenbrukbar mal? Du kan bruke det senere når du oppretter nye programmer.',
                        [
                          { text: 'Avbryt', style: 'cancel' },
                          {
                            text: 'Ja, lagre som mal',
                            style: 'default',
                            onPress: async () => {
                              try {
                                setLoading(true);
                                await api.saveWorkoutProgramAsTemplate(editingProgram.id);
                                Alert.alert('Suksess', 'Program lagret som mal');
                                setShowNewProgram(false);
                                loadPrograms();
                              } catch (error) {
                                Alert.alert('Feil', 'Kunne ikke lagre program som mal');
                              } finally {
                                setLoading(false);
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="bookmark" size={24} color={COLORS.success} />
                    <Text style={styles.saveTemplateText}>Lagre som Mal</Text>
                  </TouchableOpacity>
                )}

                {/* Delete Program (if editing) */}
                {editingProgram && (
                  <TouchableOpacity
                    style={styles.deleteProgramButton}
                    onPress={() => {
                      Alert.alert(
                        'Slett program',
                        'Er du sikker på at du vil slette dette programmet?',
                        [
                          { text: 'Avbryt', style: 'cancel' },
                          {
                            text: 'Slett',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await api.deleteWorkoutProgram(editingProgram.id);
                                Alert.alert('Suksess', 'Program slettet');
                                setShowNewProgram(false);
                                loadPrograms();
                              } catch (error) {
                                Alert.alert('Feil', 'Kunne ikke slette program');
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={24} color={COLORS.danger} />
                    <Text style={styles.deleteProgramText}>Slett Program</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 100 }} />
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Custom Exercise Creation Modal */}
      <Modal
        visible={showCustomExercise}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCustomExercise(false)}>
              <Ionicons name="close" size={30} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ny Øvelse</Text>
            <TouchableOpacity
              onPress={async () => {
                if (!customExerciseName.trim()) {
                  Alert.alert('Feil', 'Vennligst skriv inn øvelsesnavn');
                  return;
                }

                try {
                  setLoading(true);
                  await api.createCustomExercise({
                    name: customExerciseName,
                    type: customExerciseType,
                  });
                  Alert.alert('Suksess', 'Øvelse opprettet');
                  setShowCustomExercise(false);
                  setCustomExerciseName('');
                  loadExercises();
                } catch (error) {
                  Alert.alert('Feil', 'Kunne ikke opprette øvelse');
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={styles.saveButtonText}>Lagre</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Exercise Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Øvelsesnavn *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="F.eks. Cable Flies, Goblet Squat..."
                placeholderTextColor={COLORS.textLight}
                value={customExerciseName}
                onChangeText={setCustomExerciseName}
              />
            </View>

            {/* Exercise Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.exerciseTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.exerciseTypeOption,
                    customExerciseType === 'STRENGTH' && styles.exerciseTypeOptionActive,
                  ]}
                  onPress={() => setCustomExerciseType('STRENGTH')}
                >
                  <Ionicons
                    name="barbell"
                    size={28}
                    color={customExerciseType === 'STRENGTH' ? '#FFF' : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.exerciseTypeText,
                      customExerciseType === 'STRENGTH' && styles.exerciseTypeTextActive,
                    ]}
                  >
                    Styrke
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.exerciseTypeOption,
                    customExerciseType === 'CARDIO' && styles.exerciseTypeOptionActive,
                  ]}
                  onPress={() => setCustomExerciseType('CARDIO')}
                >
                  <Ionicons
                    name="bicycle"
                    size={28}
                    color={customExerciseType === 'CARDIO' ? '#FFF' : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.exerciseTypeText,
                      customExerciseType === 'CARDIO' && styles.exerciseTypeTextActive,
                    ]}
                  >
                    Cardio
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Templates Modal */}
      <Modal
        visible={showTemplates}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTemplates(false)}>
              <Ionicons name="close" size={30} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Treningsprogram Maler</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.templatesSectionTitle}>
              Velg en mal og tilpass den etter dine behov
            </Text>

            {templates.map((template, index) => (
              <TouchableOpacity
                key={template.id || index}
                style={styles.templateCard}
                onPress={() => selectTemplate(template)}
              >
                <View style={styles.templateCardHeader}>
                  <View style={styles.templateIconContainer}>
                    <LinearGradient
                      colors={['#8B9BDE', '#9EACDE']}
                      style={styles.templateIcon}
                    >
                      <Ionicons name="barbell" size={32} color="#FFF" />
                    </LinearGradient>
                  </View>
                  <View style={styles.templateCardInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateDescription}>{template.description}</Text>
                  </View>
                </View>

                <View style={styles.templateBadges}>
                  <View style={[styles.templateBadge, { backgroundColor: template.isPersonal ? '#8B5CF6' : COLORS.primaryLight }]}>
                    <Ionicons name={template.isPersonal ? "bookmark" : "trophy"} size={14} color="#FFF" />
                    <Text style={styles.templateBadgeText}>{template.category}</Text>
                  </View>
                  <View style={[styles.templateBadge, { backgroundColor: COLORS.warning }]}>
                    <Ionicons name="flash" size={14} color="#FFF" />
                    <Text style={styles.templateBadgeText}>{template.difficulty}</Text>
                  </View>
                  <View style={[styles.templateBadge, { backgroundColor: COLORS.success }]}>
                    <Ionicons name="time" size={14} color="#FFF" />
                    <Text style={styles.templateBadgeText}>{template.duration}</Text>
                  </View>
                </View>

                <View style={styles.templateExercises}>
                  <Text style={styles.templateExercisesTitle}>
                    {template.exercises?.length || 0} øvelser
                  </Text>
                  {template.exercises?.slice(0, 3).map((ex: any, idx: number) => (
                    <View key={idx} style={styles.templateExerciseRow}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={styles.templateExerciseName}>{ex.name}</Text>
                      <Text style={styles.templateExerciseSets}>
                        {ex.sets?.length || 0} sett
                      </Text>
                    </View>
                  ))}
                  {(template.exercises?.length || 0) > 3 && (
                    <Text style={styles.templateExercisesMore}>
                      +{(template.exercises?.length || 0) - 3} flere øvelser
                    </Text>
                  )}
                </View>

                <View style={styles.templateCardFooter}>
                  <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
                  <Text style={styles.templateSelectText}>Bruk denne malen</Text>
                </View>
              </TouchableOpacity>
            ))}

            {templates.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="book-outline" size={80} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Ingen maler tilgjengelig</Text>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // App Header
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  appHeaderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  appHeaderButton: {
    padding: 4,
  },

  // Hero Section
  heroSection: {
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  heroGreeting: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  heroSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  quickStartButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStartText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Section
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Program Cards (Horizontal)
  programsScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  programCardHorizontal: {
    width: width * 0.75,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  programCardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  programCardTitleNew: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  programCardDescriptionNew: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  programCardInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  programInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  programInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  programStartButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  programStartButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Recent Workouts
  recentWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    gap: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  recentWorkoutIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentWorkoutInfo: {
    flex: 1,
  },
  recentWorkoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  recentWorkoutDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  sessionMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionMetricText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  progressIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
  },
  progressBadgeTextGreen: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  progressBadgeTextRed: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },

  // Empty States
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginHorizontal: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyWorkout: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyWorkoutText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
  },
  emptyWorkoutSubtext: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },

  // Active Workout
  workoutHeader: {
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  workoutHeaderButton: {
    padding: 8,
  },
  workoutHeaderCenter: {
    alignItems: 'center',
  },
  workoutHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  workoutHeaderDuration: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  restTimerContainer: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  restTimerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },

  workoutContent: {
    flex: 1,
  },
  workoutContentContainer: {
    padding: 16,
  },

  // Active Exercise Card
  activeExerciseCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  activeExerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeExerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // Sets Table
  setsTableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  setsTableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  setRowCompleted: {
    opacity: 0.5,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  previousValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  setInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  setInputPrefilled: {
    backgroundColor: `${COLORS.primary}08`,
    borderColor: `${COLORS.primary}40`,
    fontWeight: '600',
  },
  setCheckbox: {
    alignItems: 'center',
  },
  setCheckboxUnchecked: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  setCheckboxChecked: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add Set Button
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addSetButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  removeSetButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },

  // Add Exercise Button
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addExerciseText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },

  // Muscle Filter
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  muscleFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  muscleFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  muscleFilterTextActive: {
    color: '#FFF',
  },

  // Exercise Card with Image
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseImage: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.borderLight,
  },
  exerciseCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  exerciseCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  exerciseCardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  exerciseCardMuscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleBadge: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  exercisesList: {
    paddingBottom: 16,
  },

  // Programs
  programActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  createProgramButton: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  createProgramButtonNew: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  templateButtonNew: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  createProgramGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  createProgramText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },

  // Templates Styles
  templatesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  templateCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  templateCardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  templateIconContainer: {
    marginRight: 16,
  },
  templateIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateCardInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  templateBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  templateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  templateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  templateExercises: {
    marginBottom: 16,
  },
  templateExercisesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  templateExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  templateExerciseName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  templateExerciseSets: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  templateExercisesMore: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textLight,
    marginTop: 4,
  },
  templateCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  templateSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  programsList: {
    padding: 16,
  },
  programCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: COLORS.cardBg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  programCardBody: {
    padding: 20,
  },
  programCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  programCardIconContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  programCardIcon: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  programCardIconNew: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  programCardActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  programActionButton: {
    padding: 4,
  },
  programStartButtonInline: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  programStartButtonInlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  programCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  programCardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  programCardFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  programCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  programCardStatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // History
  historyList: {
    padding: 16,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  historyCardIndicator: {
    width: 4,
  },
  historyCardContent: {
    flex: 1,
    padding: 16,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  historyCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyCardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyCardDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  historyCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyCardMetaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Stats Tab
  statsTab: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statsCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  weeklyBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  weeklyBarContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  weeklyBar: {
    width: 28,
    height: 120,
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weeklyBarFill: {
    width: '100%',
    borderRadius: 8,
  },
  weeklyBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  prList: {
    gap: 12,
  },
  prItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  prInfo: {
    flex: 1,
  },
  prExercise: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  prValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  volumeChart: {
    alignItems: 'center',
    padding: 24,
  },
  volumeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  volumeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Bottom Navigation - Professional Design
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  bottomNavIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  bottomNavIconContainerActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  bottomNavText: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomNavTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Detail Modal
  detailImage: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: COLORS.borderLight,
  },
  detailName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  detailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTag: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailTagText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  sessionExerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sessionExerciseName: {
    fontSize: 16,
    color: COLORS.text,
  },
  sessionExerciseSets: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Modal Save Button
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Form Styles
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Program Exercise Card
  programExerciseCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  programExerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  programExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Program Sets Container
  programSetsContainer: {
    marginTop: 8,
  },
  programSetsHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  programSetsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  programSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  programSetNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  programSetInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addProgramSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addProgramSetText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Old styles (keep for compatibility)
  programExerciseInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  programExerciseInputGroup: {
    flex: 1,
  },
  programExerciseInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  programExerciseInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Add Program Exercise Button
  addProgramExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginTop: 12,
  },
  addProgramExerciseText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Delete Program Button
  saveTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: COLORS.success,
    marginTop: 24,
  },
  saveTemplateText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.success,
  },

  deleteProgramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginTop: 12,
  },
  deleteProgramText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger,
  },

  // Exercise Type Selector
  exerciseTypeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseTypeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  exerciseTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  exerciseTypeTextActive: {
    color: '#FFF',
  },
  // Schedule styles
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 50,
    alignItems: 'center',
  },
  dayChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayChipTextSelected: {
    color: '#FFFFFF',
  },
  formHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  programScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  programScheduleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  programScheduleTextCard: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // Predictions Tab Styles
  predictionsTab: {
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyPredictions: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyPredictionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyPredictionsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyPredictionsSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Prediction Card (Gradient)
  predictionCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  predictionCardNew: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  predictionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  predictionCardHeaderNew: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  predictionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  predictionCardTitleNew: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  predictionCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  predictionCardSubtitleNew: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  predictionItem: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  predictionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionExerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  predictionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionStatItem: {
    flex: 1,
  },
  predictionStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  predictionStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressionInfo: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  progressionRate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Card Header with Icon
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  // Optimal Time Chart
  optimalTimeChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  timeBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  timeBar: {
    width: 20,
    height: 120,
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  timeBarFill: {
    width: '100%',
    borderRadius: 10,
  },
  timeLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  timeLabelBest: {
    fontWeight: 'bold',
    color: COLORS.success,
  },
  optimalTimeInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accentLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  optimalTimeInsightText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Volume & Intensity
  volumeTrendContainer: {
    marginBottom: 20,
  },
  volumeTrendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  volumeBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    marginTop: 10,
  },
  volumeBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  volumeBar: {
    width: 16,
    height: 80,
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  volumeBarFill: {
    width: '100%',
    borderRadius: 8,
  },
  volumeBarLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  intensityDistribution: {
    marginTop: 16,
  },
  intensityBars: {
    gap: 12,
  },
  intensityBarItem: {
    marginBottom: 8,
  },
  intensityBar: {
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
  },
  intensityLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  recoveryRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  recoveryText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Smart Recommendations
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  recommendationMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
