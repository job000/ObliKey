# Exercise Statistics - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Dependencies (Already Done! ✅)
```bash
npm install react-native-chart-kit react-native-svg
```

### Step 2: Add to WorkoutScreen (5 minutes)

Open `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/WorkoutScreen.tsx`

**A. Add imports at the top:**
```typescript
import { ExerciseStatisticsModal } from '../components/workout/ExerciseStatisticsModal';
import { ExerciseLog } from '../utils/exerciseStats';
```

**B. Add state variables (around line 220):**
```typescript
// Exercise Statistics Modal
const [showExerciseStats, setShowExerciseStats] = useState(false);
const [selectedExerciseForStats, setSelectedExerciseForStats] = useState<{
  id: string;
  name: string;
} | null>(null);
const [exerciseStatsLogs, setExerciseStatsLogs] = useState<ExerciseLog[]>([]);
const [statsLoading, setStatsLoading] = useState(false);
```

**C. Add handler functions (around line 360):**
```typescript
const openExerciseStats = async (exerciseId: string, exerciseName: string) => {
  try {
    setSelectedExerciseForStats({ id: exerciseId, name: exerciseName });
    setShowExerciseStats(true);
    setStatsLoading(true);

    const response = await api.getExerciseProgress(exerciseId);
    if (response.success) {
      setExerciseStatsLogs(response.data || []);
    }
  } catch (error) {
    console.error('Failed to load exercise stats:', error);
    Alert.alert('Error', 'Failed to load exercise statistics');
  } finally {
    setStatsLoading(false);
  }
};

const closeExerciseStats = () => {
  setShowExerciseStats(false);
  setSelectedExerciseForStats(null);
  setExerciseStatsLogs([]);
};
```

**D. Add modal before closing `</SafeAreaView>` at the bottom:**
```typescript
{/* Exercise Statistics Modal */}
<ExerciseStatisticsModal
  visible={showExerciseStats}
  onClose={closeExerciseStats}
  exerciseId={selectedExerciseForStats?.id || ''}
  exerciseName={selectedExerciseForStats?.name || ''}
  exerciseLogs={exerciseStatsLogs}
  loading={statsLoading}
/>
```

### Step 3: Add Stats Button to Exercise Items

Find where you render custom exercises (search for `customExercises.map` or similar).

Add a stats button next to each exercise:

```typescript
<TouchableOpacity
  onPress={() => openExerciseStats(exercise.id, exercise.name)}
  style={styles.statsButton}
>
  <Ionicons name="bar-chart" size={20} color={COLORS.primary} />
</TouchableOpacity>
```

And add this style:
```typescript
statsButton: {
  padding: 8,
  borderRadius: 8,
  backgroundColor: COLORS.primary + '20',
},
```

## 🎉 Done!

Rebuild your app and tap the stats icon on any exercise to see:
- Weight progression charts
- Volume progression charts
- Personal records
- Last 10 sessions
- Smart insights
- Growth metrics

## 📚 Full Documentation

For complete details, see:
- `/frontend/EXERCISE_STATISTICS_README.md` - Full documentation
- `/frontend/EXERCISE_STATS_IMPLEMENTATION.md` - Implementation summary
- `/frontend/EXERCISE_STATS_VISUAL_GUIDE.md` - Visual layouts
- `/frontend/src/screens/WorkoutScreen.integration.tsx` - Integration code snippets
- `/frontend/src/screens/StatisticsTab.example.tsx` - Full statistics tab example

## 🔍 Where to Add Stats Buttons

You can add stats buttons in multiple places:

### Option 1: Custom Exercises List
When displaying user's custom exercises:
```typescript
{customExercises.map(exercise => (
  <View style={styles.exerciseCard}>
    <Text>{exercise.name}</Text>
    <TouchableOpacity onPress={() => openExerciseStats(exercise.id, exercise.name)}>
      <Ionicons name="bar-chart-outline" size={20} color={COLORS.primary} />
    </TouchableOpacity>
  </View>
))}
```

### Option 2: Program Exercises
When displaying exercises in a program:
```typescript
{program.exercises.map(ex => (
  <View style={styles.exerciseRow}>
    <Text>{ex.name}</Text>
    {ex.customExerciseId && (
      <TouchableOpacity onPress={() => openExerciseStats(ex.customExerciseId, ex.name)}>
        <Ionicons name="stats-chart" size={18} color={COLORS.primary} />
      </TouchableOpacity>
    )}
  </View>
))}
```

### Option 3: Active Workout
During a workout session:
```typescript
{activeWorkout.map(exercise => (
  <View style={styles.exerciseContainer}>
    <Text>{exercise.name}</Text>
    <TouchableOpacity
      onPress={() => openExerciseStats(exercise.exerciseId, exercise.name)}
      style={styles.iconButton}
    >
      <Ionicons name="analytics" size={20} color={COLORS.primary} />
    </TouchableOpacity>
    {/* Sets rendering... */}
  </View>
))}
```

### Option 4: Long Press
Alternative interaction - long press on exercise for stats:
```typescript
<TouchableOpacity
  onPress={() => selectExercise(exercise)}
  onLongPress={() => openExerciseStats(exercise.id, exercise.name)}
>
  <Text>{exercise.name}</Text>
</TouchableOpacity>
```

## 🎨 Customization

### Change Colors
Edit the COLORS object in each component file:
```typescript
const COLORS = {
  primary: '#8B9BDE',    // Your brand color
  success: '#10B981',    // Positive trends
  danger: '#EF4444',     // Negative trends
  // ... etc
};
```

### Modify Insights
Edit `/frontend/src/utils/exerciseStats.ts` → `generateSmartInsights()`:
```typescript
if (growth.weightGainPercent > 20) {
  insights.push('Amazing progress - you doubled your strength!');
}
```

### Adjust Chart Styles
Edit `/frontend/src/components/workout/ProgressChart.tsx`:
```typescript
chartConfig={{
  strokeWidth: 3,        // Line thickness
  propsForDots: {
    r: '5',             // Dot size
  },
  // ... etc
}}
```

## 🐛 Troubleshooting

### Modal doesn't open
1. Check `exerciseId` is valid (not empty string)
2. Console.log the API response
3. Verify backend endpoint is working

### No data shown
1. Check if user has logged any workouts for that exercise
2. Verify `exerciseLogs` array has items
3. Look at Network tab for API response

### Charts not rendering
1. Ensure `react-native-svg` is installed
2. Check data array has at least 1 point
3. Verify values are numbers, not strings

### TypeScript errors
1. Import types: `import { ExerciseLog } from '../utils/exerciseStats'`
2. Check API response matches ExerciseLog structure
3. Add `|| []` fallback for arrays

## 📱 Testing

After implementation, test these scenarios:

1. **No data**: Open stats for exercise with 0 sessions
   - Should show empty state with helpful message

2. **One session**: Log 1 workout
   - Should show minimal data, no trends

3. **Multiple sessions**: Log 5+ workouts with progression
   - Should show charts with trends
   - Should calculate PRs correctly
   - Should show insights

4. **Declining performance**: Log decreasing weights
   - Should show red downward trend
   - Insights should be neutral/encouraging

5. **Mixed sessions**: Various weights and reps
   - Should calculate correct 1RM
   - Volume should be accurate

## 🚀 Next Level Features

After basic integration works, consider:

### Add Statistics Tab
Use `StatisticsTab.example.tsx` as template:
```typescript
// Add to TabType
type TabType = 'home' | 'workout' | 'exercises' | 'programs' | 'history' | 'statistics';

// Add tab button
<TouchableOpacity onPress={() => setActiveTab('statistics')}>
  <Ionicons name="analytics" size={24} />
  <Text>Stats</Text>
</TouchableOpacity>

// Add content (use StatisticsTab.example as reference)
```

### Add Muscle Group Analytics
```typescript
import { MuscleGroupAnalytics } from '../components/workout/MuscleGroupAnalytics';

<MuscleGroupAnalytics
  exerciseLogs={transformedExerciseLogs}
  timeRange="month"
/>
```

## 💡 Pro Tips

1. **Performance**: API only fetches when modal opens (not on screen load)
2. **UX**: Show loading spinner while fetching data
3. **Error handling**: Always wrap API calls in try-catch
4. **Empty states**: Encourage users to log workouts
5. **Accessibility**: Ensure buttons are 44x44 points minimum

## 📧 Support

If you encounter issues:
1. Check console for errors
2. Review the full documentation files
3. Compare your code to the integration examples
4. Test API endpoints directly

All components are production-ready and fully typed!
