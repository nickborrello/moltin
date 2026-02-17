import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

const SLOW_QUERY_THRESHOLD_MS = 1000;
const PERFORMANCE_LOG_ENABLED = process.env.PERFORMANCE_LOG === 'true';

export interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  duration: number;
  statusCode: number;
  timestamp: string;
  queryCount?: number;
  slowQueries?: Array<{
    query: string;
    duration: number;
  }>;
}

const requestTimings = new Map<string, number>();
const queryTimings = new Map<string, number>();

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function startRequestTiming(requestId: string): void {
  requestTimings.set(requestId, Date.now());
}

export function endRequestTiming(requestId: string): number | null {
  const start = requestTimings.get(requestId);
  if (!start) return null;
  const duration = Date.now() - start;
  requestTimings.delete(requestId);
  return duration;
}

export function logQueryTiming(queryName: string, duration: number): void {
  queryTimings.set(queryName, duration);
  if (duration > SLOW_QUERY_THRESHOLD_MS && PERFORMANCE_LOG_ENABLED) {
    console.warn(`[SLOW QUERY] ${queryName}: ${duration}ms`);
  }
}

export function getQueryTimings(): Array<{ query: string; duration: number }> {
  const timings = Array.from(queryTimings.entries()).map(([query, duration]) => ({
    query,
    duration,
  }));
  queryTimings.clear();
  return timings;
}

export function clearQueryTimings(): void {
  queryTimings.clear();
}

export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  if (!PERFORMANCE_LOG_ENABLED) return;
  
  const isSlow = metrics.duration > SLOW_QUERY_THRESHOLD_MS;
  const logFn = isSlow ? console.warn : console.log;
  
  logFn(`[PERF] ${metrics.method} ${metrics.url} - ${metrics.duration}ms (${metrics.statusCode})`);
  
  if (metrics.slowQueries && metrics.slowQueries.length > 0) {
    console.warn(`[PERF] Slow queries:`, metrics.slowQueries);
  }
}

export function createPerformanceMiddleware() {
  return async function performanceMiddleware(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    startRequestTiming(requestId);
    
    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;
      const slowQueries = getQueryTimings();
      
      const metrics: PerformanceMetrics = {
        requestId,
        method: request.method,
        url: request.url,
        duration,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
        slowQueries: slowQueries.length > 0 ? slowQueries : undefined,
      };
      
      logPerformanceMetrics(metrics);
      
      response.headers.set('X-Request-Id', requestId);
      response.headers.set('X-Response-Time', `${duration}ms`);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[PERF ERROR] ${request.method} ${request.url} - ${duration}ms`, error);
      throw error;
    } finally {
      endRequestTiming(requestId);
    }
  };
}

export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
}

export const DEFAULT_PAGINATION: PaginationConfig = {
  defaultLimit: 20,
  maxLimit: 100,
};

export function normalizePaginationParams(
  page?: number | string,
  limit?: number | string
): { page: number; limit: number; offset: number } {
  const parsedPage = parseInt(String(page || '1'), 10);
  const parsedLimit = parseInt(String(limit || String(DEFAULT_PAGINATION.defaultLimit)), 10);
  
  const safePage = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
  const safeLimit = Math.min(
    DEFAULT_PAGINATION.maxLimit,
    Math.max(1, isNaN(parsedLimit) ? DEFAULT_PAGINATION.defaultLimit : parsedLimit)
  );
  
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}

export function calculatePaginationMetadata(
  total: number,
  page: number,
  limit: number
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
} {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page * limit < total;
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore,
  };
}

export async function getDatabaseStats(): Promise<{
  tableStats: Array<{ table: string; rowCount: number }>;
  indexStats: Array<{ indexname: string; tablename: string; size: string }>;
}> {
  try {
    const tableStats = await db
      .select({ table: sql`tablename`, rowCount: sql`n_live_tup` })
      .from(sql`pg_stat_user_tables`)
      .where(sql`schemaname = 'public'`);
    
    const indexStats = await db
      .select({
        indexname: sql`indexname`,
        tablename: sql`relname`,
        size: sql`pg_size_pretty(pg_relation_size(indexrelid))`,
      })
      .from(sql`pg_stat_user_indexes`)
      .where(sql`schemaname = 'public'`);
    
    return {
      tableStats: tableStats.map((t: any) => ({
        table: t.table,
        rowCount: Number(t.rowCount) || 0,
      })),
      indexStats: indexStats.map((i: any) => ({
        indexname: i.indexname,
        tablename: i.tablename,
        size: i.size,
      })),
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return { tableStats: [], indexStats: [] };
  }
}

export async function explainQuery(query: string): Promise<any> {
  try {
    const result = await db.execute(sql`EXPLAIN (FORMAT JSON) ${sql`${query}`}`);
    return result;
  } catch (error) {
    console.error('Failed to explain query:', error);
    return null;
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}
