import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../services/upload.service';

const router = Router();
const uploadController = new UploadController();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

// Upload single image
router.post('/single', (req, res, next) => {
  console.log('=== UPLOAD ROUTE HIT ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Headers:', req.headers);
  next();
}, upload.single('image'), (req, res) => {
  console.log('=== AFTER MULTER MIDDLEWARE ===');
  console.log('File present:', !!req.file);
  uploadController.uploadSingle(req, res);
});

// Upload multiple images (max 10)
router.post('/multiple', upload.array('images', 10), (req, res) => uploadController.uploadMultiple(req, res));

export default router;
