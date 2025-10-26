import { prisma } from './prisma';

/**
 * Generate a unique username from email
 * Format: emailPrefix or emailPrefix1, emailPrefix2, etc if taken
 */
export async function generateUsername(email: string, tenantId: string): Promise<string> {
  // Get the part before @
  const emailPrefix = email.split('@')[0].toLowerCase();

  // Remove special characters and keep only alphanumeric
  const baseUsername = emailPrefix.replace(/[^a-z0-9]/g, '');

  // Check if username is available
  let username = baseUsername;
  let counter = 1;

  while (true) {
    const existing = await prisma.user.findFirst({
      where: {
        tenantId,
        username
      }
    });

    if (!existing) {
      return username;
    }

    username = `${baseUsername}${counter}`;
    counter++;
  }
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if user can change username (max 3 times per year)
 */
export function canChangeUsername(
  usernameChangesThisYear: number,
  lastUsernameChangeYear: number | null
): { allowed: boolean; remaining: number; message?: string } {
  const currentYear = new Date().getFullYear();

  // Reset counter if it's a new year
  if (lastUsernameChangeYear !== currentYear) {
    return {
      allowed: true,
      remaining: 3
    };
  }

  // Check if user has reached the limit
  if (usernameChangesThisYear >= 3) {
    return {
      allowed: false,
      remaining: 0,
      message: 'Du har brukt opp alle 3 brukernavn-endringer for i år. Prøv igjen neste år.'
    };
  }

  return {
    allowed: true,
    remaining: 3 - usernameChangesThisYear
  };
}
