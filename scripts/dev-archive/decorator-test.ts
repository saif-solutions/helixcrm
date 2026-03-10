// Simple test to check if decorators work
import { Controller, Get } from '@nestjs/common';

@Controller('test')
class TestController {
  @Get()
  getTest() {
    return { message: 'test' };
  }
}

console.log('Decorator test created');
