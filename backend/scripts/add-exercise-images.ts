import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'b79f1c2a-7b12-4ded-a6f8-df327d4bf10c'; // ObliKey Demo

// Professional exercise images from Unsplash and fitness sources
// These are high-quality, royalty-free images suitable for commercial use
const exerciseImages: Record<string, string> = {
  // Strength exercises
  'Barbell Squat': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',
  'Barbell Bench Press': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  'Deadlift': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  'Overhead Press': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
  'Rows': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'Romanian Deadlift': 'https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=800&q=80',
  'Leg Press': 'https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?w=800&q=80',
  'Leg Curl': 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&q=80',
  'Leg Extension': 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&q=80',
  'Barbell Curl': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
  'Benkpress': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  'Shoulder Press': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
  'Squats': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',

  // Cardio exercises
  'Running': 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80',
  'Cycling': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80',
  'Jump Rope': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
  'Rowing Machine': 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73?w=800&q=80',

  // Calisthenics/Bodyweight exercises
  'Push-ups': 'https://images.unsplash.com/photo-1598971861713-54ad16d5f23e?w=800&q=80',
  'Pull-ups': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',
  'Bodyweight Squats': 'https://images.unsplash.com/photo-1611672585731-fa10603fb9e0?w=800&q=80',
  'Plank': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'Lunges': 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&q=80',
  'Burpees': 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&q=80',
  'Mountain Climbers': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
};

async function updateExerciseImages() {
  console.log('Starting to update exercise images...\n');

  let updateCount = 0;
  let notFoundCount = 0;

  for (const [exerciseName, imageUrl] of Object.entries(exerciseImages)) {
    console.log(`Processing: ${exerciseName}`);

    // Find all exercises with this name in the tenant
    const exercises = await prisma.customExercise.findMany({
      where: {
        tenantId: TENANT_ID,
        name: exerciseName,
      },
    });

    if (exercises.length === 0) {
      console.log(`  ⚠️  No exercise found with name: ${exerciseName}`);
      notFoundCount++;
      continue;
    }

    // Update all matching exercises
    for (const exercise of exercises) {
      await prisma.customExercise.update({
        where: { id: exercise.id },
        data: { imageUrl },
      });

      console.log(`  ✅ Updated exercise ID: ${exercise.id}`);
      updateCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`✅ Successfully updated: ${updateCount} exercises`);
  console.log(`⚠️  Not found: ${notFoundCount} exercise types`);
  console.log('\nNote: Images are from Unsplash and are free to use under the Unsplash License');
  console.log('https://unsplash.com/license');
}

async function main() {
  try {
    await updateExerciseImages();
  } catch (error) {
    console.error('Error updating exercise images:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
