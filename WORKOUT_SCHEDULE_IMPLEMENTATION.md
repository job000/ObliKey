# Workout Program Scheduling Implementation

This document provides the complete implementation for adding day-of-week scheduling to workout programs.

## Overview

Users can now select which days of the week to schedule each program (Mandag-Søndag). Programs show "Når som helst" (anytime) when no days are selected.

## Backend

The backend is already complete with these endpoints:
- `GET /api/workouts/schedules` - Get user's workout schedules
- `POST /api/workouts/schedules` - Create a schedule
- `DELETE /api/workouts/schedules/:id` - Delete a schedule

The `WorkoutSchedule` model in Prisma already exists with `dayOfWeek` field (0-6 for Sunday-Saturday).

## Frontend Changes

### File: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/WorkoutScreen.tsx`

### 1. Add WorkoutSchedule Interface (after line 90, after ActiveExercise interface)

```typescript
interface WorkoutSchedule {
  id: string;
  programId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime?: string;
  isActive: boolean;
}
```

### 2. Update WorkoutProgram Interface (line ~92)

Add the `schedules` field:

```typescript
interface WorkoutProgram {
  id: string;
  name: string;
  description?: string;
  exercises: any[];
  isActive?: boolean;
  schedules?: WorkoutSchedule[];  // <-- ADD THIS LINE
  _count?: {
    sessions: number;
  };
}
```

### 3. Add WEEKDAYS Constant (after MUSCLE_GROUPS constant, around line 115)

```typescript
const WEEKDAYS = [
  { key: 1, label: 'Man', fullLabel: 'Mandag' },
  { key: 2, label: 'Tir', fullLabel: 'Tirsdag' },
  { key: 3, label: 'Ons', fullLabel: 'Onsdag' },
  { key: 4, label: 'Tor', fullLabel: 'Torsdag' },
  { key: 5, label: 'Fre', fullLabel: 'Fredag' },
  { key: 6, label: 'Lør', fullLabel: 'Lørdag' },
  { key: 0, label: 'Søn', fullLabel: 'Søndag' },
];
```

### 4. Add State Variable (after programExercises state, around line 180)

```typescript
const [selectedDays, setSelectedDays] = useState<number[]>([]);
```

### 5. Add Helper Function (before the render return, around line 460)

```typescript
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
```

### 6. Update saveProgram Function (around line 470)

Replace the existing `saveProgram` function with:

```typescript
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
```

### 7. Add Schedule UI in Program Modal

In the Program Modal (around line 1798), add this section after the description field and before the exercises section:

```tsx
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
```

### 8. Update Program Cards to Show Schedule

Find where programs are rendered in the Programs tab. Add this after the program name/description:

```tsx
<View style={styles.programScheduleRow}>
  <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
  <Text style={styles.programScheduleText}>
    {getScheduleDaysText(program.schedules)}
  </Text>
</View>
```

### 9. Handle Edit Program

Find where editingProgram is set (when user taps edit) and update to load schedules:

```typescript
const editProgram = (program: WorkoutProgram) => {
  setEditingProgram(program);
  setProgramName(program.name);
  setProgramDescription(program.description || '');
  setProgramExercises(program.exercises || []);
  setSelectedDays(program.schedules?.map(s => s.dayOfWeek) || []);
  setShowNewProgram(true);
};
```

### 10. Update Modal Close to Reset State

Wherever `setShowNewProgram(false)` is called, also reset:

```typescript
setShowNewProgram(false);
setSelectedDays([]);
setProgramName('');
setProgramDescription('');
setProgramExercises([]);
setEditingProgram(null);
```

### 11. Add Styles (in the StyleSheet.create at the end)

```typescript
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
```

## Testing

1. Create a new program and select some days (e.g., Mon, Wed, Fri)
2. Save and verify the program card shows "Man, Ons, Fre"
3. Edit the program and verify the days are pre-selected
4. Change the days and save
5. Create a program with no days selected - should show "Når som helst"
6. Delete a program with schedules

## UI Design Notes

- Days are displayed as chips/toggles with Norwegian day names
- Selected days have primary color background
- Unselected days have light background with border
- Program cards show selected days with calendar icon
- "Når som helst" shown when no days are selected (default behavior)
