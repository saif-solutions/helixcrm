import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [
    PrismaModule,
    JwtModule, // Add JwtModule to provide JwtService for AuthGuard
  ],
  controllers: [UsersController],
  providers: [UsersService, UserRepository],
  exports: [UsersService],
})
export class UsersModule {}
