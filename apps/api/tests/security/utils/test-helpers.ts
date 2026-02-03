// Security Test Utilities
// Reusable helpers for security invariant testing

import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface TestUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

export interface TestOrganization {
  id: string;
  name: string;
}

export class SecurityTestHelpers {
  constructor(
    private prisma: PrismaClient,
    private jwtService: JwtService,
  ) {}

  /**
   * Create a test organization for isolation testing
   */
  async createTestOrganization(name: string): Promise<TestOrganization> {
    const org = await this.prisma.organization.create({
      data: {
        name: `${name}_${Date.now()}`,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        settings: {},
      },
    });
    return { id: org.id, name: org.name };
  }

  /**
   * Create a test user with specific permissions
   */
  async createTestUser(
    email: string,
    organizationId: string,
    role: string = 'user',
  ): Promise<TestUser> {
    // Create a dummy password hash for test users
    const dummyPasswordHash = await bcrypt.hash('testpassword123', 10);
    
    // Use Prisma's type-safe create with proper structure
    const user = await this.prisma.user.create({
      data: {
        email: `${email}_${Date.now()}@test.com`,
        passwordHash: dummyPasswordHash,
        organization: {
          connect: {
            id: organizationId,
          },
        },
        role,
        isActive: true,
      },
    });
    return { id: user.id, email: user.email, organizationId: user.organizationId, role: user.role };
  }

  /**
   * Generate a JWT token for testing
   */
  generateTestToken(userId: string, organizationId: string, permissions: string[] = []): string {
    const payload = {
      sub: userId,
      organizationId,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(userIds: string[], organizationIds: string[]): Promise<void> {
    if (userIds.length > 0) {
      await this.prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    
    if (organizationIds.length > 0) {
      await this.prisma.organization.deleteMany({
        where: { id: { in: organizationIds } },
      });
    }
  }
}
