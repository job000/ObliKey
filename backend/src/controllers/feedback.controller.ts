import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class FeedbackController {
  // Create feedback
  async createFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const {
        type,
        rating,
        title,
        message,
        classId,
        trainerId,
        isAnonymous
      } = req.body;

      // Validate rating (1-5)
      if (rating && (rating < 1 || rating > 5)) {
        throw new AppError('Rating må være mellom 1 og 5', 400);
      }

      // Create feedback
      const feedback = await prisma.feedback.create({
        data: {
          tenantId,
          userId,
          type,
          rating,
          title,
          message,
          classId,
          trainerId,
          isAnonymous: isAnonymous || false,
          status: 'OPEN'
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          class: {
            select: {
              name: true
            }
          },
          trainer: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: feedback,
        message: 'Takk for tilbakemeldingen!'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke sende tilbakemelding' });
      }
    }
  }

  // Get my feedback
  async getMyFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const feedback = await prisma.feedback.findMany({
        where: { userId },
        include: {
          class: {
            select: { name: true }
          },
          trainer: {
            select: { firstName: true, lastName: true }
          },
          responder: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: feedback });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente tilbakemeldinger' });
    }
  }

  // Get all feedback (ADMIN)
  async getAllFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { type, status } = req.query;

      const feedback = await prisma.feedback.findMany({
        where: {
          tenantId,
          ...(type && { type: type as any }),
          ...(status && { status: status as any })
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          class: {
            select: { name: true }
          },
          trainer: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: feedback });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente tilbakemeldinger' });
    }
  }

  // Respond to feedback (ADMIN)
  async respondToFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { response, status } = req.body;
      const adminId = req.user!.userId;

      const feedback = await prisma.feedback.update({
        where: { id },
        data: {
          adminResponse: response,
          respondedBy: adminId,
          respondedAt: new Date(),
          status: status || 'IN_PROGRESS'
        },
        include: {
          user: {
            select: { email: true, firstName: true }
          }
        }
      });

      // TODO: Send notification to user about response

      res.json({
        success: true,
        data: feedback,
        message: 'Svar sendt'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke svare på tilbakemelding' });
    }
  }

  // Get public reviews for a class
  async getClassReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { classId } = req.params;

      const reviews = await prisma.feedback.findMany({
        where: {
          classId,
          type: 'CLASS_REVIEW',
          isPublic: true,
          rating: { not: null }
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate average rating
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0;

      res.json({
        success: true,
        data: {
          reviews,
          averageRating: Math.round(avgRating * 10) / 10,
          totalReviews: reviews.length
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente vurderinger' });
    }
  }

  // Get public reviews for a trainer
  async getTrainerReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { trainerId } = req.params;

      const reviews = await prisma.feedback.findMany({
        where: {
          trainerId,
          type: 'TRAINER_REVIEW',
          isPublic: true,
          rating: { not: null }
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0;

      res.json({
        success: true,
        data: {
          reviews,
          averageRating: Math.round(avgRating * 10) / 10,
          totalReviews: reviews.length
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente vurderinger' });
    }
  }
}
