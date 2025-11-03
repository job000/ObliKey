import { PrismaClient, ExerciseType, EquipmentType, MuscleGroup } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'b79f1c2a-7b12-4ded-a6f8-df327d4bf10c'; // ObliKey Demo
const ADMIN_USER_ID = '31f9710e-9bed-4f0b-901e-32419e56c7f8'; // admin@oblikey.no

interface ExerciseTemplate {
  name: string;
  description: string;
  type: ExerciseType;
  equipment: EquipmentType[];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
}

interface ProgramExerciseTemplate {
  exerciseName: string;
  sets: number;
  reps?: string;
  duration?: number;
  restTime: number;
  notes?: string;
}

interface WorkoutProgramTemplate {
  name: string;
  description: string;
  goals: string;
  isVisibleToCustomers: boolean;
  exercises: ProgramExerciseTemplate[];
}

const exerciseTemplates: ExerciseTemplate[] = [
  // Cardio exercises
  {
    name: 'Running',
    description: 'Outdoor or treadmill running',
    type: ExerciseType.CARDIO,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.CALVES],
    secondaryMuscles: [MuscleGroup.ABS],
  },
  {
    name: 'Cycling',
    description: 'Stationary bike or outdoor cycling',
    type: ExerciseType.CARDIO,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.CALVES],
  },
  {
    name: 'Jump Rope',
    description: 'Skipping rope exercise',
    type: ExerciseType.CARDIO,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.CALVES, MuscleGroup.SHOULDERS],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.ABS],
  },
  {
    name: 'Rowing Machine',
    description: 'Indoor rowing',
    type: ExerciseType.CARDIO,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.QUADS],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.ABS],
  },
  // Bodyweight/Calisthenics exercises
  {
    name: 'Push-ups',
    description: 'Standard push-up exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.TRICEPS],
    secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.ABS],
  },
  {
    name: 'Pull-ups',
    description: 'Standard pull-up exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.PULL_UP_BAR],
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS, MuscleGroup.ABS],
  },
  {
    name: 'Bodyweight Squats',
    description: 'Air squats',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.ABS],
  },
  {
    name: 'Plank',
    description: 'Standard plank hold',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.SHOULDERS],
  },
  {
    name: 'Lunges',
    description: 'Walking or stationary lunges',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.ABS],
  },
  {
    name: 'Burpees',
    description: 'Full body burpee exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.ABS, MuscleGroup.SHOULDERS],
  },
  {
    name: 'Mountain Climbers',
    description: 'Dynamic core exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.QUADS],
  },
];

const workoutProgramTemplates: WorkoutProgramTemplate[] = [
  {
    name: 'Styrketrening - Full Body',
    description: 'Komplett styrketreningsprogram for hele kroppen. Perfekt for å bygge muskelmasse og styrke.',
    goals: 'Øke muskelstyrke, bygge muskelmasse, forbedre generell styrke',
    isVisibleToCustomers: true,
    exercises: [
      { exerciseName: 'Barbell Squat', sets: 4, reps: '8-10', restTime: 180, notes: 'Fokus på dybde og teknikk' },
      { exerciseName: 'Barbell Bench Press', sets: 4, reps: '8-10', restTime: 120, notes: 'Kontroller nedføringen' },
      { exerciseName: 'Deadlift', sets: 3, reps: '5-8', restTime: 180, notes: 'Hold ryggen rett' },
      { exerciseName: 'Overhead Press', sets: 3, reps: '8-12', restTime: 120 },
      { exerciseName: 'Rows', sets: 4, reps: '10-12', restTime: 90 },
    ],
  },
  {
    name: 'Nybegynner Program',
    description: 'Grunnleggende treningsprogram for nybegynnere. Fokus på å lære riktig teknikk og bygge grunnstyrke.',
    goals: 'Lære grunnleggende øvelser, bygge grunnstyrke, utvikle god teknikk',
    isVisibleToCustomers: true,
    exercises: [
      { exerciseName: 'Bodyweight Squats', sets: 3, reps: '12-15', restTime: 60, notes: 'Fokus på form' },
      { exerciseName: 'Push-ups', sets: 3, reps: '8-12', restTime: 60, notes: 'Knærne ned hvis nødvendig' },
      { exerciseName: 'Lunges', sets: 3, reps: '10-12', restTime: 60, notes: 'Per bein' },
      { exerciseName: 'Plank', sets: 3, duration: 30, restTime: 60, notes: 'Hold stabil core' },
      { exerciseName: 'Rows', sets: 3, reps: '10-12', restTime: 90, notes: 'Lett vekt først' },
    ],
  },
  {
    name: 'Utholdenhet & Kondisjon',
    description: 'Kardiobasert program for å forbedre utholdenhet og kondisjon. Kombinasjon av ulike kardioøvelser.',
    goals: 'Forbedre kardiovaskulær helse, øke utholdenhet, brenne kalorier',
    isVisibleToCustomers: true,
    exercises: [
      { exerciseName: 'Running', sets: 1, duration: 1200, restTime: 120, notes: 'Moderat tempo' },
      { exerciseName: 'Jump Rope', sets: 3, duration: 180, restTime: 60, notes: 'Høy intensitet' },
      { exerciseName: 'Rowing Machine', sets: 3, duration: 300, restTime: 90, notes: 'Hold jevn pace' },
      { exerciseName: 'Mountain Climbers', sets: 3, duration: 60, restTime: 60, notes: 'Eksplosiv bevegelse' },
      { exerciseName: 'Cycling', sets: 1, duration: 900, restTime: 0, notes: 'Cooldown' },
    ],
  },
  {
    name: 'HIIT - Fettforbrenning',
    description: 'Høyintensiv intervalltrening for maksimal fettforbrenning. Kombinasjon av styrke og kardio.',
    goals: 'Fettforbrenning, forbedre metabolisme, øke kondisjon',
    isVisibleToCustomers: true,
    exercises: [
      { exerciseName: 'Burpees', sets: 4, reps: '15-20', restTime: 45, notes: 'Full intensitet' },
      { exerciseName: 'Jump Rope', sets: 4, duration: 60, restTime: 30, notes: 'Høy fart' },
      { exerciseName: 'Mountain Climbers', sets: 4, duration: 45, restTime: 30, notes: 'Eksplosiv' },
      { exerciseName: 'Bodyweight Squats', sets: 4, reps: '20-25', restTime: 30, notes: 'Tempo' },
      { exerciseName: 'Push-ups', sets: 4, reps: '15-20', restTime: 45, notes: 'Kontrollert' },
    ],
  },
  {
    name: 'Styrke - Overkropp',
    description: 'Spesialisert program for overkroppsstyrke. Fokus på bryst, rygg, skuldre og armer.',
    goals: 'Bygge overkroppsstyrke, utvikle muskulatur, forbedre definisjon',
    isVisibleToCustomers: true,
    exercises: [
      { exerciseName: 'Barbell Bench Press', sets: 4, reps: '6-8', restTime: 120, notes: 'Tung vekt' },
      { exerciseName: 'Rows', sets: 4, reps: '8-10', restTime: 90, notes: 'Fokus på squeeze' },
      { exerciseName: 'Overhead Press', sets: 3, reps: '8-10', restTime: 120 },
      { exerciseName: 'Pull-ups', sets: 3, reps: '6-10', restTime: 120, notes: 'Assistert hvis nødvendig' },
      { exerciseName: 'Barbell Curl', sets: 3, reps: '10-12', restTime: 60 },
    ],
  },
  {
    name: 'Styrke - Underkropp',
    description: 'Fokusert program for ben og rumpe. Bygger styrke og masse i underkroppen.',
    goals: 'Bygge benstyrke, utvikle rumpe, forbedre eksplosivitet',
    isVisibleToCustomers: true,
    exercises: [
      { exerciseName: 'Barbell Squat', sets: 5, reps: '5-8', restTime: 180, notes: 'Tung vekt' },
      { exerciseName: 'Romanian Deadlift', sets: 4, reps: '8-10', restTime: 120, notes: 'Stram hamstring' },
      { exerciseName: 'Leg Press', sets: 4, reps: '10-12', restTime: 90 },
      { exerciseName: 'Leg Curl', sets: 3, reps: '12-15', restTime: 60 },
      { exerciseName: 'Leg Extension', sets: 3, reps: '12-15', restTime: 60 },
    ],
  },
  {
    name: 'Mobilitets & Restitusjon',
    description: 'Lavintensivt program for mobilitet, fleksibilitet og restitusjon. Ideelt for restdager.',
    goals: 'Forbedre mobilitet, øke fleksibilitet, fremme restitusjon',
    isVisibleToCustomers: true,
    exercises: [
      { exerciseName: 'Bodyweight Squats', sets: 3, reps: '15', restTime: 30, notes: 'Fokus på bevegelsesområde' },
      { exerciseName: 'Lunges', sets: 3, reps: '12', restTime: 30, notes: 'Dyp stretch' },
      { exerciseName: 'Plank', sets: 3, duration: 45, restTime: 30, notes: 'Rolig pust' },
      { exerciseName: 'Cycling', sets: 1, duration: 900, restTime: 0, notes: 'Lett tempo' },
    ],
  },
];

async function createOrFindExercises() {
  console.log('Creating/finding exercises...');
  const exerciseMap = new Map<string, string>();

  for (const exercise of exerciseTemplates) {
    // Check if exercise already exists
    let existingExercise = await prisma.customExercise.findFirst({
      where: {
        tenantId: TENANT_ID,
        name: exercise.name,
      },
    });

    if (!existingExercise) {
      console.log(`  Creating exercise: ${exercise.name}`);
      existingExercise = await prisma.customExercise.create({
        data: {
          tenantId: TENANT_ID,
          userId: ADMIN_USER_ID,
          ...exercise,
        },
      });
    } else {
      console.log(`  Found existing exercise: ${exercise.name}`);
    }

    exerciseMap.set(exercise.name, existingExercise.id);
  }

  // Also add existing exercises from database
  const existingExercises = await prisma.customExercise.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, name: true },
  });

  for (const ex of existingExercises) {
    if (!exerciseMap.has(ex.name)) {
      exerciseMap.set(ex.name, ex.id);
    }
  }

  return exerciseMap;
}

async function createWorkoutPrograms(exerciseMap: Map<string, string>) {
  console.log('\nCreating workout programs...');

  for (const template of workoutProgramTemplates) {
    // Check if program already exists
    const existingProgram = await prisma.workoutProgram.findFirst({
      where: {
        tenantId: TENANT_ID,
        name: template.name,
        isTemplate: true,
      },
    });

    if (existingProgram) {
      console.log(`  Skipping existing program: ${template.name}`);
      continue;
    }

    console.log(`  Creating program: ${template.name}`);

    // Create workout program
    const program = await prisma.workoutProgram.create({
      data: {
        tenantId: TENANT_ID,
        userId: ADMIN_USER_ID,
        name: template.name,
        description: template.description,
        goals: template.goals,
        isActive: true,
        isTemplate: true,
        isVisibleToCustomers: template.isVisibleToCustomers,
      },
    });

    // Add exercises to program
    for (const programExercise of template.exercises) {
      const exerciseId = exerciseMap.get(programExercise.exerciseName);

      if (!exerciseId) {
        console.log(`    Warning: Exercise not found: ${programExercise.exerciseName}`);
        continue;
      }

      await prisma.workoutProgramExercise.create({
        data: {
          programId: program.id,
          customExerciseId: exerciseId,
          sets: programExercise.sets,
          reps: programExercise.reps,
          duration: programExercise.duration,
          restTime: programExercise.restTime,
          notes: programExercise.notes,
        },
      });
    }

    console.log(`    Added ${template.exercises.length} exercises to ${template.name}`);
  }
}

async function main() {
  try {
    console.log('Starting workout program template seeding...\n');

    const exerciseMap = await createOrFindExercises();
    console.log(`\nTotal exercises available: ${exerciseMap.size}`);

    await createWorkoutPrograms(exerciseMap);

    console.log('\n✅ Workout program templates seeded successfully!');
  } catch (error) {
    console.error('Error seeding workout programs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
