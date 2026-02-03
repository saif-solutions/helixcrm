import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  UserRepository,
  User as AuthCoreUser,
} from '@helixcrm/auth-core';

@Injectable()
export class PrismaUserRepositoryBridge implements UserRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Find user by ID (auth-core contract)
   * Returns minimal auth-core User object
   */
async findById(userId: string): Promise<AuthCoreUser | null> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      organizationId: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    failedLoginAttempts: user.failedLoginAttempts,
    accountLockedUntil: user.lockedUntil || undefined,
    organizationId: user.organizationId,
  };
}

  /**
   * Update login attempts count
   */
  async updateLoginAttempts(userId: string, attempts: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
      },
    });
  }

  /**
   * Lock user account
   */
  async lockAccount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lockedUntil: true,
      },
    });

    if (!user || !user.lockedUntil) {
      return false;
    }

    return user.lockedUntil > new Date();
  }

  /**
   * Record a failed login attempt
   * Increments failed attempts and locks account if threshold reached
   */
  async recordFailedAttempt(userId: string): Promise<void> {
    // Get current failed attempts
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        failedLoginAttempts: true,
      },
    });

    if (!user) return;

    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    
    // Update failed attempts
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
      },
    });

    // Lock account if threshold reached (e.g., 5 attempts)
    if (newAttempts >= 5) {
      await this.lockAccount(userId);
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  // ===== Helper Methods for API Business Logic =====
  // These are NOT part of auth-core contract, but needed for API

  /**
   * Find user by email with permissions/roles (API business logic)
   */
  async findByEmailWithPermissions(email: string, organizationId: string): Promise<any> {
    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        UserRoles: {
          where: {
            organizationId,
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Extract permissions and roles
    const permissions = new Set<string>();
    const roles = new Set<string>();

    user.UserRoles.forEach((userRole) => {
      if (userRole.role) {
        roles.add(userRole.role.name);
        
        if (userRole.role.permissions) {
          userRole.role.permissions.forEach((rolePermission) => {
            if (rolePermission.permission) {
              permissions.add(rolePermission.permission.code);
            }
          });
        }
      }
    });

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      isActive: user.isActive,
      tokenVersion: user.tokenVersion,
      refreshTokenHash: user.refreshTokenHash,
      refreshTokenVersion: user.refreshTokenVersion,
      refreshTokenIssuedAt: user.refreshTokenIssuedAt,
      lastLoginAt: user.lastLoginAt,
      lastPasswordChange: user.lastPasswordChange,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      permissions: Array.from(permissions),
      roles: Array.from(roles),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user (API business logic)
   */
  async updateUser(params: any): Promise<any> {
    const updateData: any = {};
    
    if (params.passwordHash !== undefined) {
      updateData.passwordHash = params.passwordHash;
      updateData.lastPasswordChange = new Date();
    }
    
    if (params.tokenVersion !== undefined) {
      updateData.tokenVersion = params.tokenVersion;
    }
    
    if (params.refreshTokenHash !== undefined) {
      updateData.refreshTokenHash = params.refreshTokenHash;
    }
    
    if (params.refreshTokenVersion !== undefined) {
      updateData.refreshTokenVersion = params.refreshTokenVersion;
    }
    
    if (params.refreshTokenIssuedAt !== undefined) {
      updateData.refreshTokenIssuedAt = params.refreshTokenIssuedAt;
    }
    
    if (params.lastLoginAt !== undefined) {
      updateData.lastLoginAt = params.lastLoginAt;
    }
    
    if (params.isActive !== undefined) {
      updateData.isActive = params.isActive;
    }
    
    if (params.failedLoginAttempts !== undefined) {
      updateData.failedLoginAttempts = params.failedLoginAttempts;
    }
    
    if (params.lockedUntil !== undefined) {
      updateData.lockedUntil = params.lockedUntil;
    }

    const user = await this.prisma.user.update({
      where: { id: params.userId },
      data: updateData,
    });

    return user;
  }
}