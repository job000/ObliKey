export type PTSessionStatus =
  | 'PENDING_APPROVAL'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'REJECTED';

export interface PTSessionExercise {
  id: string;
  ptSessionId: string;
  exerciseId?: string;
  exerciseName: string;
  sets?: number;
  reps?: number;
  duration?: number;
  weight?: number;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PTSession {
  id: string;
  tenantId: string;
  trainerId: string;
  customerId: string;
  programId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: PTSessionStatus;
  price?: number;
  notes?: string;
  customerNotes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  calendarEventId?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  plannedExercises?: PTSessionExercise[];
  sessionResult?: SessionResult;
}

export interface SessionResult {
  id: string;
  ptSessionId: string;
  notes?: string;
  clientFeedback?: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
  exercises?: SessionExercise[];
}

export interface SessionExercise {
  id: string;
  sessionResultId: string;
  exerciseId?: string;
  exerciseName: string;
  sets?: number;
  reps?: number;
  duration?: number;
  weight?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePTSessionData {
  customerId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  price?: number;
  notes?: string;
  plannedExercises?: Omit<PTSessionExercise, 'id' | 'ptSessionId' | 'createdAt' | 'updatedAt'>[];
}

export interface UpdatePTSessionData {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  price?: number;
  notes?: string;
  customerNotes?: string;
  plannedExercises?: Omit<PTSessionExercise, 'id' | 'ptSessionId' | 'createdAt' | 'updatedAt'>[];
}
