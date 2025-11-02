import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class WorkoutController {
  // ============================================
  // SYSTEM EXERCISES (Browse library)
  // ============================================

  async getSystemExercises(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        muscleGroup,
        equipment,
        type,
        difficulty,
        search
      } = req.query;

      const where: any = {};

      if (muscleGroup) {
        where.OR = [
          { primaryMuscles: { has: muscleGroup } },
          { secondaryMuscles: { has: muscleGroup } }
        ];
      }

      if (equipment) {
        where.equipment = { has: equipment };
      }

      if (type) {
        where.type = type;
      }

      if (difficulty) {
        where.difficulty = difficulty;
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const exercises = await prisma.systemExercise.findMany({
        where,
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: exercises,
        count: exercises.length
      });
    } catch (error) {
      console.error('Get system exercises error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente øvelser' });
    }
  }

  async getSystemExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const exercise = await prisma.systemExercise.findUnique({
        where: { id }
      });

      if (!exercise) {
        throw new AppError('Øvelse ikke funnet', 404);
      }

      res.json({
        success: true,
        data: exercise
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get system exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente øvelse' });
      }
    }
  }

  // ============================================
  // CUSTOM EXERCISES (User's personal exercises)
  // ============================================

  async getCustomExercises(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      const exercises = await prisma.customExercise.findMany({
        where: {
          userId,
          tenantId
        },
        include: {
          systemExercise: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: exercises
      });
    } catch (error) {
      console.error('Get custom exercises error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente egne øvelser' });
    }
  }

  async createCustomExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const {
        systemExerciseId,
        name,
        description,
        instructions,
        type,
        equipment,
        primaryMuscles,
        secondaryMuscles,
        imageUrl,
        videoUrl,
        notes
      } = req.body;

      // Validate required fields
      if (!name || !type) {
        throw new AppError('Navn og type er påkrevd', 400);
      }

      const exercise = await prisma.customExercise.create({
        data: {
          userId,
          tenantId,
          systemExerciseId,
          name,
          description,
          instructions,
          type,
          equipment: equipment || [],
          primaryMuscles: primaryMuscles || [],
          secondaryMuscles: secondaryMuscles || [],
          imageUrl,
          videoUrl,
          notes
        },
        include: {
          systemExercise: true
        }
      });

      res.json({
        success: true,
        data: exercise,
        message: 'Øvelse opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create custom exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette øvelse' });
      }
    }
  }

  async updateCustomExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const updateData = req.body;

      // Verify ownership
      const exercise = await prisma.customExercise.findUnique({
        where: { id }
      });

      if (!exercise) {
        throw new AppError('Øvelse ikke funnet', 404);
      }

      if (exercise.userId !== userId) {
        throw new AppError('Ingen tilgang til denne øvelsen', 403);
      }

      const updated = await prisma.customExercise.update({
        where: { id },
        data: updateData,
        include: {
          systemExercise: true
        }
      });

      res.json({
        success: true,
        data: updated,
        message: 'Øvelse oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update custom exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere øvelse' });
      }
    }
  }

  async deleteCustomExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Verify ownership
      const exercise = await prisma.customExercise.findUnique({
        where: { id }
      });

      if (!exercise) {
        throw new AppError('Øvelse ikke funnet', 404);
      }

      if (exercise.userId !== userId) {
        throw new AppError('Ingen tilgang til denne øvelsen', 403);
      }

      await prisma.customExercise.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Øvelse slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete custom exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette øvelse' });
      }
    }
  }

  // ============================================
  // WORKOUT PROGRAMS
  // ============================================

  async getWorkoutPrograms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      const programs = await prisma.workoutProgram.findMany({
        where: {
          userId,
          tenantId
        },
        include: {
          exercises: {
            include: {
              customExercise: {
                include: {
                  systemExercise: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          },
          schedules: true,
          _count: {
            select: {
              exercises: true,
              sessions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Transform programs to include properly formatted exercises
      const formattedPrograms = programs.map(program => ({
        ...program,
        exercises: program.exercises.map(ex => {
          // Try to parse setConfiguration from notes
          let setsArray = [];
          try {
            if (ex.notes) {
              const parsed = JSON.parse(ex.notes);
              if (parsed.setConfiguration && Array.isArray(parsed.setConfiguration)) {
                setsArray = parsed.setConfiguration;
              }
            }
          } catch (e) {
            // If parsing fails, fall back to default behavior
          }

          // If no setConfiguration found, create default sets based on sets count
          if (setsArray.length === 0 && ex.sets) {
            setsArray = Array.from({ length: ex.sets }, (_, i) => ({
              setNumber: i + 1,
              reps: ex.reps ? parseInt(ex.reps) : undefined,
              weight: ex.weight
            }));
          }

          return {
            ...ex,
            exerciseId: ex.customExercise?.systemExercise?.id || ex.customExerciseId,
            name: ex.customExercise?.name || 'Øvelse',
            sets: setsArray
          };
        })
      }));

      res.json({
        success: true,
        data: formattedPrograms
      });
    } catch (error) {
      console.error('Get workout programs error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente treningsprogrammer' });
    }
  }

  async getWorkoutProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const program = await prisma.workoutProgram.findUnique({
        where: { id },
        include: {
          exercises: {
            include: {
              customExercise: {
                include: {
                  systemExercise: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          },
          schedules: true,
          sessions: {
            take: 10,
            orderBy: { startedAt: 'desc' }
          }
        }
      });

      if (!program) {
        throw new AppError('Program ikke funnet', 404);
      }

      if (program.userId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }

      // Transform exercises to include properly formatted sets
      const formattedProgram = {
        ...program,
        exercises: program.exercises.map(ex => {
          // Try to parse setConfiguration from notes
          let setsArray = [];
          try {
            if (ex.notes) {
              const parsed = JSON.parse(ex.notes);
              if (parsed.setConfiguration && Array.isArray(parsed.setConfiguration)) {
                setsArray = parsed.setConfiguration;
              }
            }
          } catch (e) {
            // If parsing fails, fall back to default behavior
          }

          // If no setConfiguration found, create default sets based on sets count
          if (setsArray.length === 0 && ex.sets) {
            setsArray = Array.from({ length: ex.sets }, (_, i) => ({
              setNumber: i + 1,
              reps: ex.reps ? parseInt(ex.reps) : undefined,
              weight: ex.weight
            }));
          }

          return {
            ...ex,
            exerciseId: ex.customExercise?.systemExercise?.id || ex.customExerciseId,
            name: ex.customExercise?.name || 'Øvelse',
            sets: setsArray
          };
        })
      };

      res.json({
        success: true,
        data: formattedProgram
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get workout program error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente program' });
      }
    }
  }

  async getWorkoutTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('🎯 getWorkoutTemplates called');
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      console.log('👤 User ID:', userId, 'Tenant ID:', tenantId);

      // Get user's saved personal templates
      const personalTemplates = await prisma.workoutProgram.findMany({
        where: {
          userId,
          tenantId,
          isTemplate: true
        },
        include: {
          exercises: {
            include: {
              customExercise: {
                include: {
                  systemExercise: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get common exercises from system
      const commonExercises = await prisma.systemExercise.findMany({
        where: {
          name: {
            in: [
              'Barbell Bench Press',
              'Incline Dumbbell Press',
              'Dumbbell Chest Fly',
              'Cable Chest Fly',
              'Decline Bench Press',
              'Barbell Squat',
              'Front Squat',
              'Leg Press',
              'Leg Extension',
              'Leg Curl',
              'Romanian Deadlift',
              'Deadlift',
              'Lat Pulldown',
              'Barbell Rows',
              'Dumbbell Row',
              'Pull-Ups',
              'Barbell Curl',
              'Hammer Curl',
              'Tricep Pushdown',
              'Overhead Tricep Extension',
              'Close-Grip Bench Press',
              'Overhead Press',
              'Dumbbell Lateral Raise',
              'Face Pulls',
              'Plank',
              'Russian Twist',
              'Standing Calf Raise',
              'Seated Calf Raise',
              'Bulgarian Split Squat',
              'Tricep Dips',
              'Push-Ups',
              'Hanging Leg Raise',
              'Arnold Press',
              'T-Bar Row'
            ]
          }
        }
      });

      // Create a map for easy lookup
      const exerciseMap = new Map();
      commonExercises.forEach(ex => exerciseMap.set(ex.name, ex.id));
      console.log('💪 Found', commonExercises.length, 'system exercises');
      console.log('📋 Exercise map size:', exerciseMap.size);

      // Define professional workout templates based on proven programs
      const templates = [
        // 1. STARTING STRENGTH (Beginner - 3 days per week)
        {
          id: 'template-starting-strength-a',
          name: 'Starting Strength - Økt A',
          description: 'Mark Rippetoe sin klassiske nybegynner styrkeprogram. Økt A: Knebøy, benkpress, markløft. Fokus på tunge compound-øvelser med 3x5.',
          category: 'Styrke',
          difficulty: 'Beginner',
          duration: '45-60 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 300
            },
            {
              exerciseId: exerciseMap.get('Barbell Bench Press'),
              name: 'Barbell Bench Press',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 300
            },
            {
              exerciseId: exerciseMap.get('Deadlift'),
              name: 'Deadlift',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 300
            },
          ]
        },
        {
          id: 'template-starting-strength-b',
          name: 'Starting Strength - Økt B',
          description: 'Starting Strength Økt B: Knebøy, overhead press, barbell rows. Veksle mellom Økt A og B hver treningsdag.',
          category: 'Styrke',
          difficulty: 'Beginner',
          duration: '45-60 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 300
            },
            {
              exerciseId: exerciseMap.get('Overhead Press'),
              name: 'Overhead Press',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 300
            },
            {
              exerciseId: exerciseMap.get('Barbell Rows'),
              name: 'Barbell Rows',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 300
            },
          ]
        },

        // 2. STRONGLIFTS 5x5 (Beginner)
        {
          id: 'template-stronglifts-a',
          name: 'StrongLifts 5x5 - Økt A',
          description: 'StrongLifts 5x5 Økt A: Knebøy, benkpress, barbell rows. Klassisk 5x5 styrkeprogram for lineær progresjon. Øk vekten med 2.5kg hver økt.',
          category: 'Styrke',
          difficulty: 'Beginner',
          duration: '45-60 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
                { setNumber: 4, reps: 5, weight: undefined },
                { setNumber: 5, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Barbell Bench Press'),
              name: 'Barbell Bench Press',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
                { setNumber: 4, reps: 5, weight: undefined },
                { setNumber: 5, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Barbell Rows'),
              name: 'Barbell Rows',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
                { setNumber: 4, reps: 5, weight: undefined },
                { setNumber: 5, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
          ]
        },
        {
          id: 'template-stronglifts-b',
          name: 'StrongLifts 5x5 - Økt B',
          description: 'StrongLifts 5x5 Økt B: Knebøy, overhead press, markløft (1x5). Veksle mellom A og B hver treningsdag, 3 ganger per uke.',
          category: 'Styrke',
          difficulty: 'Beginner',
          duration: '45-60 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
                { setNumber: 4, reps: 5, weight: undefined },
                { setNumber: 5, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Overhead Press'),
              name: 'Overhead Press',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
                { setNumber: 4, reps: 5, weight: undefined },
                { setNumber: 5, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Deadlift'),
              name: 'Deadlift',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 240
            },
          ]
        },

        // 3. PPL - PUSH/PULL/LEGS (6-day Intermediate)
        {
          id: 'template-ppl-push',
          name: 'PPL - Push Day (Bryst, Skuldre, Triceps)',
          description: 'Reddit PPL - Push dag. Fokus på bryst, skuldre og triceps. Kjør 6 dager/uke: Push/Pull/Legs/Push/Pull/Legs.',
          category: 'Muskelbygging',
          difficulty: 'Intermediate',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Bench Press'),
              name: 'Barbell Bench Press',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
                { setNumber: 4, reps: 5, weight: undefined },
                { setNumber: 5, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Overhead Press'),
              name: 'Overhead Press',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Incline Dumbbell Press'),
              name: 'Incline Dumbbell Press',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Tricep Pushdown'),
              name: 'Tricep Pushdown',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Overhead Tricep Extension'),
              name: 'Overhead Tricep Extension',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Dumbbell Lateral Raise'),
              name: 'Dumbbell Lateral Raise',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },
        {
          id: 'template-ppl-pull',
          name: 'PPL - Pull Day (Rygg, Biceps)',
          description: 'Reddit PPL - Pull dag. Fokus på rygg og biceps med deadlifts, rows og pull-ups.',
          category: 'Muskelbygging',
          difficulty: 'Intermediate',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Deadlift'),
              name: 'Deadlift',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 240
            },
            {
              exerciseId: exerciseMap.get('Pull-Ups'),
              name: 'Pull-Ups',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Barbell Rows'),
              name: 'Barbell Rows',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Face Pulls'),
              name: 'Face Pulls',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
                { setNumber: 4, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Barbell Curl'),
              name: 'Barbell Curl',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
                { setNumber: 4, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Hammer Curl'),
              name: 'Hammer Curl',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
          ]
        },
        {
          id: 'template-ppl-legs',
          name: 'PPL - Leg Day (Ben)',
          description: 'Reddit PPL - Leg dag. Komplett benøkt med squat, romanian deadlift, leg press og isolasjon.',
          category: 'Muskelbygging',
          difficulty: 'Intermediate',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Romanian Deadlift'),
              name: 'Romanian Deadlift',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Leg Press'),
              name: 'Leg Press',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Leg Curl'),
              name: 'Leg Curl',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Standing Calf Raise'),
              name: 'Standing Calf Raise',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },

        // 4. UPPER/LOWER 4-DAY SPLIT
        {
          id: 'template-upper-lower-upper',
          name: 'Upper/Lower - Upper Day',
          description: 'Upper/Lower 4-dagers split - Overkropp. Balansert overkropps-økt med bryst, rygg, skuldre og armer. Tren Upper/Lower/Hvile/Upper/Lower.',
          category: 'Muskelbygging',
          difficulty: 'Intermediate',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Bench Press'),
              name: 'Barbell Bench Press',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Barbell Rows'),
              name: 'Barbell Rows',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Overhead Press'),
              name: 'Overhead Press',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Pull-Ups'),
              name: 'Pull-Ups',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Barbell Curl'),
              name: 'Barbell Curl',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Tricep Pushdown'),
              name: 'Tricep Pushdown',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },
        {
          id: 'template-upper-lower-lower',
          name: 'Upper/Lower - Lower Day',
          description: 'Upper/Lower 4-dagers split - Underkropp. Komplett benøkt med squat, deadlift og isolasjonsarbeid.',
          category: 'Muskelbygging',
          difficulty: 'Intermediate',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Romanian Deadlift'),
              name: 'Romanian Deadlift',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Leg Press'),
              name: 'Leg Press',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Leg Curl'),
              name: 'Leg Curl',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Standing Calf Raise'),
              name: 'Standing Calf Raise',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },

        // 5. BRO SPLIT (5-day)
        {
          id: 'template-bro-chest',
          name: 'Bro Split - Chest Day',
          description: 'Klassisk Bro Split - Brystdag. Fokus på bryst fra alle vinkler. Dag 1 av 5: Bryst/Rygg/Skuldre/Armer/Ben.',
          category: 'Muskelbygging',
          difficulty: 'Intermediate',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Bench Press'),
              name: 'Barbell Bench Press',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 6, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Incline Dumbbell Press'),
              name: 'Incline Dumbbell Press',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Decline Bench Press'),
              name: 'Decline Bench Press',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Dumbbell Chest Fly'),
              name: 'Dumbbell Chest Fly',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Cable Chest Fly'),
              name: 'Cable Chest Fly',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },
        {
          id: 'template-bro-back',
          name: 'Bro Split - Back Day',
          description: 'Klassisk Bro Split - Ryggdag. Fokus på tykkelse og bredde i ryggen med deadlifts, rows og pull-ups.',
          category: 'Muskelbygging',
          difficulty: 'Intermediate',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Deadlift'),
              name: 'Deadlift',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 6, weight: undefined },
                { setNumber: 3, reps: 6, weight: undefined },
                { setNumber: 4, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Pull-Ups'),
              name: 'Pull-Ups',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 6, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Barbell Rows'),
              name: 'Barbell Rows',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Dumbbell Row'),
              name: 'Dumbbell Row',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Face Pulls'),
              name: 'Face Pulls',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },

        // 6. PHUL (Power Hypertrophy Upper Lower)
        {
          id: 'template-phul-upper-power',
          name: 'PHUL - Upper Power',
          description: 'PHUL Upper Power dag. Fokus på tunge compound-løft for overkroppen med lavt antall repetisjoner (3-5 reps).',
          category: 'Styrke',
          difficulty: 'Advanced',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Bench Press'),
              name: 'Barbell Bench Press',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
                { setNumber: 4, reps: 3, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Barbell Rows'),
              name: 'Barbell Rows',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
                { setNumber: 4, reps: 3, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Overhead Press'),
              name: 'Overhead Press',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Pull-Ups'),
              name: 'Pull-Ups',
              sets: [
                { setNumber: 1, reps: 6, weight: undefined },
                { setNumber: 2, reps: 6, weight: undefined },
                { setNumber: 3, reps: 6, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Barbell Curl'),
              name: 'Barbell Curl',
              sets: [
                { setNumber: 1, reps: 6, weight: undefined },
                { setNumber: 2, reps: 6, weight: undefined },
                { setNumber: 3, reps: 6, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
          ]
        },
        {
          id: 'template-phul-lower-power',
          name: 'PHUL - Lower Power',
          description: 'PHUL Lower Power dag. Fokus på tunge squat og deadlift med lavt antall repetisjoner for maksimal styrke.',
          category: 'Styrke',
          difficulty: 'Advanced',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
                { setNumber: 4, reps: 3, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 240
            },
            {
              exerciseId: exerciseMap.get('Deadlift'),
              name: 'Deadlift',
              sets: [
                { setNumber: 1, reps: 5, weight: undefined },
                { setNumber: 2, reps: 5, weight: undefined },
                { setNumber: 3, reps: 5, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 240
            },
            {
              exerciseId: exerciseMap.get('Leg Press'),
              name: 'Leg Press',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Leg Curl'),
              name: 'Leg Curl',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Standing Calf Raise'),
              name: 'Standing Calf Raise',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },
        {
          id: 'template-phul-upper-hypertrophy',
          name: 'PHUL - Upper Hypertrophy',
          description: 'PHUL Upper Hypertrophy dag. Fokus på muskelbygging med høyere volum og repetisjoner (8-12 reps).',
          category: 'Muskelbygging',
          difficulty: 'Advanced',
          duration: '75-90 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Incline Dumbbell Press'),
              name: 'Incline Dumbbell Press',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
                { setNumber: 4, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Dumbbell Chest Fly'),
              name: 'Dumbbell Chest Fly',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Lat Pulldown'),
              name: 'Lat Pulldown',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
                { setNumber: 4, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Dumbbell Row'),
              name: 'Dumbbell Row',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Dumbbell Lateral Raise'),
              name: 'Dumbbell Lateral Raise',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Hammer Curl'),
              name: 'Hammer Curl',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Tricep Pushdown'),
              name: 'Tricep Pushdown',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },
        {
          id: 'template-phul-lower-hypertrophy',
          name: 'PHUL - Lower Hypertrophy',
          description: 'PHUL Lower Hypertrophy dag. Fokus på benmuskulatur med høyt volum for maksimal muskelvekst.',
          category: 'Muskelbygging',
          difficulty: 'Advanced',
          duration: '75-90 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Front Squat'),
              name: 'Front Squat',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
                { setNumber: 4, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Romanian Deadlift'),
              name: 'Romanian Deadlift',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
                { setNumber: 4, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Leg Press'),
              name: 'Leg Press',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Leg Curl'),
              name: 'Leg Curl',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Leg Extension'),
              name: 'Leg Extension',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Seated Calf Raise'),
              name: 'Seated Calf Raise',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },

        // 7. GERMAN VOLUME TRAINING (10x10)
        {
          id: 'template-gvt-chest-back',
          name: 'German Volume Training - Bryst & Rygg',
          description: 'GVT (10x10) - Bryst og Rygg. Ekstremt høyt volum med 10 sett x 10 reps. Avansert program for erfarne utøvere. 60 sek pause.',
          category: 'Muskelbygging',
          difficulty: 'Advanced',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Bench Press'),
              name: 'Barbell Bench Press',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
                { setNumber: 4, reps: 10, weight: undefined },
                { setNumber: 5, reps: 10, weight: undefined },
                { setNumber: 6, reps: 10, weight: undefined },
                { setNumber: 7, reps: 10, weight: undefined },
                { setNumber: 8, reps: 10, weight: undefined },
                { setNumber: 9, reps: 10, weight: undefined },
                { setNumber: 10, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Barbell Rows'),
              name: 'Barbell Rows',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
                { setNumber: 4, reps: 10, weight: undefined },
                { setNumber: 5, reps: 10, weight: undefined },
                { setNumber: 6, reps: 10, weight: undefined },
                { setNumber: 7, reps: 10, weight: undefined },
                { setNumber: 8, reps: 10, weight: undefined },
                { setNumber: 9, reps: 10, weight: undefined },
                { setNumber: 10, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Incline Dumbbell Press'),
              name: 'Incline Dumbbell Press',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Dumbbell Row'),
              name: 'Dumbbell Row',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },
        {
          id: 'template-gvt-legs',
          name: 'German Volume Training - Ben',
          description: 'GVT (10x10) - Ben. 10 sett x 10 reps på squat og leg curl. Ekstremt krevende benøkt for maksimal muskelvekst.',
          category: 'Muskelbygging',
          difficulty: 'Advanced',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
                { setNumber: 4, reps: 10, weight: undefined },
                { setNumber: 5, reps: 10, weight: undefined },
                { setNumber: 6, reps: 10, weight: undefined },
                { setNumber: 7, reps: 10, weight: undefined },
                { setNumber: 8, reps: 10, weight: undefined },
                { setNumber: 9, reps: 10, weight: undefined },
                { setNumber: 10, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Leg Curl'),
              name: 'Leg Curl',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
                { setNumber: 4, reps: 10, weight: undefined },
                { setNumber: 5, reps: 10, weight: undefined },
                { setNumber: 6, reps: 10, weight: undefined },
                { setNumber: 7, reps: 10, weight: undefined },
                { setNumber: 8, reps: 10, weight: undefined },
                { setNumber: 9, reps: 10, weight: undefined },
                { setNumber: 10, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Romanian Deadlift'),
              name: 'Romanian Deadlift',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Standing Calf Raise'),
              name: 'Standing Calf Raise',
              sets: [
                { setNumber: 1, reps: 20, weight: undefined },
                { setNumber: 2, reps: 20, weight: undefined },
                { setNumber: 3, reps: 20, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },

        // 8. FULL BODY 3-DAY
        {
          id: 'template-fullbody-3day',
          name: 'Full Body 3-Day',
          description: 'Fullkropps-treningsprogram 3 ganger per uke. Perfekt for nybegynnere og mellomøvelse. Trener alle muskelgrupper hver økt.',
          category: 'Muskelbygging',
          difficulty: 'Beginner',
          duration: '60-75 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 180
            },
            {
              exerciseId: exerciseMap.get('Barbell Bench Press'),
              name: 'Barbell Bench Press',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Barbell Rows'),
              name: 'Barbell Rows',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Overhead Press'),
              name: 'Overhead Press',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Romanian Deadlift'),
              name: 'Romanian Deadlift',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Barbell Curl'),
              name: 'Barbell Curl',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Plank'),
              name: 'Plank',
              sets: [
                { setNumber: 1, reps: 60, weight: undefined },
                { setNumber: 2, reps: 60, weight: undefined },
                { setNumber: 3, reps: 60, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },

        // 9. CALISTHENICS BASICS
        {
          id: 'template-calisthenics',
          name: 'Calisthenics Basics',
          description: 'Grunnleggende kroppsøvelser uten utstyr. Perfekt for hjemmetrening eller reising. Fokus på push-ups, pull-ups, dips og core.',
          category: 'Calisthenics',
          difficulty: 'Beginner',
          duration: '45-60 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Pull-Ups'),
              name: 'Pull-Ups',
              sets: [
                { setNumber: 1, reps: 8, weight: undefined },
                { setNumber: 2, reps: 8, weight: undefined },
                { setNumber: 3, reps: 8, weight: undefined },
                { setNumber: 4, reps: 8, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 120
            },
            {
              exerciseId: exerciseMap.get('Push-Ups'),
              name: 'Push-Ups',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
                { setNumber: 4, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Tricep Dips'),
              name: 'Tricep Dips',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 90
            },
            {
              exerciseId: exerciseMap.get('Bulgarian Split Squat'),
              name: 'Bulgarian Split Squat',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Plank'),
              name: 'Plank',
              sets: [
                { setNumber: 1, reps: 60, weight: undefined },
                { setNumber: 2, reps: 60, weight: undefined },
                { setNumber: 3, reps: 60, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
            {
              exerciseId: exerciseMap.get('Hanging Leg Raise'),
              name: 'Hanging Leg Raise',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 60
            },
          ]
        },

        // 10. CARDIO + STRENGTH CIRCUIT
        {
          id: 'template-cardio-circuit',
          name: 'Cardio + Strength Circuit',
          description: 'Kombinasjon av styrke og kondisjon i ett program. Høy intensitet med korte pauser. Perfekt for fettforbrenning og generell fitness.',
          category: 'Kondisjon',
          difficulty: 'Intermediate',
          duration: '45-60 min',
          exercises: [
            {
              exerciseId: exerciseMap.get('Barbell Squat'),
              name: 'Barbell Squat',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 45
            },
            {
              exerciseId: exerciseMap.get('Push-Ups'),
              name: 'Push-Ups',
              sets: [
                { setNumber: 1, reps: 20, weight: undefined },
                { setNumber: 2, reps: 20, weight: undefined },
                { setNumber: 3, reps: 20, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 45
            },
            {
              exerciseId: exerciseMap.get('Deadlift'),
              name: 'Deadlift',
              sets: [
                { setNumber: 1, reps: 12, weight: undefined },
                { setNumber: 2, reps: 12, weight: undefined },
                { setNumber: 3, reps: 12, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 45
            },
            {
              exerciseId: exerciseMap.get('Pull-Ups'),
              name: 'Pull-Ups',
              sets: [
                { setNumber: 1, reps: 10, weight: undefined },
                { setNumber: 2, reps: 10, weight: undefined },
                { setNumber: 3, reps: 10, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 45
            },
            {
              exerciseId: exerciseMap.get('Barbell Rows'),
              name: 'Barbell Rows',
              sets: [
                { setNumber: 1, reps: 15, weight: undefined },
                { setNumber: 2, reps: 15, weight: undefined },
                { setNumber: 3, reps: 15, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 45
            },
            {
              exerciseId: exerciseMap.get('Russian Twist'),
              name: 'Russian Twist',
              sets: [
                { setNumber: 1, reps: 30, weight: undefined },
                { setNumber: 2, reps: 30, weight: undefined },
                { setNumber: 3, reps: 30, weight: undefined },
              ],
              weightUnit: 'kg',
              restTime: 30
            },
          ]
        },
      ];

      // Filter out templates with missing exercises
      const validTemplates = templates.filter(template =>
        template.exercises.every(ex => ex.exerciseId)
      );
      console.log('✅ Valid templates after filtering:', validTemplates.length, 'out of', templates.length);
      console.log('👥 Personal templates:', personalTemplates.length);

      // Format personal templates to match system template structure
      const formattedPersonalTemplates = personalTemplates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: 'Min mal',
        difficulty: 'Custom',
        duration: 'Variabel',
        isPersonal: true,
        exercises: template.exercises.map(ex => {
          // Try to parse setConfiguration from notes
          let setsArray = [];
          try {
            if (ex.notes) {
              const parsed = JSON.parse(ex.notes);
              if (parsed.setConfiguration && Array.isArray(parsed.setConfiguration)) {
                setsArray = parsed.setConfiguration;
              }
            }
          } catch (e) {
            // If parsing fails, fall back to default behavior
          }

          // If no setConfiguration found, create default sets
          if (setsArray.length === 0 && ex.sets) {
            setsArray = Array.from({ length: ex.sets }, (_, i) => ({
              setNumber: i + 1,
              reps: ex.reps ? parseInt(ex.reps) : undefined,
              weight: ex.weight
            }));
          }

          return {
            exerciseId: ex.customExercise?.systemExercise?.id || ex.customExerciseId,
            name: ex.customExercise?.name || 'Øvelse',
            sets: setsArray
          };
        })
      }));

      // Combine personal templates with system templates (personal first)
      const allTemplates = [...formattedPersonalTemplates, ...validTemplates];
      console.log('📦 Total templates being returned:', allTemplates.length);

      res.json({
        success: true,
        data: allTemplates
      });
    } catch (error) {
      console.error('Get workout templates error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente maler' });
    }
  }

  async createWorkoutProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { name, description, goals, exercises } = req.body;

      if (!name) {
        throw new AppError('Programnavn er påkrevd', 400);
      }

      // Process exercises - create/find CustomExercise for each SystemExercise
      const processedExercises = [];
      if (exercises && exercises.length > 0) {
        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          let customExerciseId = ex.customExerciseId;

          // If exerciseId is provided (SystemExercise), create or find CustomExercise
          if (ex.exerciseId && !customExerciseId) {
            const systemExercise = await prisma.systemExercise.findUnique({
              where: { id: ex.exerciseId }
            });

            if (systemExercise) {
              // Check if user already has this as a custom exercise
              let customExercise = await prisma.customExercise.findFirst({
                where: {
                  tenantId,
                  userId,
                  systemExerciseId: ex.exerciseId
                }
              });

              // Create if doesn't exist
              if (!customExercise) {
                customExercise = await prisma.customExercise.create({
                  data: {
                    tenantId,
                    userId,
                    systemExerciseId: ex.exerciseId,
                    name: systemExercise.name,
                    description: systemExercise.description,
                    type: systemExercise.type,
                    equipment: systemExercise.equipment,
                    primaryMuscles: systemExercise.primaryMuscles,
                    secondaryMuscles: systemExercise.secondaryMuscles || [],
                    imageUrl: systemExercise.imageUrl
                  }
                });
              }

              customExerciseId = customExercise.id;
            }
          }

          if (!customExerciseId) {
            throw new AppError(`Øvelse ${i + 1} mangler exercise ID`, 400);
          }

          // Handle individual sets configuration
          let setsCount = 3;
          let setConfiguration = null;

          if (Array.isArray(ex.sets)) {
            // New format: sets is an array of set objects
            setsCount = ex.sets.length;
            setConfiguration = ex.sets; // Store as JSON
          } else if (typeof ex.sets === 'number') {
            // Legacy format: sets is a number
            setsCount = ex.sets;
          }

          processedExercises.push({
            customExerciseId,
            sets: setsCount,
            reps: ex.reps || (setConfiguration ? String(setConfiguration[0]?.reps || 10) : '10'),
            duration: ex.duration,
            weight: ex.weight || (setConfiguration ? setConfiguration[0]?.weight : undefined),
            weightUnit: ex.weightUnit || 'kg',
            restTime: ex.restTime,
            notes: setConfiguration ? JSON.stringify({ setConfiguration }) : ex.notes,
            sortOrder: i
          });
        }
      }

      const program = await prisma.workoutProgram.create({
        data: {
          userId,
          tenantId,
          name,
          description,
          goals,
          exercises: processedExercises.length > 0 ? {
            create: processedExercises
          } : undefined
        },
        include: {
          exercises: {
            include: {
              customExercise: {
                include: {
                  systemExercise: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        data: program,
        message: 'Treningsprogram opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create workout program error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette program' });
      }
    }
  }

  async updateWorkoutProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { name, description, goals, isActive, exercises } = req.body;

      // Verify ownership
      const program = await prisma.workoutProgram.findUnique({
        where: { id }
      });

      if (!program) {
        throw new AppError('Program ikke funnet', 404);
      }

      if (program.userId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }

      // If exercises are provided, delete old ones and create new ones
      if (exercises) {
        // Delete old exercises
        await prisma.workoutProgramExercise.deleteMany({
          where: { programId: id }
        });

        // Process new exercises
        const processedExercises = [];
        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          let customExerciseId = ex.customExerciseId;

          // If exerciseId is provided (SystemExercise), create or find CustomExercise
          if (ex.exerciseId && !customExerciseId) {
            const systemExercise = await prisma.systemExercise.findUnique({
              where: { id: ex.exerciseId }
            });

            if (systemExercise) {
              let customExercise = await prisma.customExercise.findFirst({
                where: {
                  tenantId,
                  userId,
                  systemExerciseId: ex.exerciseId
                }
              });

              if (!customExercise) {
                customExercise = await prisma.customExercise.create({
                  data: {
                    tenantId,
                    userId,
                    systemExerciseId: ex.exerciseId,
                    name: systemExercise.name,
                    description: systemExercise.description,
                    type: systemExercise.type,
                    equipment: systemExercise.equipment,
                    primaryMuscles: systemExercise.primaryMuscles,
                    secondaryMuscles: systemExercise.secondaryMuscles || [],
                    imageUrl: systemExercise.imageUrl
                  }
                });
              }

              customExerciseId = customExercise.id;
            }
          }

          if (!customExerciseId) {
            throw new AppError(`Øvelse ${i + 1} mangler exercise ID`, 400);
          }

          // Handle individual sets configuration
          let setsCount = 3;
          let setConfiguration = null;

          if (Array.isArray(ex.sets)) {
            setsCount = ex.sets.length;
            setConfiguration = ex.sets;
          } else if (typeof ex.sets === 'number') {
            setsCount = ex.sets;
          }

          processedExercises.push({
            customExerciseId,
            sets: setsCount,
            reps: ex.reps || (setConfiguration ? String(setConfiguration[0]?.reps || 10) : '10'),
            duration: ex.duration,
            weight: ex.weight || (setConfiguration ? setConfiguration[0]?.weight : undefined),
            weightUnit: ex.weightUnit || 'kg',
            restTime: ex.restTime,
            notes: setConfiguration ? JSON.stringify({ setConfiguration }) : ex.notes,
            sortOrder: i
          });
        }

        // Create new exercises
        await prisma.workoutProgramExercise.createMany({
          data: processedExercises.map(ex => ({
            ...ex,
            programId: id
          }))
        });
      }

      const updated = await prisma.workoutProgram.update({
        where: { id },
        data: {
          name,
          description,
          goals,
          isActive
        },
        include: {
          exercises: {
            include: {
              customExercise: {
                include: {
                  systemExercise: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        data: updated,
        message: 'Program oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update workout program error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere program' });
      }
    }
  }

  async deleteWorkoutProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Verify ownership
      const program = await prisma.workoutProgram.findUnique({
        where: { id }
      });

      if (!program) {
        throw new AppError('Program ikke funnet', 404);
      }

      if (program.userId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }

      await prisma.workoutProgram.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Program slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete workout program error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette program' });
      }
    }
  }

  async saveWorkoutProgramAsTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Verify ownership
      const program = await prisma.workoutProgram.findUnique({
        where: { id },
        include: {
          exercises: {
            include: {
              customExercise: {
                include: {
                  systemExercise: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      if (!program) {
        throw new AppError('Program ikke funnet', 404);
      }

      if (program.userId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }

      // Update program to mark as template
      const updated = await prisma.workoutProgram.update({
        where: { id },
        data: {
          isTemplate: true
        },
        include: {
          exercises: {
            include: {
              customExercise: {
                include: {
                  systemExercise: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        data: updated,
        message: 'Program lagret som mal'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Save workout program as template error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke lagre program som mal' });
      }
    }
  }

  // ============================================
  // PROGRAM EXERCISES
  // ============================================

  async addExerciseToProgram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { programId } = req.params;
      const userId = req.user!.userId;
      const {
        customExerciseId,
        sets,
        reps,
        duration,
        weight,
        weightUnit,
        restTime,
        notes
      } = req.body;

      // Verify program ownership
      const program = await prisma.workoutProgram.findUnique({
        where: { id: programId },
        include: {
          exercises: true
        }
      });

      if (!program) {
        throw new AppError('Program ikke funnet', 404);
      }

      if (program.userId !== userId) {
        throw new AppError('Ingen tilgang til dette programmet', 403);
      }

      const sortOrder = program.exercises.length;

      const programExercise = await prisma.workoutProgramExercise.create({
        data: {
          programId,
          customExerciseId,
          sets: sets || 3,
          reps,
          duration,
          weight,
          weightUnit: weightUnit || 'kg',
          restTime,
          notes,
          sortOrder
        },
        include: {
          customExercise: {
            include: {
              systemExercise: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: programExercise,
        message: 'Øvelse lagt til program'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Add exercise to program error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke legge til øvelse' });
      }
    }
  }

  async updateProgramExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const updateData = req.body;

      // Verify ownership through program
      const programExercise = await prisma.workoutProgramExercise.findUnique({
        where: { id },
        include: { program: true }
      });

      if (!programExercise) {
        throw new AppError('Øvelse ikke funnet', 404);
      }

      if (programExercise.program.userId !== userId) {
        throw new AppError('Ingen tilgang', 403);
      }

      const updated = await prisma.workoutProgramExercise.update({
        where: { id },
        data: updateData,
        include: {
          customExercise: {
            include: {
              systemExercise: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updated,
        message: 'Øvelse oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update program exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere øvelse' });
      }
    }
  }

  async removeProgramExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Verify ownership through program
      const programExercise = await prisma.workoutProgramExercise.findUnique({
        where: { id },
        include: { program: true }
      });

      if (!programExercise) {
        throw new AppError('Øvelse ikke funnet', 404);
      }

      if (programExercise.program.userId !== userId) {
        throw new AppError('Ingen tilgang', 403);
      }

      await prisma.workoutProgramExercise.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Øvelse fjernet fra program'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Remove program exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke fjerne øvelse' });
      }
    }
  }

  // ============================================
  // WORKOUT SCHEDULES
  // ============================================

  async getWorkoutSchedules(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      const schedules = await prisma.workoutSchedule.findMany({
        where: {
          userId,
          tenantId,
          isActive: true
        },
        include: {
          program: {
            include: {
              exercises: {
                include: {
                  customExercise: {
                    include: {
                      systemExercise: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { dayOfWeek: 'asc' }
      });

      res.json({
        success: true,
        data: schedules
      });
    } catch (error) {
      console.error('Get workout schedules error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente treningsplan' });
    }
  }

  async createWorkoutSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { programId, dayOfWeek, startTime } = req.body;

      if (!programId || dayOfWeek === undefined) {
        throw new AppError('Program og dag er påkrevd', 400);
      }

      // Verify program ownership
      const program = await prisma.workoutProgram.findUnique({
        where: { id: programId }
      });

      if (!program || program.userId !== userId) {
        throw new AppError('Program ikke funnet', 404);
      }

      const schedule = await prisma.workoutSchedule.create({
        data: {
          userId,
          tenantId,
          programId,
          dayOfWeek,
          startTime
        },
        include: {
          program: true
        }
      });

      res.json({
        success: true,
        data: schedule,
        message: 'Treningsplan opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create workout schedule error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette treningsplan' });
      }
    }
  }

  async deleteWorkoutSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const schedule = await prisma.workoutSchedule.findUnique({
        where: { id }
      });

      if (!schedule) {
        throw new AppError('Treningsplan ikke funnet', 404);
      }

      if (schedule.userId !== userId) {
        throw new AppError('Ingen tilgang', 403);
      }

      await prisma.workoutSchedule.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Treningsplan slettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete workout schedule error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette treningsplan' });
      }
    }
  }

  // ============================================
  // WORKOUT SESSIONS (Tracking)
  // ============================================

  async getWorkoutSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { limit = 20, offset = 0 } = req.query;

      const sessions = await prisma.workoutSession.findMany({
        where: {
          userId,
          tenantId
        },
        include: {
          program: true,
          exerciseLogs: {
            include: {
              customExercise: {
                include: {
                  systemExercise: true
                }
              },
              setLogs: true
            }
          }
        },
        orderBy: { startedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('Get workout sessions error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente treningsøkter' });
    }
  }

  async startWorkoutSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { programId } = req.body;

      const session = await prisma.workoutSession.create({
        data: {
          userId,
          tenantId,
          programId
        },
        include: {
          program: {
            include: {
              exercises: {
                include: {
                  customExercise: {
                    include: {
                      systemExercise: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      res.json({
        success: true,
        data: session,
        message: 'Treningsøkt startet'
      });
    } catch (error) {
      console.error('Start workout session error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke starte treningsøkt' });
    }
  }

  async completeWorkoutSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { notes, rating } = req.body;

      const session = await prisma.workoutSession.findUnique({
        where: { id }
      });

      if (!session) {
        throw new AppError('Økt ikke funnet', 404);
      }

      if (session.userId !== userId) {
        throw new AppError('Ingen tilgang', 403);
      }

      const completedAt = new Date();
      const duration = Math.floor((completedAt.getTime() - session.startedAt.getTime()) / 1000);

      const updated = await prisma.workoutSession.update({
        where: { id },
        data: {
          completedAt,
          duration,
          notes,
          rating
        },
        include: {
          exerciseLogs: {
            include: {
              setLogs: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updated,
        message: 'Treningsøkt fullført'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Complete workout session error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke fullføre økt' });
      }
    }
  }

  async logExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.userId;
      const { customExerciseId, sets, notes } = req.body;

      // Verify session ownership
      const session = await prisma.workoutSession.findUnique({
        where: { id: sessionId },
        include: { exerciseLogs: true }
      });

      if (!session) {
        throw new AppError('Økt ikke funnet', 404);
      }

      if (session.userId !== userId) {
        throw new AppError('Ingen tilgang', 403);
      }

      const sortOrder = session.exerciseLogs.length;

      const exerciseLog = await prisma.workoutExerciseLog.create({
        data: {
          sessionId,
          customExerciseId,
          sortOrder,
          notes,
          setLogs: sets ? {
            create: sets.map((set: any, index: number) => ({
              setNumber: index + 1,
              reps: set.reps,
              weight: set.weight,
              weightUnit: set.weightUnit || 'kg',
              duration: set.duration,
              distance: set.distance,
              distanceUnit: set.distanceUnit,
              completed: set.completed !== false,
              notes: set.notes
            }))
          } : undefined
        },
        include: {
          customExercise: {
            include: {
              systemExercise: true
            }
          },
          setLogs: true
        }
      });

      res.json({
        success: true,
        data: exerciseLog,
        message: 'Øvelse logget'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Log exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke logge øvelse' });
      }
    }
  }

  // ============================================
  // STATISTICS & PROGRESS
  // ============================================

  async getWorkoutStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Total sessions
      const totalSessions = await prisma.workoutSession.count({
        where: {
          userId,
          tenantId,
          completedAt: { not: null }
        }
      });

      // This month sessions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const thisMonthSessions = await prisma.workoutSession.count({
        where: {
          userId,
          tenantId,
          completedAt: { not: null },
          startedAt: { gte: startOfMonth }
        }
      });

      // Recent sessions with duration
      const recentSessions = await prisma.workoutSession.findMany({
        where: {
          userId,
          tenantId,
          completedAt: { not: null }
        },
        select: {
          duration: true,
          rating: true,
          startedAt: true
        },
        orderBy: { startedAt: 'desc' },
        take: 30
      });

      const totalDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const avgDuration = recentSessions.length > 0 ? totalDuration / recentSessions.length : 0;

      const totalRating = recentSessions
        .filter(s => s.rating)
        .reduce((sum, s) => sum + (s.rating || 0), 0);
      const ratedCount = recentSessions.filter(s => s.rating).length;
      const avgRating = ratedCount > 0 ? totalRating / ratedCount : 0;

      // Total programs
      const totalPrograms = await prisma.workoutProgram.count({
        where: { userId, tenantId }
      });

      // Total custom exercises
      const totalExercises = await prisma.customExercise.count({
        where: { userId, tenantId }
      });

      res.json({
        success: true,
        data: {
          totalSessions,
          thisMonthSessions,
          totalPrograms,
          totalExercises,
          avgDuration: Math.round(avgDuration),
          avgRating: Math.round(avgRating * 10) / 10,
          recentSessions: recentSessions.map(s => ({
            date: s.startedAt,
            duration: s.duration,
            rating: s.rating
          }))
        }
      });
    } catch (error) {
      console.error('Get workout stats error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente statistikk' });
    }
  }

  async getExerciseProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { customExerciseId } = req.params;
      const userId = req.user!.userId;
      const { limit = 10 } = req.query;

      // Get recent logs for this exercise
      const logs = await prisma.workoutExerciseLog.findMany({
        where: {
          customExerciseId,
          session: {
            userId,
            completedAt: { not: null }
          }
        },
        include: {
          setLogs: {
            orderBy: { setNumber: 'asc' }
          },
          session: {
            select: {
              startedAt: true,
              completedAt: true
            }
          }
        },
        orderBy: {
          completedAt: 'desc'
        },
        take: Number(limit)
      });

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('Get exercise progress error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente progresjon' });
    }
  }
}
