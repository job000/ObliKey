import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// ============================================
// RATE LIMITING
// ============================================

// General API rate limiter (100 requests per 15 minutes)
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 15 * 60, // Per 15 minutes
});

// Strict rate limiter for auth endpoints
// In development: 1000 attempts per 1 minute (essentially unlimited for dev)
// In production: 10 attempts per 15 minutes
const isDevelopment = process.env.NODE_ENV !== 'production';
export const authRateLimiter = new RateLimiterMemory({
  points: isDevelopment ? 1000 : 10,
  duration: isDevelopment ? 60 : 15 * 60,
  blockDuration: isDevelopment ? 0 : 15 * 60, // No blocking in development
});

// Export rateLimiter for admin reset functionality
export const generalRateLimiter = rateLimiter;

export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = req.ip || 'unknown';
    await rateLimiter.consume(key);
    next();
  } catch (error) {
    res.status(429).json({
      success: false,
      error: 'For mange forespørsler. Prøv igjen senere.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
};

export const authRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = `auth_${req.ip || 'unknown'}`;
    await authRateLimiter.consume(key);
    next();
  } catch (error) {
    res.status(429).json({
      success: false,
      error: 'For mange innloggingsforsøk. Kontoen er midlertidig låst.',
      retryAfter: 900
    });
  }
};

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize request body
 * Skip sanitization for routes that handle file uploads and URLs
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip sanitization for upload and product image routes
  const skipSanitizationPaths = [
    '/api/upload',
    '/api/products'
  ];

  const shouldSkip = skipSanitizationPaths.some(path => req.path.startsWith(path));

  if (!shouldSkip && req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// ============================================
// SQL INJECTION PREVENTION
// ============================================

/**
 * Validate that string doesn't contain SQL injection patterns
 */
export function validateNoSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\;|\/\*|\*\/|xp_|sp_)/i,
    /(\bOR\b.*=.*|1=1|1 = 1)/i,
  ];

  return !sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Middleware to check for SQL injection in query parameters
 * Skip validation for URL fields and certain routes
 */
export const preventSQLInjection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Routes that are allowed to contain free-form text (protected by Prisma ORM)
  const excludedRoutes = [
    '/api/landing-page',
    '/api/chat',
    '/api/feedback',
    '/api/exercises'
  ];

  // Skip validation for excluded routes
  const shouldSkip = excludedRoutes.some(route => req.path.startsWith(route));
  if (shouldSkip) {
    return next();
  }

  // Fields that are allowed to contain special characters (like URLs and content)
  const excludedFields = [
    'url',
    'imageUrl',
    'avatar',
    'attachmentUrl',
    'content',
    'title',
    'description',
    'heading',
    'subheading',
    'ctaText',
    'ctaUrl',
    'message',
    'notes',
    'instructions'
  ];

  const checkParams = (params: any) => {
    for (const key in params) {
      // Skip validation for excluded fields
      if (excludedFields.includes(key)) continue;

      if (typeof params[key] === 'string' && !validateNoSQLInjection(params[key])) {
        res.status(400).json({
          success: false,
          error: 'Ugyldig input oppdaget'
        });
        return false;
      }
    }
    return true;
  };

  if (req.query && !checkParams(req.query)) return;
  if (req.params && !checkParams(req.params)) return;
  if (req.body && !checkParams(req.body)) return;

  next();
};

// ============================================
// CORS CONFIGURATION
// ============================================

export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ============================================
// SECURITY HEADERS
// ============================================

export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

// ============================================
// PASSWORD STRENGTH VALIDATION
// ============================================

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Passord må være minst 8 tegn' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Passord må inneholde minst én stor bokstav' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Passord må inneholde minst én liten bokstav' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Passord må inneholde minst ett tall' };
  }

  // Check for common weak passwords
  const commonPasswords = ['password', 'Password123', '12345678', 'qwerty', 'abc123'];
  if (commonPasswords.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
    return { valid: false, message: 'Passordet er for vanlig. Velg et sterkere passord' };
  }

  return { valid: true };
}

// ============================================
// EMAIL VALIDATION
// ============================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================
// PHONE NUMBER VALIDATION (Norwegian)
// ============================================

export function validateNorwegianPhone(phone: string): boolean {
  // Norwegian phone numbers: +47 followed by 8 digits
  const phoneRegex = /^(\+47)?[4-9]\d{7}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}
