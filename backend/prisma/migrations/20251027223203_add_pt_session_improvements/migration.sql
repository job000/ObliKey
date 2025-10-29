-- Add new PT session status values
ALTER TYPE "PTSessionStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "PTSessionStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Add new columns to pt_sessions
ALTER TABLE "pt_sessions" ADD COLUMN IF NOT EXISTS "customerNotes" TEXT;
ALTER TABLE "pt_sessions" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "pt_sessions" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "pt_sessions" ADD COLUMN IF NOT EXISTS "calendarEventId" TEXT;
ALTER TABLE "pt_sessions" ADD COLUMN IF NOT EXISTS "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- Create NotificationType enum
DO $$ BEGIN
 CREATE TYPE "NotificationType" AS ENUM ('PT_SESSION_CREATED', 'PT_SESSION_UPDATED', 'PT_SESSION_CANCELLED', 'PT_SESSION_APPROVED', 'PT_SESSION_REJECTED', 'PT_SESSION_REMINDER', 'PT_SESSION_COMPLETED', 'PT_SESSION_FEEDBACK', 'SYSTEM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create PTSessionExercise table
CREATE TABLE IF NOT EXISTS "pt_session_exercises" (
    "id" TEXT NOT NULL,
    "ptSessionId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "exerciseName" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "duration" INTEGER,
    "weight" DOUBLE PRECISION,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pt_session_exercises_pkey" PRIMARY KEY ("id")
);

-- Create Notification table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ptSessionId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Create NotificationPreferences table
CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ptSessionReminder" BOOLEAN NOT NULL DEFAULT true,
    "reminderMinutes" INTEGER NOT NULL DEFAULT 60,
    "sessionUpdates" BOOLEAN NOT NULL DEFAULT true,
    "sessionApprovals" BOOLEAN NOT NULL DEFAULT true,
    "sessionCancellations" BOOLEAN NOT NULL DEFAULT true,
    "feedbackNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for notification preferences
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- Add foreign keys for PTSessionExercise
DO $$ BEGIN
 ALTER TABLE "pt_session_exercises" ADD CONSTRAINT "pt_session_exercises_ptSessionId_fkey" FOREIGN KEY ("ptSessionId") REFERENCES "pt_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pt_session_exercises" ADD CONSTRAINT "pt_session_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign keys for Notification
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ptSessionId_fkey" FOREIGN KEY ("ptSessionId") REFERENCES "pt_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign keys for NotificationPreferences
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
