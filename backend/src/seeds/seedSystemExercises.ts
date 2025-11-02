import { prisma } from '../utils/prisma';
import { ExerciseType, EquipmentType, MuscleGroup } from '@prisma/client';

const systemExercises = [
  // CHEST EXERCISES (7 exercises)
  {
    name: 'Barbell Bench Press',
    description: 'Classic compound movement for chest development',
    instructions: 'Lie on bench, grip bar slightly wider than shoulder width, lower to chest, press up',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS],
    difficulty: 'Intermediate',
    tips: 'Keep feet flat on floor, maintain arch in lower back',
  },
  {
    name: 'Incline Dumbbell Press',
    description: 'Targets upper chest with dumbbells',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS],
    difficulty: 'Intermediate',
  },
  {
    name: 'Push-Ups',
    description: 'Bodyweight chest exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS, MuscleGroup.ABS],
    difficulty: 'Beginner',
  },
  {
    name: 'Cable Chest Fly',
    description: 'Isolation exercise for chest',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Dumbbell Chest Fly',
    description: 'Dumbbell variation for chest isolation',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [],
    difficulty: 'Intermediate',
  },
  {
    name: 'Decline Bench Press',
    description: 'Targets lower chest',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS],
    difficulty: 'Intermediate',
  },
  {
    name: 'Chest Dips',
    description: 'Advanced bodyweight chest exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.DIP_BAR],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS],
    difficulty: 'Advanced',
  },

  // BACK EXERCISES (7 exercises)
  {
    name: 'Pull-Ups',
    description: 'Classic bodyweight back exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.PULL_UP_BAR],
    primaryMuscles: [MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS],
    difficulty: 'Intermediate',
  },
  {
    name: 'Barbell Rows',
    description: 'Compound exercise for back thickness',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS],
    difficulty: 'Intermediate',
  },
  {
    name: 'Lat Pulldown',
    description: 'Machine-based lat exercise',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.LATS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    difficulty: 'Beginner',
  },
  {
    name: 'Deadlift',
    description: 'King of compound exercises',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    difficulty: 'Advanced',
  },
  {
    name: 'Dumbbell Row',
    description: 'One-arm dumbbell rowing',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS],
    difficulty: 'Beginner',
  },
  {
    name: 'T-Bar Row',
    description: 'Machine rowing for back',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS],
    difficulty: 'Intermediate',
  },
  {
    name: 'Face Pulls',
    description: 'Cable exercise for rear delts and upper back',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.TRAPS],
    secondaryMuscles: [MuscleGroup.SHOULDERS],
    difficulty: 'Beginner',
  },

  // SHOULDERS (5 exercises)
  {
    name: 'Overhead Press',
    description: 'Barbell shoulder press',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.SHOULDERS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    difficulty: 'Intermediate',
  },
  {
    name: 'Dumbbell Lateral Raise',
    description: 'Isolation for side delts',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.SHOULDERS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Arnold Press',
    description: 'Rotational dumbbell press',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.SHOULDERS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    difficulty: 'Intermediate',
  },
  {
    name: 'Rear Delt Fly',
    description: 'Targets rear delts',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.SHOULDERS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Front Raise',
    description: 'Isolation for front delts',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.SHOULDERS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },

  // BICEPS (4 exercises)
  {
    name: 'Barbell Curl',
    description: 'Classic bicep builder',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Hammer Curl',
    description: 'Neutral grip dumbbell curl',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Preacher Curl',
    description: 'Isolated bicep curl',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [],
    difficulty: 'Intermediate',
  },
  {
    name: 'Cable Curl',
    description: 'Cable bicep curl',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },

  // TRICEPS (4 exercises)
  {
    name: 'Tricep Dips',
    description: 'Bodyweight tricep exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.DIP_BAR],
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [MuscleGroup.CHEST, MuscleGroup.SHOULDERS],
    difficulty: 'Intermediate',
  },
  {
    name: 'Overhead Tricep Extension',
    description: 'Dumbbell tricep extension',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Tricep Pushdown',
    description: 'Cable tricep exercise',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Close-Grip Bench Press',
    description: 'Bench press variation for triceps',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [MuscleGroup.CHEST, MuscleGroup.SHOULDERS],
    difficulty: 'Intermediate',
  },

  // QUADS (5 exercises)
  {
    name: 'Barbell Squat',
    description: 'King of leg exercises',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    difficulty: 'Intermediate',
  },
  {
    name: 'Leg Press',
    description: 'Machine-based quad exercise',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    difficulty: 'Beginner',
  },
  {
    name: 'Front Squat',
    description: 'Squat variation targeting quads',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [MuscleGroup.ABS, MuscleGroup.GLUTES],
    difficulty: 'Advanced',
  },
  {
    name: 'Leg Extension',
    description: 'Isolation for quads',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Bulgarian Split Squat',
    description: 'Single-leg quad exercise',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [MuscleGroup.GLUTES],
    difficulty: 'Intermediate',
  },

  // HAMSTRINGS (4 exercises)
  {
    name: 'Romanian Deadlift',
    description: 'Hip hinge for hamstrings',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [MuscleGroup.LOWER_BACK, MuscleGroup.GLUTES],
    difficulty: 'Intermediate',
  },
  {
    name: 'Leg Curl',
    description: 'Machine hamstring curl',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Nordic Curl',
    description: 'Advanced bodyweight hamstring exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [],
    difficulty: 'Advanced',
  },
  {
    name: 'Good Mornings',
    description: 'Barbell hip hinge',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [MuscleGroup.LOWER_BACK, MuscleGroup.GLUTES],
    difficulty: 'Intermediate',
  },

  // GLUTES (3 exercises)
  {
    name: 'Hip Thrust',
    description: 'Glute-focused hip extension',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    difficulty: 'Intermediate',
  },
  {
    name: 'Glute Bridge',
    description: 'Bodyweight glute exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    difficulty: 'Beginner',
  },
  {
    name: 'Cable Kickback',
    description: 'Isolation for glutes',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.GLUTES],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },

  // CALVES (2 exercises)
  {
    name: 'Standing Calf Raise',
    description: 'Calf exercise on machine',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.CALVES],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Seated Calf Raise',
    description: 'Seated variation for calves',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.CALVES],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },

  // ABS (6 exercises)
  {
    name: 'Plank',
    description: 'Core stability exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Crunches',
    description: 'Classic ab exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
  },
  {
    name: 'Hanging Leg Raise',
    description: 'Advanced ab exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.PULL_UP_BAR],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    difficulty: 'Advanced',
  },
  {
    name: 'Russian Twist',
    description: 'Rotational ab exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.OBLIQUES],
    difficulty: 'Beginner',
  },
  {
    name: 'Cable Crunch',
    description: 'Weighted ab crunch',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    difficulty: 'Intermediate',
  },
  {
    name: 'Ab Wheel Rollout',
    description: 'Advanced core exercise',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    difficulty: 'Advanced',
  },
];

export async function seedSystemExercises() {
  console.log('🏋️  Seeding system exercises...');

  try {
    // Check if exercises already exist
    const existingCount = await prisma.systemExercise.count();

    if (existingCount > 0) {
      console.log(`ℹ️  ${existingCount} system exercises already exist. Skipping seed.`);
      return;
    }

    // Create all exercises
    const created = await prisma.systemExercise.createMany({
      data: systemExercises,
      skipDuplicates: true,
    });

    console.log(`✅ Created ${created.count} system exercises`);

    // Print summary by muscle group
    console.log('\n📊 Exercises by muscle group:');
    const muscleGroups: MuscleGroup[] = [
      MuscleGroup.CHEST,
      MuscleGroup.BACK,
      MuscleGroup.SHOULDERS,
      MuscleGroup.BICEPS,
      MuscleGroup.TRICEPS,
      MuscleGroup.QUADS,
      MuscleGroup.HAMSTRINGS,
      MuscleGroup.GLUTES,
      MuscleGroup.CALVES,
      MuscleGroup.ABS
    ];

    for (const muscle of muscleGroups) {
      const count = await prisma.systemExercise.count({
        where: {
          primaryMuscles: {
            has: muscle,
          },
        },
      });
      console.log(`  ${muscle}: ${count} exercises`);
    }

  } catch (error) {
    console.error('❌ Error seeding system exercises:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedSystemExercises()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}
