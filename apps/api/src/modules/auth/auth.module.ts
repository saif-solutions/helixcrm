import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetController } from './controllers/password-reset.controller';
import { PasswordResetService } from './services/password-reset.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [
    // PrismaModule is now globally available via SecurityModule
    // JwtModule is now globally available via SecurityModule
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [AuthService, PasswordResetService],
  exports: [AuthService, PasswordResetService], // No JwtModule export needed
})
export class AuthModule {}