import { SetMetadata } from '@nestjs/common';

export const PerformanceMonitor = (operation: string) => 
  SetMetadata('performance-monitor', operation);