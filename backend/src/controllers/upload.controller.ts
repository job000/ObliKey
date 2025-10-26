import { Response } from 'express';
import { AuthRequest } from '../types';
import { getFileUrl } from '../services/upload.service';
import { AppError } from '../middleware/errorHandler';

export class UploadController {
  // Upload single image
  async uploadSingle(req: AuthRequest, res: Response): Promise<void> {
    console.log('=== UPLOAD SINGLE ENTRY ===');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    console.log('req.user:', req.user);

    try {
      if (!req.file) {
        console.error('No file in request');
        throw new AppError('Ingen fil lastet opp', 400);
      }

      console.log('File received:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });

      const url = getFileUrl(req, req.file.filename);
      console.log('Generated URL:', url);

      const response = {
        success: true,
        data: {
          filename: req.file.filename,
          url,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        message: 'Fil lastet opp'
      };

      console.log('Sending response:', response);
      res.status(201).json(response);
    } catch (error) {
      console.error('=== UPLOAD SINGLE ERROR ===', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke laste opp fil' });
      }
    }
  }

  // Upload multiple images
  async uploadMultiple(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError('Ingen filer lastet opp', 400);
      }

      const files = req.files.map((file: Express.Multer.File) => ({
        filename: file.filename,
        url: getFileUrl(req, file.filename),
        size: file.size,
        mimetype: file.mimetype
      }));

      res.status(201).json({
        success: true,
        data: files,
        message: `${files.length} filer lastet opp`
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke laste opp filer' });
      }
    }
  }
}
