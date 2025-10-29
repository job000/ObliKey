/**
 * User Service
 *
 * This service contains all business logic for user operations.
 * It follows the Single Responsibility Principle and can be easily
 * reused across different projects or contexts.
 *
 * Benefits:
 * - Separation of concerns (business logic separated from HTTP layer)
 * - Testable (can be unit tested without HTTP context)
 * - Reusable (can be used in CLI, jobs, or other contexts)
 * - Maintainable (changes to business logic don't affect controller)
 */

import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import {
  validateEmail,
  validatePasswordStrength,
  validateUsername,
  validateRole,
  validatePhone,
  validateRequiredString,
  validateDateOfBirth,
} from '../validators/user.validators';
import type { ValidationResult } from '../validators/user.validators';
import {
  CreateUserDto,
  UserResponseDto,
  ValidationErrorDto,
} from '../dto/create-user.dto';

export class UserService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    // Dependency injection pattern - allows for easy testing with mock Prisma
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Validates CreateUserDto and returns validation errors if any
   */
  private validateCreateUserDto(
    dto: CreateUserDto,
    allowedRoles: string[]
  ): ValidationErrorDto[] {
    const errors: ValidationErrorDto[] = [];

    // Validate required fields
    const firstNameValidation = validateRequiredString(dto.firstName, 'Fornavn', 1, 50);
    if (!firstNameValidation.valid) {
      errors.push({ field: 'firstName', message: firstNameValidation.message! });
    }

    const lastNameValidation = validateRequiredString(dto.lastName, 'Etternavn', 1, 50);
    if (!lastNameValidation.valid) {
      errors.push({ field: 'lastName', message: lastNameValidation.message! });
    }

    // Validate email
    const emailValidation = validateEmail(dto.email);
    if (!emailValidation.valid) {
      errors.push({ field: 'email', message: emailValidation.message! });
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(dto.password);
    if (!passwordValidation.valid) {
      errors.push({ field: 'password', message: passwordValidation.message! });
    }

    // Validate role
    const roleValidation = validateRole(dto.role, allowedRoles);
    if (!roleValidation.valid) {
      errors.push({ field: 'role', message: roleValidation.message! });
    }

    // Validate optional username if provided
    if (dto.username) {
      const usernameValidation = validateUsername(dto.username);
      if (!usernameValidation.valid) {
        errors.push({ field: 'username', message: usernameValidation.message! });
      }
    }

    // Validate optional phone if provided
    if (dto.phone) {
      const phoneValidation = validatePhone(dto.phone);
      if (!phoneValidation.valid) {
        errors.push({ field: 'phone', message: phoneValidation.message! });
      }
    }

    // Validate optional date of birth if provided
    if (dto.dateOfBirth) {
      const dobValidation = validateDateOfBirth(dto.dateOfBirth);
      if (!dobValidation.valid) {
        errors.push({ field: 'dateOfBirth', message: dobValidation.message! });
      }
    }

    return errors;
  }

  /**
   * Generates a unique username for the user
   * @param firstName - User's first name
   * @param lastName - User's last name
   * @param tenantId - Tenant ID for uniqueness check
   * @returns A unique username
   */
  private async generateUniqueUsername(
    firstName: string,
    lastName: string,
    tenantId: string
  ): Promise<string> {
    // Create base username from name (lowercase, no special chars)
    const baseUsername = `${firstName}${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    let username = baseUsername;
    let counter = 1;

    // Keep trying until we find a unique username
    while (
      await this.prisma.user.findFirst({
        where: { tenantId, username },
      })
    ) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  /**
   * Checks if an email already exists in the tenant
   * @param email - Email to check
   * @param tenantId - Tenant ID
   * @returns true if email exists, false otherwise
   */
  async emailExists(email: string, tenantId: string): Promise<boolean> {
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: email.toLowerCase().trim(),
      },
    });

    return existing !== null;
  }

  /**
   * Checks if a username already exists in the tenant
   * @param username - Username to check
   * @param tenantId - Tenant ID
   * @returns true if username exists, false otherwise
   */
  async usernameExists(username: string, tenantId: string): Promise<boolean> {
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId,
        username: username.trim(),
      },
    });

    return existing !== null;
  }

  /**
   * Creates a new user
   *
   * This method encapsulates all business logic for user creation:
   * - Input validation
   * - Email uniqueness check
   * - Username generation/validation
   * - Password hashing
   * - Database persistence
   *
   * @param dto - User creation data
   * @param tenantId - Tenant ID (from authenticated user)
   * @param allowedRoles - Roles that can be assigned (security constraint)
   * @returns Created user or validation errors
   */
  async createUser(
    dto: CreateUserDto,
    tenantId: string,
    allowedRoles: string[] = ['CUSTOMER', 'TRAINER']
  ): Promise<{ success: true; data: UserResponseDto } | { success: false; errors: ValidationErrorDto[] }> {
    // Validate input
    const validationErrors = this.validateCreateUserDto(dto, allowedRoles);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    // Check if email already exists
    const emailAlreadyExists = await this.emailExists(dto.email, tenantId);
    if (emailAlreadyExists) {
      return {
        success: false,
        errors: [{ field: 'email', message: 'E-postadressen er allerede i bruk' }],
      };
    }

    // Handle username
    let finalUsername = dto.username;

    if (finalUsername) {
      // If username provided, check if it's already taken
      const usernameAlreadyExists = await this.usernameExists(finalUsername, tenantId);
      if (usernameAlreadyExists) {
        return {
          success: false,
          errors: [{ field: 'username', message: 'Brukernavnet er allerede tatt' }],
        };
      }
    } else {
      // Generate unique username
      finalUsername = await this.generateUniqueUsername(
        dto.firstName,
        dto.lastName,
        tenantId
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role,
        phone: dto.phone ? dto.phone.trim() : null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        username: finalUsername,
        active: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        username: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { success: true, data: user };
  }

  /**
   * Get user by ID
   * @param userId - User ID
   * @param tenantId - Tenant ID (for security - ensures user belongs to tenant)
   * @returns User or null if not found
   */
  async getUserById(
    userId: string,
    tenantId: string
  ): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        username: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Get all users for a tenant
   * @param tenantId - Tenant ID
   * @returns Array of users
   */
  async getUsersByTenant(tenantId: string): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        username: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  /**
   * Cleanup method - closes Prisma connection
   * Call this when shutting down the service
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
