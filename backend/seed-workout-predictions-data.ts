import { PrismaClient, MuscleGroup, EquipmentType, ExerciseType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedWorkoutPredictionsData() {
  try {
    console.log('🏋️ Seeding workout prediction data for kunde1@test.no...');

    // Find kunde1@test.no
    const user = await prisma.user.findFirst({
      where: {
        email: 'kunde1@test.no'
      },
      include: {
        tenant: true
      }
    });

    if (!user) {
      console.error('❌ User kunde1@test.no not found');
      return;
    }

    console.log(`✓ Found user: ${user.email} (${user.id})`);
    console.log(`✓ Tenant: ${user.tenant.name} (${user.tenantId})`);

    // Create or find exercises
    const exercises = [
      {
        name: 'Benkpress',
        type: ExerciseType.STRENGTH,
        primaryMuscles: [MuscleGroup.CHEST],
        secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS],
        equipment: [EquipmentType.BARBELL]
      },
      {
        name: 'Squats',
        type: ExerciseType.STRENGTH,
        primaryMuscles: [MuscleGroup.QUADS],
        secondaryMuscles: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
        equipment: [EquipmentType.BARBELL]
      },
      {
        name: 'Deadlift',
        type: ExerciseType.STRENGTH,
        primaryMuscles: [MuscleGroup.BACK],
        secondaryMuscles: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
        equipment: [EquipmentType.BARBELL]
      },
      {
        name: 'Shoulder Press',
        type: ExerciseType.STRENGTH,
        primaryMuscles: [MuscleGroup.SHOULDERS],
        secondaryMuscles: [MuscleGroup.TRICEPS],
        equipment: [EquipmentType.DUMBBELL]
      },
      {
        name: 'Rows',
        type: ExerciseType.STRENGTH,
        primaryMuscles: [MuscleGroup.BACK],
        secondaryMuscles: [MuscleGroup.BICEPS],
        equipment: [EquipmentType.BARBELL]
      }
    ];

    console.log('📝 Creating custom exercises...');
    const createdExercises = [];
    for (const ex of exercises) {
      const existing = await prisma.customExercise.findFirst({
        where: {
          userId: user.id,
          tenantId: user.tenantId,
          name: ex.name
        }
      });

      if (existing) {
        console.log(`  ✓ Using existing: ${ex.name}`);
        createdExercises.push(existing);
      } else {
        const created = await prisma.customExercise.create({
          data: {
            userId: user.id,
            tenantId: user.tenantId,
            name: ex.name,
            type: ex.type,
            primaryMuscles: ex.primaryMuscles,
            secondaryMuscles: ex.secondaryMuscles,
            equipment: ex.equipment
          }
        });
        console.log(`  ✓ Created: ${ex.name}`);
        createdExercises.push(created);
      }
    }

    // Create 10 workout sessions over 8 weeks with progressive overload
    console.log('💪 Creating 10 workout sessions with progressive overload...');

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 56); // Start 8 weeks ago

    // Progressive overload data for each exercise
    const progressionData = {
      'Benkpress': { startWeight: 60, increment: 2.5, startReps: 10 },
      'Squats': { startWeight: 80, increment: 5, startReps: 8 },
      'Deadlift': { startWeight: 100, increment: 5, startReps: 6 },
      'Shoulder Press': { startWeight: 40, increment: 2.5, startReps: 10 },
      'Rows': { startWeight: 60, increment: 2.5, startReps: 10 }
    };

    for (let sessionNum = 0; sessionNum < 10; sessionNum++) {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(sessionDate.getDate() + (sessionNum * 5)); // Every 5 days

      const startedAt = new Date(sessionDate);
      startedAt.setHours(sessionNum % 2 === 0 ? 17 : 10); // Alternate between 17:00 and 10:00
      startedAt.setMinutes(0);

      const completedAt = new Date(startedAt);
      completedAt.setMinutes(completedAt.getMinutes() + 60); // 60 min workouts

      console.log(`  Creating session ${sessionNum + 1}/10 on ${sessionDate.toLocaleDateString()}...`);

      const session = await prisma.workoutSession.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          startedAt,
          completedAt,
          duration: 3600, // 60 minutes in seconds
          rating: 4 + (sessionNum % 2) // Alternate between 4 and 5
        }
      });

      // Add 3-4 exercises per session with progressive overload
      const sessionExercises = sessionNum % 2 === 0
        ? [createdExercises[0], createdExercises[1], createdExercises[4]] // Bench, Squats, Rows
        : [createdExercises[2], createdExercises[3], createdExercises[0]]; // Deadlift, Shoulder Press, Bench

      for (let exIndex = 0; exIndex < sessionExercises.length; exIndex++) {
        const exercise = sessionExercises[exIndex];
        const progression = progressionData[exercise.name as keyof typeof progressionData];

        // Calculate progressive overload
        const weight = progression.startWeight + (sessionNum * progression.increment);
        const reps = progression.startReps;

        const exerciseLog = await prisma.workoutExerciseLog.create({
          data: {
            sessionId: session.id,
            customExerciseId: exercise.id,
            sortOrder: exIndex
          }
        });

        // Create 3-4 sets with slight variation
        const numSets = 3 + (sessionNum % 2); // Alternate between 3 and 4 sets
        for (let setNum = 0; setNum < numSets; setNum++) {
          await prisma.workoutSetLog.create({
            data: {
              exerciseLogId: exerciseLog.id,
              setNumber: setNum + 1,
              reps: setNum === numSets - 1 ? reps - 1 : reps, // Last set slightly lower reps
              weight: weight,
              weightUnit: 'kg',
              completed: true
            }
          });
        }

        console.log(`    ✓ ${exercise.name}: ${numSets} sets x ${reps} reps @ ${weight}kg`);
      }
    }

    console.log('\n✅ Successfully seeded workout prediction data!');
    console.log('\n📊 Summary:');
    console.log(`  - User: kunde1@test.no`);
    console.log(`  - Exercises created: ${createdExercises.length}`);
    console.log(`  - Workout sessions: 10`);
    console.log(`  - Date range: Last 8 weeks`);
    console.log(`  - Progressive overload: Yes`);
    console.log(`  - Training times: Alternating 10:00 and 17:00`);
    console.log('\n🎯 You can now test predictions in the app!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedWorkoutPredictionsData()
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script failed:', error);
    process.exit(1);
  });
