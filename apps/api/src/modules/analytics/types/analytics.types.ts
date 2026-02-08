import {
  AnalyticsGroupBy,
  ExportFormat,
  AnalyticsExportInclude,
  ActivityType,
} from '../dto/analytics-query.dto';

// ==================== DEAL ANALYTICS TYPES ====================
export interface DealAnalyticsData {
  period: string;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  averageDealValue: number;
  winRate: number;
  salesVelocity?: number; // Average days per stage
  stageConversionRates?: Record<string, number>;
}

export interface DealAnalyticsResponse {
  period: AnalyticsGroupBy;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  averageDealValue: number;
  winRate: number;
  salesVelocity?: number;
  data: DealAnalyticsData[];
  summary: {
    startDate: string;
    endDate: string;
    totalValue: number;
    wonValue: number;
    pipelineId?: string;
  };
}

// ==================== REVENUE ANALYTICS TYPES ====================
export interface RevenueDataPoint {
  period: string;
  revenue: number;
  forecastRevenue?: number;
  dealCount: number;
  averageDealSize: number;
}

export interface RevenueAnalyticsResponse {
  period: AnalyticsGroupBy;
  totalRevenue: number;
  forecastRevenue?: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  currency: string;
  data: RevenueDataPoint[];
  summary: {
    startDate: string;
    endDate: string;
    growthRate: number;
    bestPerformingPipeline?: string;
    topPerformer?: string; // User ID with most revenue
  };
}

// ==================== PIPELINE ANALYTICS TYPES ====================
export interface StageMetrics {
  stageId: string;
  stageName: string;
  order: number;
  dealCount: number;
  totalValue: number;
  averageDuration?: number; // in days
  conversionRate?: number; // percentage to next stage
  probability: number;
}

export interface PipelineAnalyticsResponse {
  pipelineId?: string;
  pipelineName?: string;
  stages: StageMetrics[];
  averageDealDuration?: number;
  bottlenecks?: Array<{
    stageId: string;
    stageName: string;
    averageDuration: number;
    stuckDeals: number;
    recommendation: string;
  }>;
  summary: {
    totalDeals: number;
    totalValue: number;
    averageWinRate: number;
    averageSalesCycle: number;
    createdAt: string;
    updatedAt: string;
  };
}

// ==================== ACTIVITY ANALYTICS TYPES ====================
export interface ActivityRecord {
  id: string;
  type: ActivityType;
  userId: string;
  userEmail?: string;
  userName?: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ActivityAnalyticsResponse {
  totalActivities: number;
  byType: Record<ActivityType, number>;
  recentActivities: ActivityRecord[];
  userActivity?: Array<{
    userId: string;
    userEmail: string;
    userName?: string;
    activityCount: number;
    lastActive: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== EXPORT TYPES ====================
export interface ExportJob {
  exportId: string;
  organizationId: string;
  userId: string;
  format: ExportFormat;
  include: AnalyticsExportInclude[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadToken: string;
  downloadUrl?: string;
  fileSize?: number;
  recordCount?: number;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
}

export interface ExportResponse {
  exportId: string;
  downloadToken: string;
  status: string;
  estimatedCompletion: string;
  downloadUrl: string;
}

// ==================== CACHE KEYS ====================
export enum AnalyticsCacheKeys {
  DEALS_ANALYTICS = 'analytics:deals',
  REVENUE_ANALYTICS = 'analytics:revenue',
  PIPELINE_ANALYTICS = 'analytics:pipeline',
  ACTIVITY_ANALYTICS = 'analytics:activity',
  EXPORT_STATUS = 'analytics:export:status',
}

// ==================== DATABASE TYPES ====================
export interface DealStageDuration {
  dealId: string;
  stageId: string;
  stageName: string;
  enteredAt: string;
  exitedAt?: string;
  duration?: number; // in days
}

export interface RevenueForecast {
  period: string;
  expectedRevenue: number;
  probability: number;
  dealCount: number;
}
