# Exercise Statistics & Analytics System

A comprehensive data analyst-level visualization system for tracking workout progress, muscle group balance, and exercise performance.

## Features Implemented

### 1. Exercise Detail Modal/Screen
- **Weight Progression Chart**: Line chart showing max weight over time with trend indicators
- **Volume Progression Chart**: Line chart displaying total volume (weight × reps) progression
- **Personal Records (PRs)**: Chronological list of all personal bests with date, weight, reps, and estimated 1RM
- **Last 10 Sessions Table**: Detailed breakdown of recent workouts with sets, reps, weight, and total volume
- **Trend Indicators**: Visual arrows showing improvement (↑), decline (↓), or stable (→) performance
- **Growth Metrics**:
  - Total kg gained
  - Percentage improvement
  - Volume growth
  - Session count
- **1RM Calculator**: Automatic calculation based on best sets using Epley formula

### 2. Muscle Group Analytics
- **Volume Distribution**: Visual breakdown of training volume per muscle group
- **Progress Bars**: Color-coded progress bars showing relative volume
- **Balance Indicators**: Smart insights detecting muscle imbalances
- **Weekly/Monthly Comparisons**: Time-based filtering (week, month, all-time)
- **Session & Exercise Counts**: Track how many sessions and exercises per muscle group
- **Muscle Balance Insights**:
  - Chest/back ratio warnings
  - Leg/upper body balance checks
  - Dominant muscle group alerts

### 3. Smart Insights
Auto-generated insights based on your data:
- "Your squat improved 15kg this month!"
- "Chest volume is 20% higher than last month"
- "You PR'd on 3 exercises this week"
- "Volume is balanced - keep up the good work!"
- Consistency tracking
- 1RM milestone celebrations

### 4. Visual Design
- **Charts**: React Native Chart Kit with smooth bezier curves
- **Clean, Minimal Design**: Modern card-based UI
- **Color-Coded Trends**: Green for improvement, red for decline, gray for stable
- **Easy-to-Scan Metrics**: Large numbers with context
- **Smooth Animations**: Modal presentations and transitions
- **Responsive**: Adapts to different screen sizes

## Files Created

### Core Components
```
frontend/src/
├── components/workout/
│   ├── ExerciseStatisticsModal.tsx    # Main statistics modal
│   ├── ProgressChart.tsx               # Reusable chart components
│   └── MuscleGroupAnalytics.tsx        # Muscle group analysis
├── utils/
│   └── exerciseStats.ts                # Statistical calculations & utilities
└── screens/
    ├── StatisticsTab.example.tsx       # Example statistics tab
    └── WorkoutScreen.integration.tsx   # Integration guide
```

### Component Details

#### 1. `ExerciseStatisticsModal.tsx`
Main modal component with three tabs:
- **Progress Tab**: Charts, growth metrics, and smart insights
- **Records Tab**: Chronological list of personal records
- **History Tab**: Last 10 sessions with detailed set breakdowns

**Props**:
```typescript
{
  visible: boolean;              // Modal visibility
  onClose: () => void;           // Close handler
  exerciseId: string;            // Custom exercise ID
  exerciseName: string;          // Display name
  exerciseLogs: ExerciseLog[];   // Historical workout data
  loading?: boolean;             // Loading state
}
```

#### 2. `ProgressChart.tsx`
Reusable chart components:
- `ProgressLineChart`: For weight/volume progression over time
- `ProgressBarChart`: For volume distribution comparisons

**Props**:
```typescript
// ProgressLineChart
{
  data: ProgressDataPoint[];     // Chart data points
  title: string;                 // Chart title
  color?: string;                // Line color
  suffix?: string;               // Value suffix (e.g., " kg")
}

// ProgressBarChart
{
  data: { label: string; value: number }[];
  title: string;
  color?: string;
}
```

#### 3. `MuscleGroupAnalytics.tsx`
Comprehensive muscle group analysis component.

**Props**:
```typescript
{
  exerciseLogs: {
    [exerciseId: string]: {
      name: string;
      logs: ExerciseLog[];
    }
  };
  timeRange?: 'week' | 'month' | 'all';  // Default: 'month'
}
```

#### 4. `exerciseStats.ts`
Utility functions for calculations:

**Key Functions**:
```typescript
// 1RM calculation (Epley formula)
calculateOneRepMax(weight: number, reps: number): number

// Set volume calculation
calculateSetVolume(set: SetLog): number

// Get progression data
getWeightProgression(logs: ExerciseLog[]): ProgressDataPoint[]
getVolumeProgression(logs: ExerciseLog[]): ProgressDataPoint[]

// Personal records
getPersonalRecords(logs: ExerciseLog[]): PersonalRecord[]

// Trend analysis
calculateTrend(dataPoints: ProgressDataPoint[], recentPeriod?: number): TrendIndicator

// Growth metrics
calculateGrowthMetrics(logs: ExerciseLog[]): GrowthMetrics | null

// Smart insights
generateSmartInsights(logs: ExerciseLog[], exerciseName: string): string[]

// Muscle group identification
identifyMuscleGroup(exerciseName: string): string

// Recent sessions
getRecentSessionsData(logs: ExerciseLog[], limit?: number): SessionData[]
```

## Installation

### 1. Install Dependencies
```bash
cd frontend
npm install react-native-chart-kit react-native-svg
```

### 2. Backend API (Already Exists)
The backend already has the necessary endpoints:
- `GET /workouts/exercises/:customExerciseId/progress` - Get exercise progression data
- `GET /workouts/stats` - Get overall workout statistics
- `GET /workouts/sessions` - Get workout sessions with exercise logs

## Integration Guide

### Option 1: Add to WorkoutScreen (Recommended)

#### Step 1: Add Imports
```typescript
import { ExerciseStatisticsModal } from '../components/workout/ExerciseStatisticsModal';
import { MuscleGroupAnalytics } from '../components/workout/MuscleGroupAnalytics';
import { ExerciseLog } from '../utils/exerciseStats';
```

#### Step 2: Add State Variables
```typescript
const [showExerciseStats, setShowExerciseStats] = useState(false);
const [selectedExerciseForStats, setSelectedExerciseForStats] = useState<{
  id: string;
  name: string;
} | null>(null);
const [exerciseStatsLogs, setExerciseStatsLogs] = useState<ExerciseLog[]>([]);
const [statsLoading, setStatsLoading] = useState(false);
```

#### Step 3: Add Handler Functions
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

#### Step 4: Add Stats Button to Exercise Items
Wherever you render custom exercises, add a button:
```typescript
<TouchableOpacity
  onPress={() => openExerciseStats(exercise.id, exercise.name)}
  style={styles.statsButton}
>
  <Ionicons name="bar-chart" size={20} color={COLORS.primary} />
</TouchableOpacity>
```

#### Step 5: Add Modal to Render
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

### Option 2: Add Statistics Tab

See `StatisticsTab.example.tsx` for a complete standalone implementation with:
- Overall statistics cards
- Muscle group analytics
- Top exercises list with stats
- Time range filtering
- Integration with ExerciseStatisticsModal

To add as a tab in WorkoutScreen:

1. Update TabType:
```typescript
type TabType = 'home' | 'workout' | 'exercises' | 'programs' | 'history' | 'statistics';
```

2. Add tab button:
```typescript
<TouchableOpacity
  style={[styles.tab, activeTab === 'statistics' && styles.activeTab]}
  onPress={() => setActiveTab('statistics')}
>
  <Ionicons name="analytics" size={24} color={activeTab === 'statistics' ? COLORS.primary : COLORS.textSecondary} />
  <Text>Stats</Text>
</TouchableOpacity>
```

3. Add tab content (use StatisticsTab.example.tsx as reference)

## Usage Examples

### Example 1: Quick Stats Button
Add a stats icon next to any exercise:
```typescript
<View style={styles.exerciseItem}>
  <Text>{exercise.name}</Text>
  <TouchableOpacity onPress={() => openExerciseStats(exercise.id, exercise.name)}>
    <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} />
  </TouchableOpacity>
</View>
```

### Example 2: Long Press for Stats
```typescript
<TouchableOpacity
  onPress={() => selectExercise(exercise)}
  onLongPress={() => openExerciseStats(exercise.id, exercise.name)}
>
  <Text>{exercise.name}</Text>
</TouchableOpacity>
```

### Example 3: Muscle Group Analytics
```typescript
// Transform your session data
const exerciseLogsMap = sessions.reduce((acc, session) => {
  session.exerciseLogs?.forEach(log => {
    if (!acc[log.customExerciseId]) {
      acc[log.customExerciseId] = {
        name: log.customExercise?.name || 'Unknown',
        logs: []
      };
    }
    acc[log.customExerciseId].logs.push({
      id: log.id,
      customExerciseId: log.customExerciseId,
      completedAt: log.completedAt,
      setLogs: log.setLogs,
      session: {
        startedAt: session.startedAt,
        completedAt: session.completedAt
      }
    });
  });
  return acc;
}, {});

// Render analytics
<MuscleGroupAnalytics
  exerciseLogs={exerciseLogsMap}
  timeRange="month"
/>
```

## Data Flow

```
User taps stats icon
       ↓
openExerciseStats(exerciseId, exerciseName)
       ↓
API: GET /workouts/exercises/:id/progress
       ↓
Backend returns ExerciseLog[] with setLogs
       ↓
ExerciseStatisticsModal receives data
       ↓
Utils calculate:
  - Weight progression
  - Volume progression
  - Personal records
  - Trends
  - Growth metrics
  - Smart insights
       ↓
Charts and tables rendered
```

## Muscle Group Mapping

The system automatically categorizes exercises:

- **Chest**: Bench Press, Chest Press, Push Up, Dumbbell Fly, Cable Fly
- **Back**: Pull Up, Row, Lat Pulldown, Deadlift, Back Extension
- **Legs**: Squat, Leg Press, Lunge, Leg Curl, Leg Extension, Calf Raise
- **Shoulders**: Shoulder Press, Lateral Raise, Front Raise, Reverse Fly
- **Arms**: Bicep Curl, Tricep, Hammer Curl, Preacher Curl
- **Core**: Plank, Crunch, Sit Up, Ab Wheel, Russian Twist

Exercises not matching these patterns are categorized as "other".

## Formulas Used

### 1RM Calculation (Epley Formula)
```
1RM = weight × (1 + reps/30)
```

### Set Volume
```
Volume = weight × reps
```

### Trend Calculation
```
Change = ((recentAvg - previousAvg) / previousAvg) × 100
Direction = up if change > 2%, down if change < -2%, stable otherwise
```

### Growth Percentage
```
Growth % = ((current - initial) / initial) × 100
```

## Customization

### Colors
Update the COLORS object in each component to match your theme:
```typescript
const COLORS = {
  primary: '#8B9BDE',      // Main brand color
  success: '#10B981',      // Positive trends
  danger: '#EF4444',       // Negative trends
  warning: '#F59E0B',      // Warnings/PRs
  // ... etc
};
```

### Chart Styling
Modify chartConfig in ProgressChart.tsx:
```typescript
chartConfig={{
  backgroundColor: COLORS.cardBg,
  backgroundGradientFrom: COLORS.cardBg,
  backgroundGradientTo: COLORS.cardBg,
  color: (opacity = 1) => color,
  strokeWidth: 3,  // Line thickness
  // ... etc
}}
```

### Insights
Add custom insight logic in `exerciseStats.ts` > `generateSmartInsights()`:
```typescript
// Add your own conditions
if (customCondition) {
  insights.push('Your custom insight!');
}
```

## Best Practices

1. **Always show loading state**: Users should see feedback while data loads
2. **Handle empty states**: Show helpful messages when no data exists
3. **Error handling**: Use try-catch and show user-friendly error messages
4. **Performance**: Use useMemo for expensive calculations
5. **Accessibility**: Add proper labels and touch targets
6. **Responsive**: Test on different screen sizes

## Troubleshooting

### Charts not displaying
- Ensure react-native-svg is properly installed
- Check that data array has at least 1 point
- Verify data values are numbers, not strings

### Modal not opening
- Check that exerciseId is valid
- Verify API endpoint is working
- Console.log the response data

### Muscle groups showing as "other"
- Exercise names need to match patterns in MUSCLE_GROUPS
- Add custom mappings in identifyMuscleGroup()

## Future Enhancements

Potential additions:
- Export statistics to PDF/CSV
- Set goals and track progress
- Compare exercises (e.g., squat vs deadlift)
- Body part heat map
- Weekly/monthly summary reports
- Share stats on social media
- Exercise recommendations based on weak points
- Periodization planning
- Deload week detection
- Overtraining warnings

## API Reference

### Backend Endpoints Used

```typescript
// Get exercise progression
GET /workouts/exercises/:customExerciseId/progress?limit=10

Response:
{
  success: true,
  data: [
    {
      id: string,
      customExerciseId: string,
      completedAt: string,
      setLogs: [
        {
          setNumber: number,
          reps: number,
          weight: number,
          weightUnit: string,
          completed: boolean
        }
      ],
      session: {
        startedAt: string,
        completedAt: string
      }
    }
  ]
}
```

## Support

For issues or questions:
1. Check this README
2. Review WorkoutScreen.integration.tsx
3. See StatisticsTab.example.tsx for complete implementation
4. Console.log data at each step to debug

## License

Part of the ObliKey fitness management system.
