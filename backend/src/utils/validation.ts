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
