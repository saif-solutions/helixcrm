import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  UserRepository,
  User,
  CreateUserParams,
  UpdateUserParams,
  FindUserByEmailParams,
  FindUserByIdParams,
} from './auth-core.interfaces';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(params: FindUserByEmailParams): Promise<User | null> {
    const normalizedEmail = params.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        UserRoles: {
          where: {
            organizationId: params.organizationId,
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

    // Extract permissions from UserRoles (matching existing pattern)
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
      permissions: Array.from(permissions),
      roles: Array.from(roles),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findById(params: FindUserByIdParams): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        UserRoles: {
          where: {
            organizationId: params.organizationId,
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

    // Extract permissions (same pattern as findByEmail)
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
      permissions: Array.from(permissions),
      roles: Array.from(roles),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(params: CreateUserParams): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: params.email.toLowerCase().trim(),
        passwordHash: params.passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
        organizationId: params.organizationId,
        isActive: params.isActive ?? true,
        tokenVersion: params.tokenVersion ?? 1,
        refreshTokenHash: params.refreshTokenHash,
        refreshTokenVersion: params.refreshTokenVersion,
      },
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
      permissions: [],
      roles: [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async update(params: UpdateUserParams): Promise<User> {
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

    const user = await this.prisma.user.update({
      where: { id: params.userId },
      data: updateData,
    });

    // Need to fetch permissions separately since update doesn't include relations
    const userWithPermissions = await this.findById({
      userId: params.userId,
      organizationId: user.organizationId,
    });

    return (
      userWithPermissions || {
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
        permissions: [],
        roles: [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    );
  }

  async updateTokenVersion(
    userId: string,
    increment: number = 1,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment },
      },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const count = await this.prisma.user.count({
      where: { email: normalizedEmail },
    });
    return count > 0;
  }
}
