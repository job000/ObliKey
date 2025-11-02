// Exercise Media Types
export type ExerciseMediaType = 'IMAGE' | 'VIDEO';

export interface ExerciseMedia {
  id: string;
  url: string;
  mediaType: ExerciseMediaType;
  title?: string;
  description?: string;
  sortOrder: number;
  systemExerciseId?: string;
  customExerciseId?: string;
  createdAt: string;
  updatedAt: string;
  isLegacy?: boolean; // Legacy media from imageUrl/videoUrl fields (cannot be deleted)
}

export interface SystemExercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  type: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  difficulty: string;
  imageUrl?: string;
  videoUrl?: string;
  tips?: string;
  warnings?: string;
  media?: ExerciseMedia[];
}

export interface CustomExercise {
  id: string;
  tenantId: string;
  userId: string;
  systemExerciseId?: string;
  name: string;
  description?: string;
  instructions?: string;
  type: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  imageUrl?: string;
  videoUrl?: string;
  notes?: string;
  media?: ExerciseMedia[];
}
