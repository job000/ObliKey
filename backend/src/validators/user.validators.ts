/**
 * Reusable User Validators
 *
 * These validators can be used across the application for consistent validation.
 * They follow a functional programming approach and return validation results
 * that can be easily composed and reused.
 */

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'E-post er påkrevd' };
  }

  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { valid: false, message: 'E-post er påkrevd' };
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, message: 'Ugyldig e-postadresse' };
  }

  return { valid: true };
}

/**
 * Validates password strength
 */
export function validatePasswordStrength(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Passord er påkrevd' };
  }

  if (password.length < 8) {
    return {
      valid: false,
      message: 'Passordet må være minst 8 tegn langt'
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      message: 'Passordet kan ikke være lengre enn 128 tegn'
    };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Passordet må inneholde minst én stor bokstav'
    };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Passordet må inneholde minst én liten bokstav'
    };
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Passordet må inneholde minst ett tall'
    };
  }

  return { valid: true };
}

/**
 * Validates username format
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Brukernavn er påkrevd' };
  }

  const trimmedUsername = username.trim();

  if (trimmedUsername.length < 3) {
    return {
      valid: false,
      message: 'Brukernavn må være minst 3 tegn'
    };
  }

  if (trimmedUsername.length > 20) {
    return {
      valid: false,
      message: 'Brukernavn kan ikke være lengre enn 20 tegn'
    };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmedUsername)) {
    return {
      valid: false,
      message: 'Brukernavn kan bare inneholde bokstaver, tall og understrek'
    };
  }

  return { valid: true };
}

/**
 * Validates user role
 * @param role - The role to validate
 * @param allowedRoles - Array of allowed roles
 */
export function validateRole(
  role: string,
  allowedRoles: string[]
): ValidationResult {
  if (!role || typeof role !== 'string') {
    return { valid: false, message: 'Rolle er påkrevd' };
  }

  if (!allowedRoles.includes(role)) {
    return {
      valid: false,
      message: `Rollen må være en av følgende: ${allowedRoles.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validates phone number format (Norwegian)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: true }; // Phone is optional
  }

  const trimmedPhone = phone.trim();

  if (!trimmedPhone) {
    return { valid: true }; // Empty is valid (optional field)
  }

  // Norwegian phone number: +47 followed by 8 digits or just 8 digits
  const phoneRegex = /^(\+47)?[0-9]{8}$/;
  const cleanedPhone = trimmedPhone.replace(/\s/g, '');

  if (!phoneRegex.test(cleanedPhone)) {
    return {
      valid: false,
      message: 'Ugyldig telefonnummer. Bruk formatet: +47 12345678 eller 12345678'
    };
  }

  return { valid: true };
}

/**
 * Validates required string field
 */
export function validateRequiredString(
  value: any,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 255
): ValidationResult {
  if (!value || typeof value !== 'string') {
    return { valid: false, message: `${fieldName} er påkrevd` };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return {
      valid: false,
      message: `${fieldName} må være minst ${minLength} tegn`
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      message: `${fieldName} kan ikke være lengre enn ${maxLength} tegn`
    };
  }

  return { valid: true };
}

/**
 * Validates date of birth
 */
export function validateDateOfBirth(dateOfBirth: any): ValidationResult {
  if (!dateOfBirth) {
    return { valid: true }; // Optional field
  }

  const date = new Date(dateOfBirth);

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      message: 'Ugyldig fødselsdato format'
    };
  }

  const now = new Date();
  const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
  const maxDate = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate());

  if (date < minDate) {
    return {
      valid: false,
      message: 'Ugyldig fødselsdato (for gammel)'
    };
  }

  if (date > maxDate) {
    return {
      valid: false,
      message: 'Bruker må være minst 13 år gammel'
    };
  }

  return { valid: true };
}
