// Add after ActiveExercise interface (line 90)
interface WorkoutSchedule {
  id: string;
  programId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime?: string;
  isActive: boolean;
}

// WEEKDAYS constant to add after MUSCLE_GROUPS
const WEEKDAYS = [
  { key: 1, label: 'Man', fullLabel: 'Mandag' },
  { key: 2, label: 'Tir', fullLabel: 'Tirsdag' },
  { key: 3, label: 'Ons', fullLabel: 'Onsdag' },
  { key: 4, label: 'Tor', fullLabel: 'Torsdag' },
  { key: 5, label: 'Fre', fullLabel: 'Fredag' },
  { key: 6, label: 'Lør', fullLabel: 'Lørdag' },
  { key: 0, label: 'Søn', fullLabel: 'Søndag' },
];
