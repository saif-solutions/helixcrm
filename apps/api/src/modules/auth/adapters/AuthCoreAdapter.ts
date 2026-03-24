// apps/api/src/modules/auth/adapters/AuthCoreAdapter.ts

import { OnModuleInit, Injectable, Logger } from '@nestjs/common';
import {
  createAuthCore,
  AuthCoreContract,
  PasswordService,
  JwtService,
  TokenManager,
  TokenRepository,
  UserRepository,
} from '@helixcrm/auth-core';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PrismaUserRepositoryBridge } from './PrismaUserRepositoryBridge';
import { PrismaTokenRepositoryBridge } from './PrismaTokenRepositoryBridge';

@Injectable()
export class AuthCoreAdapter implements OnModuleInit {
  private readonly logger = new Logger(AuthCoreAdapter.name);
  private isInitialized = false;

  // Public services for direct access
  public password!: PasswordService;
  public jwt!: JwtService;
  public tokenManager!: TokenManager;
  public authCore!: AuthCoreContract;

  // Public repositories for transaction use
  public tokenRepository!: TokenRepository;
  public userRepository!: UserRepository;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepositoryBridge: PrismaUserRepositoryBridge,
    private readonly tokenRepositoryBridge: PrismaTokenRepositoryBridge,
  ) {}

  initialize(config: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiration?: string;
    jwtRefreshExpiration?: string;
  }): void {
    try {
      this.logger.log('Initializing AuthCore adapter...');

      // Validate required config
      if (!config.jwtSecret) {
        throw new Error('JWT_ACCESS_SECRET is required');
      }
      if (!config.jwtRefreshSecret) {
        throw new Error('JWT_REFRESH_SECRET is required');
      }

      // Create individual services
      this.jwt = new JwtService({
        secret: config.jwtSecret,
        expiresIn: config.jwtExpiration || '15m',
      });

      this.password = new PasswordService();

      this.tokenManager = new TokenManager({
        refreshTokenSecret: config.jwtRefreshSecret,
        refreshTokenExpiresIn: config.jwtRefreshExpiration || '7d',
        tokenRepository: this.tokenRepositoryBridge,
      });

      // Create the auth core contract
      this.authCore = createAuthCore(
        {
          jwtSecret: config.jwtSecret,
          refreshTokenSecret: config.jwtRefreshSecret,
          accessTokenExpiresIn: config.jwtExpiration || '15m',
          refreshTokenExpiresIn: config.jwtRefreshExpiration || '7d',
        },
        {
          tokenRepository: this.tokenRepositoryBridge,
          userRepository: this.userRepositoryBridge,
        },
      );

      // Assign repositories
      this.tokenRepository = this.tokenRepositoryBridge;
      this.userRepository = this.userRepositoryBridge;

      this.isInitialized = true;
      this.logger.log('✅ AuthCore adapter initialized successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Failed to initialize AuthCore adapter: ${errorMessage}`,
        error,
      );
      throw error;
    }
  }

  // Transaction support
  async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback);
  }

  // Synchronous module initialization (no async needed)
  onModuleInit(): void {
    this.initialize({
      jwtSecret: process.env.JWT_ACCESS_SECRET ?? '',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
      jwtExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
      jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    });
  }

  // Helper method to check if adapter is initialized
  isReady(): boolean {
    return this.isInitialized;
  }

  // Helper method to get health status
  getHealthStatus(): {
    initialized: boolean;
    hasJwt: boolean;
    hasRefresh: boolean;
  } {
    return {
      initialized: this.isInitialized,
      hasJwt: !!this.jwt,
      hasRefresh: !!this.tokenManager,
    };
  }
}
