import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Request } from 'express';

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create product images directory
const productImagesDir = path.join(uploadDir, 'products');
if (!fs.existsSync(productImagesDir)) {
  fs.mkdirSync(productImagesDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, productImagesDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

// File filter - only images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Kun bilder er tillatt (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Helper function to get local network IP
const getLocalNetworkIP = (): string => {
  const interfaces = os.networkInterfaces();

  // Try to find the main network interface (usually Wi-Fi or Ethernet)
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const alias of iface) {
      // Look for IPv4, not internal (loopback), and not virtual
      if (alias.family === 'IPv4' && !alias.internal) {
        // Prefer en0 (Wi-Fi on Mac) or similar common interface
        if (name.startsWith('en') || name.startsWith('eth') || name.startsWith('wl')) {
          console.log(`[Upload] Using network IP: ${alias.address} from interface ${name}`);
          return alias.address;
        }
      }
    }
  }

  // Fallback to any non-internal IPv4
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        console.log(`[Upload] Using fallback network IP: ${alias.address} from interface ${name}`);
        return alias.address;
      }
    }
  }

  console.warn('[Upload] Could not find network IP, using localhost');
  return 'localhost';
};

// Helper function to get file URL
export const getFileUrl = (req: Request, filename: string): string => {
  const protocol = req.protocol;
  const host = req.get('host');

  // For development, always use network IP instead of localhost
  // This ensures images work on physical devices (iOS/Android)
  if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
    const networkIP = getLocalNetworkIP();
    const port = host.split(':')[1] || '3000';
    const url = `${protocol}://${networkIP}:${port}/uploads/products/${filename}`;
    console.log(`[Upload] Generated URL for localhost request: ${url}`);
    return url;
  }

  const url = `${protocol}://${host}/uploads/products/${filename}`;
  console.log(`[Upload] Generated URL: ${url}`);
  return url;
};

// Helper function to delete file
export const deleteFile = (filename: string): void => {
  const filePath = path.join(productImagesDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};
