-- AlterTable
ALTER TABLE "pt_sessions" ADD COLUMN     "programId" TEXT;

-- CreateTable
CREATE TABLE "session_results" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "trainerFeedback" TEXT,
    "clientFeedback" TEXT,
    "rating" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercises" (
    "id" TEXT NOT NULL,
    "sessionResultId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "exerciseId" TEXT,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_results_sessionId_key" ON "session_results"("sessionId");

-- AddForeignKey
ALTER TABLE "pt_sessions" ADD CONSTRAINT "pt_sessions_programId_fkey" FOREIGN KEY ("programId") REFERENCES "training_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pt_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_sessionResultId_fkey" FOREIGN KEY ("sessionResultId") REFERENCES "session_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
