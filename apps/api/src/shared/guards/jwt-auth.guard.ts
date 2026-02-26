import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Standard JWT authentication guard.
 *
 * Benefits:
 * - Avoids repeating AuthGuard('jwt') everywhere
 * - Central place for future enhancements
 * - Cleaner controller decorators
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}