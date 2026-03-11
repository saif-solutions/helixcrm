import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './src/shared/prisma/prisma.module';

// Create a minimal module with just Config and Prisma
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
})
class TestModule {}

async function bootstrap() {
  console.log('Testing minimal module...');

  try {
    const app = await NestFactory.createApplicationContext(TestModule);
    console.log('✅ Minimal module works!');
    await app.close();
    return true;
  } catch (error: any) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Need to define Module decorator
import { Module } from '@nestjs/common';

bootstrap()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch(console.error);
