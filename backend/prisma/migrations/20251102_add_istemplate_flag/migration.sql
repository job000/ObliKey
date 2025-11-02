-- Add isTemplate flag to workout_programs
ALTER TABLE "workout_programs" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
