import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  isValidUUID,
  isValidMediaURL,
  sanitizeText,
  isValidMediaType,
  isValidExerciseType,
  isValidSortOrder,
  sanitizeErrorMessage,
  checkRateLimit,
} from '../utils/validation';

const prisma = new PrismaClient();

/**
 * GET /api/workouts/exercises/:exerciseId/media
 * Get all media for an exercise (system or custom)
 */
export const getExerciseMedia = async (req: Request, res: Response) => {
  try {
    const { exerciseId } = req.params;
    const { exerciseType } = req.query; // 'system' or 'custom'
    const tenantId = req.user!.tenantId;

    // Validate UUID format
    if (!isValidUUID(exerciseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid UUID format',
      });
    }

    // Validate exercise type
    if (typeof exerciseType !== 'string' || !isValidExerciseType(exerciseType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exercise type. Must be "system" or "custom"',
      });
    }

    let media;
    let legacyMedia: any[] = [];

    if (exerciseType === 'system') {
      media = await prisma.exerciseMedia.findMany({
        where: { systemExerciseId: exerciseId },
        orderBy: { sortOrder: 'asc' },
      });

      // Also fetch the system exercise's imageUrl and videoUrl
      const systemExercise = await prisma.systemExercise.findUnique({
        where: { id: exerciseId },
        select: { imageUrl: true, videoUrl: true },
      });

      // Add legacy media if they exist and aren't already in ExerciseMedia
      if (systemExercise?.imageUrl) {
        legacyMedia.push({
          id: `legacy-img-${exerciseId}`,
          url: systemExercise.imageUrl,
          mediaType: 'IMAGE',
          title: 'Original Image',
          description: null,
          sortOrder: -2, // Show before other media
          systemExerciseId: exerciseId,
          customExerciseId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isLegacy: true, // Mark as legacy so frontend knows not to allow delete
        });
      }

      if (systemExercise?.videoUrl) {
        legacyMedia.push({
          id: `legacy-vid-${exerciseId}`,
          url: systemExercise.videoUrl,
          mediaType: 'VIDEO',
          title: 'Original Video',
          description: null,
          sortOrder: -1, // Show before other media
          systemExerciseId: exerciseId,
          customExerciseId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isLegacy: true,
        });
      }
    } else {
      // For custom exercises, verify tenant isolation
      const customExercise = await prisma.customExercise.findUnique({
        where: { id: exerciseId },
        select: { imageUrl: true, videoUrl: true, tenantId: true },
      });

      if (!customExercise) {
        return res.status(404).json({
          success: false,
          error: 'Exercise not found',
        });
      }

      // Check tenant isolation
      if (customExercise.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
      }

      media = await prisma.exerciseMedia.findMany({
        where: { customExerciseId: exerciseId },
        orderBy: { sortOrder: 'asc' },
      });

      // Add legacy media if they exist
      if (customExercise?.imageUrl) {
        legacyMedia.push({
          id: `legacy-img-${exerciseId}`,
          url: customExercise.imageUrl,
          mediaType: 'IMAGE',
          title: 'Original Image',
          description: null,
          sortOrder: -2,
          systemExerciseId: null,
          customExerciseId: exerciseId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isLegacy: true,
        });
      }

      if (customExercise?.videoUrl) {
        legacyMedia.push({
          id: `legacy-vid-${exerciseId}`,
          url: customExercise.videoUrl,
          mediaType: 'VIDEO',
          title: 'Original Video',
          description: null,
          sortOrder: -1,
          systemExerciseId: null,
          customExerciseId: exerciseId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isLegacy: true,
        });
      }
    }

    // Combine legacy media and new media, sorted by sortOrder
    const allMedia = [...legacyMedia, ...media].sort((a, b) => a.sortOrder - b.sortOrder);

    res.json({ success: true, data: allMedia });
  } catch (error: any) {
    console.error('Get exercise media error:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
  }
};

/**
 * POST /api/workouts/exercises/:exerciseId/media
 * Add media to an exercise
 * Authorization:
 * - ADMIN/SUPER_ADMIN can add to any exercise
 * - CUSTOMER can only add to their own custom exercises
 */
export const addExerciseMedia = async (req: Request, res: Response) => {
  try {
    const { exerciseId } = req.params;
    const { url, mediaType, title, description, sortOrder, exerciseType } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const tenantId = req.user!.tenantId;

    // Rate limiting: 30 media uploads per minute per user
    const rateLimitKey = `media-upload:${userId}`;
    const rateLimit = checkRateLimit(rateLimitKey, 30, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds`,
      });
    }

    // Validate UUID format
    if (!isValidUUID(exerciseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid UUID format',
      });
    }

    // Validate exercise type
    if (!exerciseType || !isValidExerciseType(exerciseType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exercise type. Must be "system" or "custom"',
      });
    }

    // Validate URL - CRITICAL SSRF protection
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    const urlValidation = isValidMediaURL(url);
    if (!urlValidation.valid) {
      return res.status(400).json({
        success: false,
        error: urlValidation.error || 'Invalid URL',
      });
    }

    // Validate media type
    if (!mediaType || !isValidMediaType(mediaType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid media type. Must be "IMAGE" or "VIDEO"',
      });
    }

    // Sanitize text inputs
    const sanitizedTitle = title ? sanitizeText(title, 200) : undefined;
    const sanitizedDescription = description ? sanitizeText(description, 500) : undefined;

    // Validate sort order
    const finalSortOrder = sortOrder !== undefined ? sortOrder : 0;
    if (!isValidSortOrder(finalSortOrder)) {
      return res.status(400).json({
        success: false,
        error: 'Sort order must be an integer between -1000 and 1000',
      });
    }

    // Authorization check
    if (exerciseType === 'system') {
      // Only ADMIN or SUPER_ADMIN can modify system exercises
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can modify system exercises',
        });
      }
    } else if (exerciseType === 'custom') {
      // Check if user owns this custom exercise (unless admin)
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        const customExercise = await prisma.customExercise.findFirst({
          where: {
            id: exerciseId,
            userId: userId,
            tenantId: tenantId,
          },
        });

        if (!customExercise) {
          return res.status(403).json({
            success: false,
            error: 'You can only modify your own exercises',
          });
        }
      }
    }

    // Create media with sanitized data
    const media = await prisma.exerciseMedia.create({
      data: {
        url,
        mediaType,
        title: sanitizedTitle,
        description: sanitizedDescription,
        sortOrder: finalSortOrder,
        systemExerciseId: exerciseType === 'system' ? exerciseId : null,
        customExerciseId: exerciseType === 'custom' ? exerciseId : null,
      },
    });

    res.json({ success: true, data: media });
  } catch (error: any) {
    console.error('Add exercise media error:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
  }
};

/**
 * DELETE /api/workouts/exercises/:exerciseId/media/:mediaId
 * Delete media from an exercise
 * Authorization: Same as addExerciseMedia
 */
export const deleteExerciseMedia = async (req: Request, res: Response) => {
  try {
    const { exerciseId, mediaId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const tenantId = req.user!.tenantId;

    // Validate UUID formats
    if (!isValidUUID(exerciseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exercise UUID format',
      });
    }

    if (!isValidUUID(mediaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid media UUID format',
      });
    }

    // Get the media to check ownership
    const media = await prisma.exerciseMedia.findUnique({
      where: { id: mediaId },
      include: {
        systemExercise: true,
        customExercise: true,
      },
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
      });
    }

    // Authorization check
    if (media.systemExerciseId) {
      // System exercise media
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can modify system exercises',
        });
      }
    } else if (media.customExerciseId) {
      // Custom exercise media
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        // Check if user owns the custom exercise
        if (media.customExercise?.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'You can only modify your own exercises',
          });
        }
      }
    }

    // Delete media
    await prisma.exerciseMedia.delete({
      where: { id: mediaId },
    });

    res.json({ success: true, message: 'Media deleted successfully' });
  } catch (error: any) {
    console.error('Delete exercise media error:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
  }
};

/**
 * PATCH /api/workouts/exercises/:exerciseId/media/:mediaId
 * Update media (reorder, change title/description)
 */
export const updateExerciseMedia = async (req: Request, res: Response) => {
  try {
    const { exerciseId, mediaId } = req.params;
    const { title, description, sortOrder } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Validate UUID formats
    if (!isValidUUID(exerciseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exercise UUID format',
      });
    }

    if (!isValidUUID(mediaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid media UUID format',
      });
    }

    // Validate and sanitize inputs
    const sanitizedTitle = title !== undefined ? sanitizeText(title, 200) : undefined;
    const sanitizedDescription = description !== undefined ? sanitizeText(description, 500) : undefined;

    if (sortOrder !== undefined && !isValidSortOrder(sortOrder)) {
      return res.status(400).json({
        success: false,
        error: 'Sort order must be an integer between -1000 and 1000',
      });
    }

    // Get the media to check ownership
    const media = await prisma.exerciseMedia.findUnique({
      where: { id: mediaId },
      include: {
        systemExercise: true,
        customExercise: true,
      },
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
      });
    }

    // Authorization check (same as delete)
    if (media.systemExerciseId) {
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can modify system exercises',
        });
      }
    } else if (media.customExerciseId) {
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        if (media.customExercise?.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'You can only modify your own exercises',
          });
        }
      }
    }

    // Update media with sanitized data
    const updatedMedia = await prisma.exerciseMedia.update({
      where: { id: mediaId },
      data: {
        ...(sanitizedTitle !== undefined && { title: sanitizedTitle }),
        ...(sanitizedDescription !== undefined && { description: sanitizedDescription }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    res.json({ success: true, data: updatedMedia });
  } catch (error: any) {
    console.error('Update exercise media error:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
  }
};

/**
 * POST /api/workouts/exercises/:exerciseId/media/upload
 * Upload media file for an exercise
 * Handles file upload from device (image or video)
 */
export const uploadExerciseMediaFile = async (req: Request, res: Response) => {
  try {
    const { exerciseId } = req.params;
    const { exerciseType, title, description, sortOrder } = req.body;
    const file = req.file;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const tenantId = req.user!.tenantId;

    // Check if file was uploaded
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Rate limiting: 30 media uploads per minute per user
    const rateLimitKey = `media-upload:${userId}`;
    const rateLimit = checkRateLimit(rateLimitKey, 30, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds`,
      });
    }

    // Validate UUID format
    if (!isValidUUID(exerciseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid UUID format',
      });
    }

    // Validate exercise type
    if (!exerciseType || !isValidExerciseType(exerciseType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exercise type. Must be "system" or "custom"',
      });
    }

    // Determine media type from file mimetype
    let mediaType: 'IMAGE' | 'VIDEO';
    if (file.mimetype.startsWith('image/')) {
      mediaType = 'IMAGE';
    } else if (file.mimetype.startsWith('video/')) {
      mediaType = 'VIDEO';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only images and videos are allowed.',
      });
    }

    // Generate public URL for the uploaded file
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/exercise-media/${file.filename}`;

    // Sanitize text inputs
    const sanitizedTitle = title ? sanitizeText(title, 200) : undefined;
    const sanitizedDescription = description ? sanitizeText(description, 500) : undefined;

    // Validate sort order
    const finalSortOrder = sortOrder !== undefined ? parseInt(sortOrder) : 0;
    if (!isValidSortOrder(finalSortOrder)) {
      return res.status(400).json({
        success: false,
        error: 'Sort order must be an integer between -1000 and 1000',
      });
    }

    // Authorization check
    if (exerciseType === 'system') {
      // Only ADMIN or SUPER_ADMIN can modify system exercises
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can modify system exercises',
        });
      }
    } else if (exerciseType === 'custom') {
      // Check if user owns this custom exercise (unless admin)
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        const customExercise = await prisma.customExercise.findFirst({
          where: {
            id: exerciseId,
            userId: userId,
            tenantId: tenantId,
          },
        });

        if (!customExercise) {
          return res.status(403).json({
            success: false,
            error: 'You can only modify your own exercises',
          });
        }
      }
    }

    // Create media record with uploaded file URL
    const media = await prisma.exerciseMedia.create({
      data: {
        url: fileUrl,
        mediaType,
        title: sanitizedTitle,
        description: sanitizedDescription,
        sortOrder: finalSortOrder,
        systemExerciseId: exerciseType === 'system' ? exerciseId : null,
        customExerciseId: exerciseType === 'custom' ? exerciseId : null,
      },
    });

    res.json({ success: true, data: media });
  } catch (error: any) {
    console.error('Upload exercise media error:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
  }
};
