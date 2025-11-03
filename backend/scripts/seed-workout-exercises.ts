import { PrismaClient, ExerciseType, EquipmentType, MuscleGroup } from '@prisma/client';

const prisma = new PrismaClient();

const exercises = [
  // ============================================
  // CHEST EXERCISES
  // ============================================
  {
    name: 'Barbell Bench Press',
    description: 'Classic compound chest exercise for building strength and mass',
    instructions: 'Lie on flat bench, grip barbell slightly wider than shoulder width. Lower bar to mid-chest, pause briefly, then press back up.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL, EquipmentType.BENCH],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    tips: 'Keep feet flat on ground, maintain natural arch in lower back, control descent',
    warnings: 'Always use safety bars or spotter for heavy sets'
  },
  {
    name: 'Dumbbell Bench Press',
    description: 'Unilateral chest exercise allowing greater range of motion',
    instructions: 'Lie on bench with dumbbells at shoulder level. Press up until arms fully extended, lower with control.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL, EquipmentType.BENCH],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    tips: 'Keep dumbbells aligned with mid-chest, don\'t let them drift forward',
    warnings: 'Start with lighter weight to practice form'
  },
  {
    name: 'Incline Bench Press',
    description: 'Targets upper chest and front deltoids',
    instructions: 'Set bench to 30-45 degree incline. Press barbell or dumbbells from upper chest.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL, EquipmentType.BENCH],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80',
    tips: 'Don\'t set angle too steep or it becomes a shoulder press',
    warnings: 'Use spotter for heavy sets'
  },
  {
    name: 'Push-ups',
    description: 'Bodyweight chest, shoulder and tricep exercise',
    instructions: 'Start in plank position, lower chest to ground, push back up maintaining straight body line.',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS, MuscleGroup.ABS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&q=80',
    tips: 'Keep core tight, elbows at 45-degree angle',
    warnings: 'Stop if you feel shoulder pain'
  },
  {
    name: 'Cable Fly',
    description: 'Isolation exercise for chest with constant tension',
    instructions: 'Stand between cable towers, grab handles at shoulder height. Bring hands together in front of chest.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.SHOULDERS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
    tips: 'Slight bend in elbows, focus on squeezing chest',
    warnings: 'Don\'t use too much weight - this is an isolation exercise'
  },
  {
    name: 'Chest Dips',
    description: 'Bodyweight exercise targeting lower chest',
    instructions: 'Grip parallel bars, lean forward slightly, lower body until upper arms parallel to ground.',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.DIP_BAR],
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1584863231364-2edc166de576?w=800&q=80',
    tips: 'Lean forward to target chest more than triceps',
    warnings: 'Don\'t go too deep if you feel shoulder strain'
  },

  // ============================================
  // BACK EXERCISES
  // ============================================
  {
    name: 'Pull-ups',
    description: 'King of upper body pulling exercises',
    instructions: 'Hang from bar with overhand grip, pull yourself up until chin above bar.',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.PULL_UP_BAR],
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.FOREARMS],
    difficulty: 'Advanced',
    imageUrl: 'https://images.unsplash.com/photo-1598632640486-6c8534f0e5d8?w=800&q=80',
    tips: 'Pull with elbows, not hands. Squeeze shoulder blades together at top',
    warnings: 'Use assisted machine or bands if you can\'t do full pull-ups yet'
  },
  {
    name: 'Lat Pulldown',
    description: 'Machine variation of pull-ups',
    instructions: 'Sit at machine, grip bar wider than shoulders, pull down to upper chest.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE, EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&q=80',
    tips: 'Pull to chest, not behind neck. Keep torso stable',
    warnings: 'Don\'t lean back excessively'
  },
  {
    name: 'Barbell Row',
    description: 'Compound rowing movement for back thickness',
    instructions: 'Bend at hips with slight knee bend, grip barbell, pull to lower chest.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.LOWER_BACK],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80',
    tips: 'Keep back straight, pull to lower chest/upper abs',
    warnings: 'Don\'t round back - can cause injury'
  },
  {
    name: 'Dumbbell Row',
    description: 'Unilateral back exercise',
    instructions: 'Support yourself on bench, row dumbbell to hip with elbow close to body.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL, EquipmentType.BENCH],
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',
    tips: 'Pull with elbow, squeeze at top',
    warnings: 'Keep lower back neutral'
  },
  {
    name: 'Deadlift',
    description: 'King of all exercises - full body compound movement',
    instructions: 'Stand with feet hip-width, grip barbell, drive through heels to stand up.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.FOREARMS, MuscleGroup.TRAPS],
    difficulty: 'Advanced',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep bar close to body, drive through heels, keep back straight',
    warnings: 'Master form before adding weight - risk of back injury if done incorrectly'
  },
  {
    name: 'Cable Row',
    description: 'Seated cable rowing for mid-back',
    instructions: 'Sit at cable row machine, pull handle to lower chest, squeeze shoulder blades.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE, EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1599744331534-2fe661a863b4?w=800&q=80',
    tips: 'Keep torso stable, pull to lower chest',
    warnings: 'Don\'t use momentum'
  },

  // ============================================
  // SHOULDER EXERCISES
  // ============================================
  {
    name: 'Overhead Press',
    description: 'Primary shoulder mass builder',
    instructions: 'Press barbell or dumbbells overhead from shoulder level to full extension.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.SHOULDERS],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.TRAPS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Press slightly back so bar path is vertical',
    warnings: 'Don\'t arch back excessively'
  },
  {
    name: 'Lateral Raise',
    description: 'Isolation for side deltoids',
    instructions: 'Hold dumbbells at sides, raise arms laterally to shoulder height.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.SHOULDERS],
    secondaryMuscles: [MuscleGroup.TRAPS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Slight bend in elbows, lead with elbows not hands',
    warnings: 'Don\'t use momentum or swing weights'
  },
  {
    name: 'Front Raise',
    description: 'Targets front deltoids',
    instructions: 'Hold dumbbells in front of thighs, raise straight forward to shoulder height.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.SHOULDERS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep core tight, don\'t swing',
    warnings: 'Use lighter weight than lateral raises'
  },
  {
    name: 'Face Pull',
    description: 'Rear deltoid and upper back exercise',
    instructions: 'Pull rope attachment to face level, separating hands as you pull.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.SHOULDERS],
    secondaryMuscles: [MuscleGroup.TRAPS, MuscleGroup.BACK],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Pull to nose/forehead level, external rotate at end',
    warnings: 'Excellent for shoulder health'
  },
  {
    name: 'Shrugs',
    description: 'Trapezius isolation',
    instructions: 'Hold dumbbells at sides, elevate shoulders straight up, squeeze at top.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.TRAPS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Straight up and down motion, don\'t roll shoulders',
    warnings: 'Don\'t use neck to assist'
  },

  // ============================================
  // ARM EXERCISES - BICEPS
  // ============================================
  {
    name: 'Barbell Curl',
    description: 'Classic bicep builder',
    instructions: 'Stand with barbell, curl up while keeping elbows stationary.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep elbows pinned to sides, squeeze at top',
    warnings: 'Don\'t swing or use momentum'
  },
  {
    name: 'Dumbbell Curl',
    description: 'Unilateral bicep curl',
    instructions: 'Curl dumbbells alternating or together, keep elbows fixed.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Supinate wrist at top for peak contraction',
    warnings: 'Control the negative portion'
  },
  {
    name: 'Hammer Curl',
    description: 'Targets brachialis and forearms',
    instructions: 'Curl dumbbells with neutral grip (palms facing each other).',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep neutral grip throughout movement',
    warnings: 'Good for elbow health'
  },
  {
    name: 'Cable Curl',
    description: 'Constant tension bicep curl',
    instructions: 'Curl cable bar or rope attachment, maintain tension throughout.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Constant tension is key benefit',
    warnings: 'Control the weight'
  },
  {
    name: 'Preacher Curl',
    description: 'Isolated bicep curl on preacher bench',
    instructions: 'Rest upper arms on preacher pad, curl weight up.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL, EquipmentType.BENCH],
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Prevents cheating, good for isolation',
    warnings: 'Don\'t hyperextend at bottom'
  },

  // ============================================
  // ARM EXERCISES - TRICEPS
  // ============================================
  {
    name: 'Close-Grip Bench Press',
    description: 'Compound tricep builder',
    instructions: 'Bench press with hands shoulder-width or closer.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL, EquipmentType.BENCH],
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [MuscleGroup.CHEST, MuscleGroup.SHOULDERS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep elbows tucked, don\'t flare out',
    warnings: 'Don\'t grip too narrow - can stress wrists'
  },
  {
    name: 'Tricep Dips',
    description: 'Bodyweight tricep builder',
    instructions: 'On parallel bars, keep body upright, lower until upper arms parallel to ground.',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.DIP_BAR],
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [MuscleGroup.CHEST, MuscleGroup.SHOULDERS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Stay upright to target triceps, lean forward targets chest',
    warnings: 'Don\'t go too deep if shoulders hurt'
  },
  {
    name: 'Skull Crushers',
    description: 'Lying tricep extension',
    instructions: 'Lie on bench, lower barbell/EZ-bar to forehead, extend back up.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL, EquipmentType.BENCH],
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep upper arms stationary, move only at elbow',
    warnings: 'Be careful lowering weight near face'
  },
  {
    name: 'Cable Pushdown',
    description: 'Isolation tricep exercise',
    instructions: 'Push cable attachment down until arms fully extended.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep elbows pinned to sides, squeeze at bottom',
    warnings: 'Don\'t lean on cable stack'
  },
  {
    name: 'Overhead Tricep Extension',
    description: 'Stretches and works long head of tricep',
    instructions: 'Hold dumbbell overhead, lower behind head, extend back up.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep elbows pointing forward, don\'t flare out',
    warnings: 'Start light to get used to stretch'
  },

  // ============================================
  // LEG EXERCISES
  // ============================================
  {
    name: 'Barbell Squat',
    description: 'King of leg exercises',
    instructions: 'Bar on upper back, descend until thighs parallel to ground, drive through heels to stand.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.LOWER_BACK],
    difficulty: 'Advanced',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep chest up, knees tracking over toes, drive through heels',
    warnings: 'Master form before adding weight'
  },
  {
    name: 'Front Squat',
    description: 'Quad-dominant squat variation',
    instructions: 'Bar rests on front shoulders, squat down keeping torso upright.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [MuscleGroup.GLUTES, MuscleGroup.ABS],
    difficulty: 'Advanced',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep elbows high, chest up, very upright torso',
    warnings: 'Easier on lower back than back squat'
  },
  {
    name: 'Leg Press',
    description: 'Machine-based quad and glute builder',
    instructions: 'Press platform away with feet, lower with control.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Don\'t lock knees at top, keep lower back against pad',
    warnings: 'Don\'t lower too far - butt should stay on seat'
  },
  {
    name: 'Walking Lunges',
    description: 'Unilateral leg exercise',
    instructions: 'Step forward into lunge, alternate legs walking forward.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL],
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep torso upright, knee shouldn\'t pass toes',
    warnings: 'Good for balance and stability'
  },
  {
    name: 'Leg Curl',
    description: 'Hamstring isolation',
    instructions: 'Curl legs up against pad, squeeze hamstrings at top.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Control the negative, squeeze at top',
    warnings: 'Don\'t hyperextend'
  },
  {
    name: 'Leg Extension',
    description: 'Quad isolation',
    instructions: 'Extend legs against pad until straight.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Squeeze quads at top, control descent',
    warnings: 'Can be hard on knees - use moderate weight'
  },
  {
    name: 'Romanian Deadlift',
    description: 'Hamstring and glute developer',
    instructions: 'With slight knee bend, hinge at hips lowering bar down legs, return to standing.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL],
    primaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.LOWER_BACK],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Feel stretch in hamstrings, keep back straight',
    warnings: 'Master hip hinge pattern first'
  },
  {
    name: 'Hip Thrust',
    description: 'Premier glute builder',
    instructions: 'Upper back on bench, barbell on hips, thrust hips up squeezing glutes.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.BARBELL, EquipmentType.BENCH],
    primaryMuscles: [MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Squeeze glutes hard at top, tuck chin',
    warnings: 'Use pad on bar for comfort'
  },
  {
    name: 'Bulgarian Split Squat',
    description: 'Unilateral quad and glute exercise',
    instructions: 'Rear foot elevated, lunge down on front leg.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.DUMBBELL, EquipmentType.BENCH],
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Keep torso upright, knee tracks over toe',
    warnings: 'Excellent for single-leg strength'
  },
  {
    name: 'Calf Raise',
    description: 'Standing calf builder',
    instructions: 'Rise up on toes, lower with control.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.CALVES],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Full range of motion, squeeze at top',
    warnings: 'Can do with dumbbells or bodyweight'
  },

  // ============================================
  // CORE EXERCISES
  // ============================================
  {
    name: 'Plank',
    description: 'Isometric core strengthener',
    instructions: 'Hold push-up position on forearms, keep body in straight line.',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.LOWER_BACK, MuscleGroup.SHOULDERS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Don\'t let hips sag, squeeze glutes and core',
    warnings: 'Start with short holds, build up time'
  },
  {
    name: 'Crunches',
    description: 'Classic ab exercise',
    instructions: 'Lie on back, curl upper body towards knees.',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Focus on quality over quantity',
    warnings: 'Don\'t pull on neck'
  },
  {
    name: 'Hanging Leg Raises',
    description: 'Advanced ab exercise',
    instructions: 'Hang from bar, raise legs until parallel to ground.',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.PULL_UP_BAR],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    difficulty: 'Advanced',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Control the movement, don\'t swing',
    warnings: 'Requires good grip strength'
  },
  {
    name: 'Russian Twist',
    description: 'Oblique rotational exercise',
    instructions: 'Sit with feet elevated, rotate torso side to side.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.MEDICINE_BALL],
    primaryMuscles: [MuscleGroup.OBLIQUES],
    secondaryMuscles: [MuscleGroup.ABS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Rotate through torso, not just arms',
    warnings: 'Can do with weight plate or medicine ball'
  },
  {
    name: 'Cable Crunch',
    description: 'Weighted ab crunch',
    instructions: 'Kneel at cable machine, crunch down bringing elbows to knees.',
    type: ExerciseType.STRENGTH,
    equipment: [EquipmentType.CABLE],
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Crunch with abs, not pull with arms',
    warnings: 'Control the weight'
  },

  // ============================================
  // CARDIO EXERCISES
  // ============================================
  {
    name: 'Treadmill Running',
    description: 'Classic cardio exercise',
    instructions: 'Walk, jog, or run on treadmill at desired pace and incline.',
    type: ExerciseType.CARDIO,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.CARDIO],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS, MuscleGroup.CALVES],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Vary speed and incline for best results',
    warnings: 'Start slow if you\'re new to running'
  },
  {
    name: 'Rowing Machine',
    description: 'Full body cardio',
    instructions: 'Pull handle to chest, extend legs, return with control.',
    type: ExerciseType.CARDIO,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.CARDIO],
    secondaryMuscles: [MuscleGroup.BACK, MuscleGroup.QUADS, MuscleGroup.ABS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Drive with legs first, then pull with arms',
    warnings: 'Excellent low-impact cardio'
  },
  {
    name: 'Stationary Bike',
    description: 'Low-impact cardio',
    instructions: 'Pedal at desired resistance and pace.',
    type: ExerciseType.CARDIO,
    equipment: [EquipmentType.MACHINE],
    primaryMuscles: [MuscleGroup.CARDIO],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS],
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Adjust seat height properly',
    warnings: 'Great for joint-friendly cardio'
  },
  {
    name: 'Jump Rope',
    description: 'High-intensity cardio',
    instructions: 'Jump rope at steady pace or do intervals.',
    type: ExerciseType.CARDIO,
    equipment: [EquipmentType.OTHER],
    primaryMuscles: [MuscleGroup.CARDIO],
    secondaryMuscles: [MuscleGroup.CALVES, MuscleGroup.SHOULDERS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Land softly on balls of feet',
    warnings: 'High-impact - not suitable for everyone'
  },
  {
    name: 'Burpees',
    description: 'Full body conditioning',
    instructions: 'Drop to push-up, jump feet forward, jump up with hands overhead.',
    type: ExerciseType.CALISTHENICS,
    equipment: [EquipmentType.BODYWEIGHT],
    primaryMuscles: [MuscleGroup.FULL_BODY, MuscleGroup.CARDIO],
    secondaryMuscles: [MuscleGroup.CHEST, MuscleGroup.QUADS, MuscleGroup.ABS],
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    tips: 'Modify by stepping instead of jumping',
    warnings: 'Very demanding - pace yourself'
  },
];

async function seedExercises() {
  console.log('🏋️ Starting workout exercises seed...');

  try {
    // Clear existing system exercises
    console.log('Clearing existing system exercises...');
    await prisma.systemExercise.deleteMany({});

    // Create all exercises
    console.log(`Creating ${exercises.length} system exercises...`);

    for (const exercise of exercises) {
      await prisma.systemExercise.create({
        data: exercise
      });
      console.log(`✅ Created: ${exercise.name}`);
    }

    console.log(`\n✅ Successfully seeded ${exercises.length} exercises!`);
    console.log('\nExercise breakdown:');
    console.log('- Chest: 6 exercises');
    console.log('- Back: 6 exercises');
    console.log('- Shoulders: 5 exercises');
    console.log('- Biceps: 5 exercises');
    console.log('- Triceps: 5 exercises');
    console.log('- Legs: 10 exercises');
    console.log('- Core: 5 exercises');
    console.log('- Cardio: 5 exercises');
    console.log('\nTotal muscle groups covered: 14');
    console.log('Equipment types: Barbell, Dumbbell, Cable, Machine, Bodyweight, and more');

  } catch (error) {
    console.error('❌ Error seeding exercises:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedExercises()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
