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

  // Public services for direct access
  public readonly password: PasswordService;
  public readonly jwt: JwtService;
  public readonly tokenManager: TokenManager;
  public readonly authCore: AuthCoreContract;

  // Public repositories for transaction use
  public readonly tokenRepository: TokenRepository;
  public readonly userRepository: UserRepository;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepositoryBridge: PrismaUserRepositoryBridge,
    private readonly tokenRepositoryBridge: PrismaTokenRepositoryBridge,
  ) {}

  async initialize(config: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiration?: string;
    jwtRefreshExpiration?: string;
  }): Promise<void> {
    try {
      this.logger.log('Initializing AuthCore adapter...');

      // Create individual services
      const jwtService = new JwtService({
        secret: config.jwtSecret,
        expiresIn: config.jwtExpiration || '15m',
      });

      const passwordService = new PasswordService();

      const tokenManager = new TokenManager({
        refreshTokenSecret: config.jwtRefreshSecret,
        refreshTokenExpiresIn: config.jwtRefreshExpiration || '7d',
        tokenRepository: this.tokenRepositoryBridge,
      });

      // Create the auth core contract
      const authCore = createAuthCore(
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

      // Assign to public readonly properties
      (this as any).jwt = jwtService;
      (this as any).password = passwordService;
      (this as any).tokenManager = tokenManager;
      (this as any).authCore = authCore;
      (this as any).tokenRepository = this.tokenRepositoryBridge;
      (this as any).userRepository = this.userRepositoryBridge;

      this.logger.log('✅ AuthCore adapter initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize AuthCore adapter', error);
      throw error;
    }
  }

  // Transaction support
  async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback);
  }

  async onModuleInit() {
    await this.initialize({
      jwtSecret: process.env.JWT_ACCESS_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
      jwtExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
      jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    });
  }
}
