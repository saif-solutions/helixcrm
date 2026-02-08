import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [ConfigModule], // Add ConfigModule import
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
