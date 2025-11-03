import { body, ValidationChain } from 'express-validator';

// ============================================
// AUTH VALIDATION
// ============================================
export const registerValidation: ValidationChain[] = [
  body('email').isEmail().withMessage('Ugyldig e-postadresse'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Passord må være minst 8 tegn')
    .matches(/[A-Z]/)
    .withMessage('Passord må inneholde minst én stor bokstav')
    .matches(/[a-z]/)
    .withMessage('Passord må inneholde minst én liten bokstav')
    .matches(/[0-9]/)
    .withMessage('Passord må inneholde minst ett tall'),
  body('firstName').notEmpty().withMessage('Fornavn er påkrevd'),
  body('lastName').notEmpty().withMessage('Etternavn er påkrevd'),
  body('tenantId').notEmpty().withMessage('Tenant ID er påkrevd'),
  // Optional username validation
  body('username')
    .optional()
    .matches(/^[a-zA-Z0-9_]{3,20}$/)
    .withMessage('Brukernavn må være 3-20 tegn og kan bare inneholde bokstaver, tall og understrek'),
];

export const loginValidation: ValidationChain[] = [
  body('password').notEmpty().withMessage('Passord er påkrevd'),
  // Allow either email, username, or identifier (custom validation)
  body()
    .custom((_value, { req }) => {
      const { email, username, identifier } = req.body;

      // At least one identifier must be provided
      if (!email && !username && !identifier) {
        throw new Error('E-post, brukernavn eller identifier er påkrevd');
      }

      // If email is provided, validate it
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Ugyldig e-postadresse');
      }

      // If identifier is provided and looks like email, validate it
      if (identifier && identifier.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        throw new Error('Ugyldig e-postadresse');
      }

      return true;
    })
];

// ============================================
// TENANT VALIDATION
// ============================================
export const createTenantValidation: ValidationChain[] = [
  body('name').notEmpty().withMessage('Navn er påkrevd'),
  body('subdomain')
    .notEmpty()
    .withMessage('Subdomene er påkrevd')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Subdomene kan bare inneholde små bokstaver, tall og bindestreker'),
  body('email').isEmail().withMessage('Ugyldig e-postadresse'),
  body('adminFirstName').notEmpty().withMessage('Admin fornavn er påkrevd'),
  body('adminLastName').notEmpty().withMessage('Admin etternavn er påkrevd'),
  body('adminEmail').isEmail().withMessage('Ugyldig admin e-postadresse'),
  body('adminPassword')
    .isLength({ min: 6 })
    .withMessage('Admin passord må være minst 6 tegn'),
];

// ============================================
// CLASS VALIDATION
// ============================================
export const createClassValidation: ValidationChain[] = [
  body('name').notEmpty().withMessage('Navn er påkrevd'),
  body('type')
    .isIn(['GROUP_CLASS', 'OPEN_GYM', 'FACILITY'])
    .withMessage('Ugyldig type'),
  body('capacity')
    .isInt({ min: 1 })
    .withMessage('Kapasitet må være minst 1'),
  body('duration')
    .isInt({ min: 15 })
    .withMessage('Varighet må være minst 15 minutter'),
  body('startTime').isISO8601().withMessage('Ugyldig starttid'),
];

// ============================================
// BOOKING VALIDATION
// ============================================
export const createBookingValidation: ValidationChain[] = [
  body('classId').notEmpty().withMessage('Klasse ID er påkrevd'),
];

// ============================================
// PT SESSION VALIDATION
// ============================================
export const createPTSessionValidation: ValidationChain[] = [
  body('customerId').notEmpty().withMessage('Kunde ID er påkrevd'),
  body('title').notEmpty().withMessage('Tittel er påkrevd'),
  body('startTime').isISO8601().withMessage('Ugyldig starttid'),
  body('endTime').isISO8601().withMessage('Ugyldig sluttid'),
];

// ============================================
// TRAINING PROGRAM VALIDATION
// ============================================
export const createTrainingProgramValidation: ValidationChain[] = [
  body('customerId').notEmpty().withMessage('Kunde ID er påkrevd'),
  body('name').notEmpty().withMessage('Navn er påkrevd'),
  body('startDate').isISO8601().withMessage('Ugyldig startdato'),
  body('exercises').notEmpty().withMessage('Øvelser er påkrevd'),
];

// ============================================
// SECURITY UTILITIES FOR EXERCISE MEDIA
// ============================================

/**
 * Validates UUID format (v4)
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validates URL and prevents SSRF attacks by blocking:
 * - localhost / 127.0.0.1
 * - Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
 * - file:// protocol
 * - Metadata endpoints (169.254.x.x)
 */
export const isValidMediaURL = (url: string): { valid: boolean; error?: string } => {
  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    const hostname = urlObj.hostname.toLowerCase();

    // Block localhost variations
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      hostname === '::1'
    ) {
      return { valid: false, error: 'Localhost URLs are not allowed' };
    }

    // Block private IP ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);

    if (ipMatch) {
      const [, oct1, oct2, oct3, oct4] = ipMatch.map(Number);

      // 10.0.0.0/8
      if (oct1 === 10) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }

      // 172.16.0.0/12
      if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }

      // 192.168.0.0/16
      if (oct1 === 192 && oct2 === 168) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }

      // 169.254.0.0/16 (AWS metadata)
      if (oct1 === 169 && oct2 === 254) {
        return { valid: false, error: 'Metadata service URLs are not allowed' };
      }
    }

    // URL seems valid
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
};

/**
 * Sanitizes text input to prevent XSS attacks
 * Removes HTML tags and script content
 */
export const sanitizeText = (text: string, maxLength: number = 500): string => {
  if (!text) return '';

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove potential javascript: or data: URIs
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');

  // Trim and limit length
  sanitized = sanitized.trim().substring(0, maxLength);

  return sanitized;
};

/**
 * Validates media type enum
 */
export const isValidMediaType = (type: string): boolean => {
  return ['IMAGE', 'VIDEO'].includes(type);
};

/**
 * Validates exercise type enum
 */
export const isValidExerciseType = (type: string): boolean => {
  return ['system', 'custom'].includes(type);
};

/**
 * Validates sort order is within acceptable range
 */
export const isValidSortOrder = (order: any): boolean => {
  const num = Number(order);
  return !isNaN(num) && Number.isInteger(num) && num >= -1000 && num <= 1000;
};

/**
 * Sanitizes error messages to prevent information leakage
 */
export const sanitizeErrorMessage = (error: any): string => {
  // Default safe error message
  const safeMessage = 'An error occurred while processing your request';

  if (!error) return safeMessage;

  // Known safe error messages
  const safeErrors = [
    'Media not found',
    'Exercise not found',
    'Unauthorized',
    'Forbidden',
    'Invalid input',
    'Invalid UUID format',
    'Invalid URL',
    'Invalid media type',
    'Only admins can modify system exercises',
    'You can only modify your own exercises',
  ];

  const errorMessage = error.message || String(error);

  // Check if error message is in safe list
  if (safeErrors.some(safe => errorMessage.includes(safe))) {
    return errorMessage;
  }

  // For all other errors, return generic message
  return safeMessage;
};

/**
 * In-memory rate limiter
 * Prevents abuse by tracking request counts per IP/user
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export const checkRateLimit = (
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): { allowed: boolean; retryAfter?: number } => {
  const now = Date.now();
  const record = rateLimitStore[identifier];

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    Object.keys(rateLimitStore).forEach(key => {
      if (rateLimitStore[key].resetTime < now) {
        delete rateLimitStore[key];
      }
    });
  }

  if (!record || record.resetTime < now) {
    // First request or window expired
    rateLimitStore[identifier] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  // Increment count
  record.count++;
  return { allowed: true };
};

// ============================================
// AUTH & USER INPUT VALIDATION
// ============================================

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const validatePasswordStrength = (
  password: string
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Passord må være minst 8 tegn');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Passord må inneholde minst én stor bokstav');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Passord må inneholde minst én liten bokstav');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Passord må inneholde minst ett tall');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Passord må inneholde minst ett spesialtegn');
  }

  // Check against common passwords
  const commonPasswords = [
    'password',
    '12345678',
    'password123',
    'qwerty123',
    'admin123',
    'welcome123',
    'Password1!',
  ];

  if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    errors.push('Passord er for vanlig. Velg et mer unikt passord');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validates Norwegian phone number
 * Accepts formats: +47XXXXXXXX, 47XXXXXXXX, XXXXXXXX
 */
export const isValidPhone = (phone: string): boolean => {
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Norwegian phone patterns
  const patterns = [
    /^\+47[0-9]{8}$/, // +47XXXXXXXX
    /^47[0-9]{8}$/, // 47XXXXXXXX
    /^[0-9]{8}$/, // XXXXXXXX
    /^[0-9]{3}[0-9]{2}[0-9]{3}$/, // XXX XX XXX
  ];

  return patterns.some(pattern => pattern.test(cleaned));
};

/**
 * Validates name fields (firstName, lastName)
 * Only allows letters, spaces, hyphens, and apostrophes
 */
export const isValidName = (name: string): boolean => {
  if (!name || name.length < 2 || name.length > 50) {
    return false;
  }

  // Allow letters (including Norwegian), spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-ZæøåÆØÅ\s\-']+$/;
  return nameRegex.test(name);
};

/**
 * Validates date is not in the future and person is at least 13 years old
 */
export const isValidDateOfBirth = (dateString: string): boolean => {
  try {
    const date = new Date(dateString);
    const now = new Date();

    // Check if valid date
    if (isNaN(date.getTime())) {
      return false;
    }

    // Check not in future
    if (date > now) {
      return false;
    }

    // Check age is at least 13 (COPPA compliance)
    const age = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    const dayDiff = now.getDate() - date.getDate();

    const actualAge =
      monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    return actualAge >= 13 && actualAge <= 120;
  } catch {
    return false;
  }
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};
