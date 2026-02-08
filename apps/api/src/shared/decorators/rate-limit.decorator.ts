import { SetMetadata } from '@nestjs/common';

interface RateLimitOptions {
  points: number;
  duration: number;
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata('rate-limit', options);
