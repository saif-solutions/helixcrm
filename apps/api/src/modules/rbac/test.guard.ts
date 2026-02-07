import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class TestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    console.log('✅ TEST GUARD RUNNING');
    return true;
  }
}
