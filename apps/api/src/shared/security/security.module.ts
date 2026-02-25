import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigService } from '@nestjs/config';

@Global() // This makes all exports available globally
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', '15m'),
          issuer: config.get('JWT_ISSUER', 'helixcrm'),
          audience: config.get('JWT_AUDIENCE', 'helixcrm-client'),
        },
        verifyOptions: {
          issuer: config.get('JWT_ISSUER', 'helixcrm'),
          audience: config.get('JWT_AUDIENCE', 'helixcrm-client'),
        },
      }),
    }),
  ],
  exports: [JwtModule, PrismaModule],
})
export class SecurityModule {}
