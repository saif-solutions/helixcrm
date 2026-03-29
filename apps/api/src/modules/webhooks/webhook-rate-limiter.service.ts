// apps/api/src/modules/webhooks/webhook-rate-limiter.service.ts
import { Injectable, Logger } from '@nestjs/common';

interface RateLimitConfig {
  domain: string;
  limit: number; // requests per minute
  windowMs: number;
}

@Injectable()
export class WebhookRateLimiterService {
  private readonly logger = new Logger(WebhookRateLimiterService.name);
  private readonly rateLimits: Map<string, RateLimitConfig> = new Map();
  private readonly requestCounts: Map<
    string,
    { count: number; resetAt: Date }
  > = new Map();

  constructor() {
    this.initializeDefaultLimits();
  }

  private initializeDefaultLimits(): void {
    // Default: 60 requests per minute per domain
    this.rateLimits.set('default', {
      domain: 'default',
      limit: 60,
      windowMs: 60000,
    });
  }

  isRateLimited(url: string): boolean {
    const domain = this.extractDomain(url);
    const config = this.rateLimits.get(domain);

    // Use default config if domain-specific config doesn't exist
    const effectiveConfig = config ?? this.rateLimits.get('default');
    if (!effectiveConfig) {
      // Fallback if even default is missing (should never happen)
      return false;
    }

    const now = new Date();
    const key = domain;

    let record = this.requestCounts.get(key);
    if (!record || record.resetAt < now) {
      record = {
        count: 0,
        resetAt: new Date(now.getTime() + effectiveConfig.windowMs),
      };
      this.requestCounts.set(key, record);
    }

    record.count++;
    const isLimited = record.count > effectiveConfig.limit;

    if (isLimited) {
      this.logger.warn(`Rate limit exceeded for domain: ${domain}`, {
        domain,
        limit: effectiveConfig.limit,
        count: record.count,
        resetAt: record.resetAt,
      });
    }

    return isLimited;
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return 'unknown';
    }
  }

  getRateLimitInfo(url: string): {
    limit: number;
    remaining: number;
    resetAt: Date;
  } {
    const domain = this.extractDomain(url);
    const config = this.rateLimits.get(domain);
    const effectiveConfig = config ?? this.rateLimits.get('default');

    const defaultLimit = 60;
    const defaultWindowMs = 60000;

    const limit = effectiveConfig?.limit ?? defaultLimit;
    const record = this.requestCounts.get(domain);
    const remaining = record ? Math.max(0, limit - record.count) : limit;

    return {
      limit,
      remaining,
      resetAt: record?.resetAt ?? new Date(Date.now() + defaultWindowMs),
    };
  }

  configureRateLimit(domain: string, limit: number, windowMs: number): void {
    this.rateLimits.set(domain, { domain, limit, windowMs });
    this.logger.log(
      `Rate limit configured for ${domain}: ${limit} requests per ${windowMs}ms`,
    );
  }
}
