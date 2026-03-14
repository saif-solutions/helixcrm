import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class WebhookResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  url: string;

  @Expose()
  events: string[];

  @Expose()
  isActive: boolean;

  @Expose()
  retryCount: number;

  @Expose()
  timeoutMs: number;

  @Expose()
  headers: Record<string, string>;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Exclude()
  secret?: string;
}
