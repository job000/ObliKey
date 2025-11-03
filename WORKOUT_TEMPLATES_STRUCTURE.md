# Workout Templates and Exercise Image Structure - Complete Analysis

## Overview
This document explains how workout templates and exercises are structured in ObliKey, specifically how images (imageUrl) flow through the system from templates to exercises.

---

## 1. DATABASE SCHEMA (Prisma)

### Core Models

#### SystemExercise (Global Library)
```prisma
model SystemExercise {
  id              String         @id @default(uuid())
  name            String         // e.g., "Barbell Bench Press"
  description     String?
  instructions    String?
  type            ExerciseType   // STRENGTH, CARDIO, FLEXIBILITY, CALISTHENICS
  equipment       EquipmentType[] // Array: BARBELL, DUMBBELL, CABLE, MACHINE, etc.
  primaryMuscles  MuscleGroup[]  // Array: CHEST, BACK, SHOULDERS, etc.
  secondaryMuscles MuscleGroup[]
  difficulty      String         // "Beginner", "Intermediate", "Advanced"
  imageUrl        String?        // URL to exercise image (THIS IS THE KEY FIELD)
  videoUrl        String?
  tips            String?
  warnings        String?
  media           ExerciseMedia[] // Can have multiple media files
}
```

#### CustomExercise (User's Personal Exercises)
```prisma
model CustomExercise {
  id               String          @id @default(uuid())
  tenantId         String
  userId           String
  systemExerciseId String?         // Reference to system exercise
  name             String
  description      String?
  instructions     String?
  type             ExerciseType
  equipment        EquipmentType[]
  primaryMuscles   MuscleGroup[]
  secondaryMuscles MuscleGroup[]
  imageUrl         String?        // Can have own image or inherit from system
  videoUrl         String?
  notes            String?
  systemExercise   SystemExercise? // Relation to parent
  programExercises WorkoutProgramExercise[] // Used in programs
  media            ExerciseMedia[]
}
```

#### WorkoutProgram (Template/Program Container)
```prisma
model WorkoutProgram {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  name        String   // e.g., "My Chest Day", "Starting Strength - A"
  description String?
  goals       String?
  isActive    Boolean  @default(true)
  isTemplate  Boolean  @default(false) // Mark as template
  isVisibleToCustomers Boolean @default(true) // Visibility control
  exercises   WorkoutProgramExercise[] // Many exercises
  schedules   WorkoutSchedule[]
  sessions    WorkoutSession[]
}
```

#### WorkoutProgramExercise (Exercise in a Program)
```prisma
model WorkoutProgramExercise {
  id               String    @id @default(uuid())
  programId        String    // Which program
  customExerciseId String    // Link to custom exercise
  sets             Int       @default(3)
  reps             String?   // "10" or "8-12" or "30s"
  duration         Int?      // Duration in seconds
  weight           Float?
  weightUnit       String    @default("kg")
  restTime         Int?      // Rest in seconds
  notes            String?   // JSON for setConfiguration
  sortOrder        Int       @default(0)
  
  program        WorkoutProgram  @relation(...) // Which program
  customExercise CustomExercise  @relation(...) // Which exercise
}
```

#### ExerciseMedia (For Multiple Images/Videos)
```prisma
model ExerciseMedia {
  id               String             @id @default(uuid())
  url              String             // Media URL
  mediaType        ExerciseMediaType  // IMAGE or VIDEO
  title            String?
  description      String?
  sortOrder        Int                @default(0)
  systemExerciseId String?            // For system exercises
  customExerciseId String?            // For custom exercises
  isLegacy         Boolean?           // Legacy imageUrl field
}
```

---

## 2. DATA FLOW ARCHITECTURE

### Flow 1: Template Creation and Retrieval

```
getWorkoutTemplates() Controller Method (Line 422)
    ↓
Get User's Personal Templates (isTemplate: true)
    ├─ SELECT WorkoutProgram WHERE userId=X, isTemplate=true
    └─ Include: exercises → customExercise → systemExercise
    ↓
Get Shared Admin Templates (isTemplate: true, isVisibleToCustomers)
    ├─ SELECT WorkoutProgram WHERE userId!=X, isTemplate=true
    └─ Include: exercises → customExercise → systemExercise
    ↓
Get System Templates (Hardcoded Professional Programs)
    ├─ Define ~10 professional templates (Starting Strength, PPL, etc.)
    ├─ Load system exercises by name
    ├─ Create exerciseDataMap: Map<exerciseName, SystemExercise>
    └─ Enrich exercises with imageUrl from systemExercise
    ↓
Combine All Templates
    └─ Return: [...personalTemplates, ...sharedTemplates, ...systemTemplates]
```

### Flow 2: Exercise Selection and Image Population

#### For System Templates (Hardcoded Templates):

```javascript
// Step 1: Load system exercises
const commonExercises = await prisma.systemExercise.findMany({
  where: { name: { in: ['Barbell Bench Press', 'Deadlift', ...] } }
});

// Step 2: Create lookup map
const exerciseDataMap = new Map();
commonExercises.forEach(ex => {
  exerciseDataMap.set(ex.name, ex);  // Maps name → {id, imageUrl, ...}
});

// Step 3: Define template with exercise names
const templates = [{
  id: 'template-starting-strength-a',
  name: 'Starting Strength - Økt A',
  exercises: [
    { name: 'Barbell Squat', sets: [...] },
    { name: 'Barbell Bench Press', sets: [...] },
    { name: 'Deadlift', sets: [...] }
  ]
}];

// Step 4: Enrich with imageUrl
const validTemplates = templates
  .filter(template => template.exercises.every(ex => ex.exerciseId))
  .map(template => ({
    ...template,
    exercises: template.exercises.map(ex => ({
      ...ex,
      imageUrl: exerciseDataMap.get(ex.name)?.imageUrl  // ← POPULATED HERE
    }))
  }));
```

#### For Personal/Shared Templates (User-Created):

```javascript
const formattedPersonalTemplates = personalTemplates.map(template => ({
  id: template.id,
  name: template.name,
  exercises: template.exercises.map(ex => {
    // ex.customExercise → CustomExercise model
    // ex.customExercise.systemExercise → SystemExercise model
    return {
      exerciseId: ex.customExercise?.systemExercise?.id,
      customExerciseId: ex.customExerciseId,
      name: ex.customExercise?.name,
      imageUrl: ex.customExercise?.systemExercise?.imageUrl,  // ← FROM SYSTEM
      sets: setsArray
    };
  })
}));
```

### Flow 3: Image URL Population Paths

```
Template Exercise
    ↓
Case 1: System Template (Hardcoded)
    └─ SystemExercise.imageUrl (from seed-workout-exercises.ts)
    
Case 2: Personal/Shared Template (User-Created)
    ├─ CustomExercise.imageUrl (user's own image) OR
    ├─ CustomExercise.systemExerciseId → SystemExercise.imageUrl OR
    └─ CustomExercise.media[] (newer ExerciseMedia records)
```

---

## 3. IMAGE URL POPULATION PROCESS

### Step 1: System Exercises Are Seeded

**File**: `/backend/scripts/seed-workout-exercises.ts`

```typescript
const exercises = [
  {
    name: 'Barbell Bench Press',
    type: ExerciseType.STRENGTH,
    primaryMuscles: [MuscleGroup.CHEST],
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    // ... other fields
  },
  // ... 50+ more exercises with imageUrl URLs from Unsplash
];

async function seedExercises() {
  await prisma.systemExercise.deleteMany({});
  for (const exercise of exercises) {
    await prisma.systemExercise.create({ data: exercise });
  }
}
```

**Result**: All SystemExercise records have imageUrl populated with Unsplash URLs.

### Step 2: Templates Reference System Exercises

**File**: `/backend/src/controllers/workout.controller.ts` (getWorkoutTemplates, Line 422)

```typescript
// When building system templates:
const commonExercises = await prisma.systemExercise.findMany({
  where: { name: { in: ['Barbell Bench Press', 'Deadlift', ...] } }
});

// Creates map with imageUrl included
const exerciseDataMap = new Map();
commonExercises.forEach(ex => {
  exerciseDataMap.set(ex.name, ex);  // Contains imageUrl
});

// Enriches template exercises
const validTemplates = templates.map(template => ({
  exercises: template.exercises.map(ex => ({
    imageUrl: exerciseDataMap.get(ex.name)?.imageUrl  // Gets imageUrl here
  }))
}));
```

### Step 3: Frontend Receives and Displays Images

**File**: `/frontend/src/screens/WorkoutScreen.tsx`

```typescript
// Type definitions
interface WorkoutProgramExercise {
  name: string;
  imageUrl?: string;
  sets: SetConfiguration[];
}

// Display in UI
{exercise.imageUrl && (
  <Image
    source={{ uri: exercise.imageUrl }}
    style={{ width: 200, height: 200 }}
  />
)}
```

---

## 4. TEMPLATE CREATION FLOW

### How Templates Are Created

#### A. System Templates (Hardcoded in Controller)
- Defined directly in `getWorkoutTemplates()` method
- ~10 professional programs (Starting Strength, PPL, Arnold Split, etc.)
- Automatically enriched with imageUrl from systemExerciseDataMap
- Read-only by customers, can be copied

#### B. Personal Templates (User-Created)
1. User creates WorkoutProgram with `isTemplate: true`
2. User adds exercises via WorkoutProgramExercise records
3. Each exercise references a CustomExercise
4. CustomExercise can reference a SystemExercise
5. When retrieved, imageUrl comes from: CustomExercise.imageUrl OR CustomExercise.systemExercise.imageUrl

#### C. Admin/Trainer-Created Templates
- Same as personal but with isTemplate: true
- Can be made visible to customers via toggleTemplateVisibility()
- Stored in WorkoutProgram with isVisibleToCustomers flag

---

## 5. CURRENT IMPLEMENTATION DETAILS

### System Templates Defined
Located in `/backend/src/controllers/workout.controller.ts` (lines 539-1919):

1. **Starting Strength - Økt A** - Beginner, 3x5 strength
2. **Starting Strength - Økt B** - Beginner, compound focus
3. **StrongLifts 5x5 - Økt A** - Beginner, 5x5 progression
4. **StrongLifts 5x5 - Økt B** - Beginner, 5x5 progression
5. **PPL - Push Day** - Intermediate, 6-day split
6. **PPL - Pull Day** - Intermediate, 6-day split
7. **PPL - Leg Day** - Intermediate, 6-day split
8. **Arnold Split - Chest/Back** - Advanced
9. **Arnold Split - Shoulders/Legs** - Advanced
10. **HIIT/Conditioning** - Cardio focused
11. **Core/Abs** - Isolation

### Exercise Reference Mechanism

```typescript
// Template defines exercises by NAME
exercises: [
  { name: 'Barbell Squat', sets: [...] },
  { name: 'Deadlift', sets: [...] }
]

// Controller matches NAME to SystemExercise
exerciseDataMap.get('Barbell Squat')
// Returns: {
//   id: 'uuid',
//   name: 'Barbell Squat',
//   imageUrl: 'https://...',
//   ...
// }

// Template is enriched
exercises: [
  {
    exerciseId: 'uuid',
    name: 'Barbell Squat',
    imageUrl: 'https://...',
    sets: [...]
  }
]
```

---

## 6. IMAGE URL SOURCES

### Current Sources:
- **Unsplash URLs**: Static URLs in seed-workout-exercises.ts
  - Example: `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800`
  - All system exercises use same generic Unsplash photo (placeholder)

### Potential Issues:
- **Not Unique**: Most exercises use same placeholder Unsplash image
- **External Dependency**: Relies on Unsplash CDN availability
- **No Backup**: If URL changes, no fallback

---

## 7. COMPLETE DATA FLOW DIAGRAM

```
DATABASE LAYER
├── SystemExercise
│   ├── name: "Barbell Bench Press"
│   ├── imageUrl: "https://images.unsplash.com/..."
│   └── id: "ex-123"
│
├── WorkoutProgram (Template)
│   ├── id: "prog-456"
│   ├── name: "My Strength Program"
│   ├── isTemplate: true
│   └── exercises: [...]
│
└── WorkoutProgramExercise
    ├── programId: "prog-456"
    ├── customExerciseId: "cex-789"
    └── (joins to CustomExercise)

BACKEND CONTROLLER (getWorkoutTemplates)
├── Load SystemExercise records
│   └── Create exerciseDataMap {name → exercise with imageUrl}
├── Load personal templates from WorkoutProgram
│   ├── Include exercises → customExercise → systemExercise
│   └── Extract imageUrl from systemExercise.imageUrl
├── Load shared templates (admin-created)
│   └── Same as personal
└── Define system templates (hardcoded)
    ├── For each exercise in template
    ├── Look up in exerciseDataMap
    └── Attach imageUrl: exerciseDataMap.get(name).imageUrl

API RESPONSE
└── {
      templates: [
        {
          name: "Starting Strength - A",
          exercises: [
            {
              name: "Barbell Squat",
              imageUrl: "https://...",
              sets: [...]
            }
          ]
        }
      ]
    }

FRONTEND
└── Display Exercise Card
    ├── Show Image: <Image source={{uri: exercise.imageUrl}} />
    ├── Show Name: exercise.name
    └── Show Sets: exercise.sets
```

---

## 8. KEY FINDINGS

### How Images Are Currently Added to Templates:

1. **For System Templates**: 
   - Images come from SystemExercise records loaded from database
   - All system exercises are seeded with imageUrl from Unsplash
   - Images are attached when template is enriched in getWorkoutTemplates()

2. **For Personal/Admin Templates**:
   - When user creates custom exercise, they can upload imageUrl
   - Or reference system exercise (inherits imageUrl)
   - When template is retrieved, imageUrl comes from:
     - CustomExercise.imageUrl (if set) OR
     - CustomExercise.systemExercise.imageUrl (inherited)

3. **The Issue You Mentioned**:
   - Exercises may have no imageUrl if:
     - CustomExercise.imageUrl is null AND
     - CustomExercise.systemExerciseId is null AND
     - No ExerciseMedia records exist

### Solution Paths:

1. **Ensure System Exercises Have Images**:
   - Verify all SystemExercise records have imageUrl
   - Re-run seed if needed: `npm run seed:exercises`

2. **Update Custom Exercises Without Images**:
   - Add imageUrl when creating custom exercises
   - Or link to system exercise via systemExerciseId

3. **Add Image to Template on Retrieval**:
   - In getWorkoutTemplates(), add fallback:
   ```typescript
   imageUrl: ex.imageUrl 
     || ex.customExercise?.imageUrl 
     || ex.customExercise?.systemExercise?.imageUrl
     || 'default-placeholder-url'
   ```

4. **Use ExerciseMedia Model**:
   - Create ExerciseMedia records for multiple images per exercise
   - Media will be included in response and displayed in UI

---

## 9. FILES INVOLVED

### Backend
- `/backend/prisma/schema.prisma` - Database schema (lines 469-727 for workout models)
- `/backend/src/controllers/workout.controller.ts` - getWorkoutTemplates() implementation
- `/backend/scripts/seed-workout-exercises.ts` - System exercise seeding

### Frontend  
- `/frontend/src/types/workout.ts` - TypeScript interfaces
- `/frontend/src/screens/WorkoutScreen.tsx` - Display and consumption of imageUrl

### Related Seeding
- `/backend/scripts/seed-membership-data.ts` - Other seed data

---

## 10. QUICK REFERENCE

**To add images to a template exercise:**

1. Ensure SystemExercise has imageUrl:
   ```typescript
   await prisma.systemExercise.update({
     where: { id: exerciseId },
     data: { imageUrl: 'https://your-image-url' }
   });
   ```

2. Or add to CustomExercise:
   ```typescript
   await prisma.customExercise.update({
     where: { id: exerciseId },
     data: { imageUrl: 'https://your-image-url' }
   });
   ```

3. Or create ExerciseMedia:
   ```typescript
   await prisma.exerciseMedia.create({
     data: {
       systemExerciseId: exerciseId,
       url: 'https://your-image-url',
       mediaType: 'IMAGE'
     }
   });
   ```

---

## Summary

The image system follows this flow:
- **SystemExercise** records are seeded with imageUrl from Unsplash
- **Templates** (WorkoutProgram) contain exercises (WorkoutProgramExercise)
- **Exercises** reference CustomExercise, which can reference SystemExercise
- **getWorkoutTemplates()** enriches exercises with imageUrl from SystemExercise
- **Frontend** displays imageUrl in exercise cards
- **Issues** arise when exercises have no imageUrl (null CustomExercise.imageUrl and no systemExerciseId)

The best fix is to ensure all exercises used in templates have either:
1. A valid CustomExercise.imageUrl, OR
2. A systemExerciseId pointing to a SystemExercise with imageUrl, OR
3. ExerciseMedia records with image URLs
