import crypto from 'crypto';

// AES-256-GCM encryption for secure credential storage
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Get encryption key from environment variable or generate a secure default
 * WARNING: In production, ALWAYS set ENCRYPTION_KEY environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    console.warn('WARNING: ENCRYPTION_KEY not set in environment. Using default key. Set ENCRYPTION_KEY in production!');
    // Fallback for development - DO NOT use in production
    return crypto.scryptSync('default-encryption-key-change-me', 'salt', 32);
  }

  // Derive a 32-byte key from the environment variable using scrypt
  return crypto.scryptSync(key, 'oblikey-payment-salt', 32);
}

/**
 * Encrypt sensitive data (e.g., payment provider credentials)
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedText - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Interface for Vipps credentials
 */
export interface VippsCredentials {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string; // Ocp-Apim-Subscription-Key
  merchantSerialNumber: string; // MSN
}

/**
 * Interface for Stripe credentials
 */
export interface StripeCredentials {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
}

/**
 * Interface for card payment credentials (generic processor)
 */
export interface CardCredentials {
  apiKey: string;
  merchantId: string;
  [key: string]: string; // Allow additional provider-specific fields
}

/**
 * Union type for all payment credentials
 */
export type PaymentCredentials = VippsCredentials | StripeCredentials | CardCredentials;

/**
 * Encrypt payment provider credentials
 * @param credentials - Credentials object to encrypt
 * @returns Encrypted credentials string
 */
export function encryptCredentials(credentials: PaymentCredentials): string {
  const jsonString = JSON.stringify(credentials);
  return encrypt(jsonString);
}

/**
 * Decrypt payment provider credentials
 * @param encryptedCredentials - Encrypted credentials string
 * @returns Decrypted credentials object
 */
export function decryptCredentials<T = PaymentCredentials>(encryptedCredentials: string): T {
  const decryptedString = decrypt(encryptedCredentials);
  return JSON.parse(decryptedString) as T;
}

/**
 * Hash sensitive data for comparison (one-way)
 * Useful for comparing secrets without storing them in plain text
 */
export function hashSecret(secret: string): string {
  return crypto
    .createHash('sha256')
    .update(secret)
    .digest('hex');
}

/**
 * Generate a secure random token
 * Useful for generating webhook secrets
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
