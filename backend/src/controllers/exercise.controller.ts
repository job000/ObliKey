import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class ExerciseController {
  // Get all exercises (published + own)
  async getExercises(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { category, muscleGroup, difficulty, search, publishedOnly } = req.query;

      const whereClause: any = { tenantId };

      // Regular users only see published exercises + their own
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        whereClause.OR = [
          { isPublished: true },
          { createdBy: userId }
        ];
      }

      // If publishedOnly filter is set, only show published
      if (publishedOnly === 'true') {
        whereClause.isPublished = true;
        delete whereClause.OR;
      }

      if (category) whereClause.category = category;
      if (muscleGroup) whereClause.muscleGroup = muscleGroup;
      if (difficulty) whereClause.difficulty = difficulty;
      if (search) {
        whereClause.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const exercises = await prisma.exercise.findMany({
        where: whereClause,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [
          { isPublished: 'desc' },
          { name: 'asc' }
        ]
      });

      res.json({ success: true, data: exercises });
    } catch (error) {
      console.error('Get exercises error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente øvelser' });
    }
  }

  // Get single exercise
  async getExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const exercise = await prisma.exercise.findFirst({
        where: { id, tenantId },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!exercise) {
        throw new AppError('Øvelse ikke funnet', 404);
      }

      res.json({ success: true, data: exercise });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente øvelse' });
      }
    }
  }

  // Create exercise
  async createExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const {
        name,
        description,
        category,
        muscleGroup,
        difficulty,
        instructions,
        videoUrl,
        imageUrl,
        isPublished
      } = req.body;

      if (!name) {
        throw new AppError('Navn er påkrevd', 400);
      }

      const exercise = await prisma.exercise.create({
        data: {
          tenantId,
          createdBy: userId,
          name,
          description,
          category,
          muscleGroup,
          difficulty,
          instructions,
          videoUrl,
          imageUrl,
          isPublished: isPublished || false
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: exercise,
        message: 'Øvelse opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette øvelse' });
      }
    }
  }

  // Update exercise
  async updateExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const {
        name,
        description,
        category,
        muscleGroup,
        difficulty,
        instructions,
        videoUrl,
        imageUrl,
        isPublished
      } = req.body;

      // Check if exercise exists
      const existingExercise = await prisma.exercise.findFirst({
        where: { id, tenantId }
      });

      if (!existingExercise) {
        throw new AppError('Øvelse ikke funnet', 404);
      }

      // Only creator or admin can edit
      if (existingExercise.createdBy !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        throw new AppError('Du har ikke tilgang til å redigere denne øvelsen', 403);
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (muscleGroup !== undefined) updateData.muscleGroup = muscleGroup;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (instructions !== undefined) updateData.instructions = instructions;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

      // Only admin can publish/unpublish
      if (isPublished !== undefined && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
        updateData.isPublished = isPublished;
      }

      const exercise = await prisma.exercise.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: exercise,
        message: 'Øvelse oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere øvelse' });
      }
    }
  }

  // Delete exercise
  async deleteExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const exercise = await prisma.exercise.findFirst({
        where: { id, tenantId }
      });

      if (!exercise) {
        throw new AppError('Øvelse ikke funnet', 404);
      }

      // Only creator or admin can delete
      if (exercise.createdBy !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        throw new AppError('Du har ikke tilgang til å slette denne øvelsen', 403);
      }

      await prisma.exercise.delete({
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
        console.error('Delete exercise error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette øvelse' });
      }
    }
  }

  // Publish exercise (ADMIN only)
  async publishExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const exercise = await prisma.exercise.update({
        where: { id },
        data: { isPublished: true },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: exercise,
        message: 'Øvelse publisert'
      });
    } catch (error) {
      console.error('Publish exercise error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke publisere øvelse' });
    }
  }

  // Unpublish exercise (ADMIN only)
  async unpublishExercise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const exercise = await prisma.exercise.update({
        where: { id },
        data: { isPublished: false },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: exercise,
        message: 'Øvelse avpublisert'
      });
    } catch (error) {
      console.error('Unpublish exercise error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke avpublisere øvelse' });
    }
  }
}
