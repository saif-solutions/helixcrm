// hooks/useAuditLogs.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AuditLog,
  PaginatedAuditLogs,
  AuditLogQueryParams,
  AuditStats,
  AuditTrendData,
  ActorActivity,
  AuditAlert,
  RealTimeAuditEvent,
  AuditExportRequest,
} from '../lib/types/audit.types'; // Changed from '../../' to '../'

// Configuration constants
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_DEBOUNCE_MS = 300;
const WS_RECONNECT_ATTEMPTS = 5;
const WS_RECONNECT_DELAY_MS = 1000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 1000;

// Local storage key for persistent filters
const FILTERS_STORAGE_KEY = 'auditFilters';

interface UseAuditLogsReturn {
  // Data states
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  stats: AuditStats | null;
  trends: AuditTrendData[];
  actors: ActorActivity[];
  alerts: AuditAlert[];
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Current filters
  filters: AuditLogQueryParams;
  
  // Actions
  fetchLogs: (params?: AuditLogQueryParams) => Promise<void>;
  fetchStats: (params?: Partial<AuditLogQueryParams>) => Promise<void>;
  fetchTrends: (days: number) => Promise<void>;
  fetchActors: (limit?: number) => Promise<void>;
  fetchAlerts: () => Promise<void>;
  exportLogs: (request: AuditExportRequest) => Promise<Blob>;
  acknowledgeAlert: (alertId: string, userId: string) => Promise<void>;
  setFilters: (filters: AuditLogQueryParams) => void;
  clearFilters: () => void;
  refreshAll: () => Promise<void>;
  cancelRequests: () => void;
}

// Helper function to build query string from filters with validation
// Helper function to build query string from filters with validation
const buildQueryString = (params: AuditLogQueryParams): string => {
  const searchParams = new URLSearchParams();
  
  // Validate and fix date range if needed
  const validatedParams = { ...params };
  
  if (validatedParams.from && validatedParams.to) {
    const fromDate = new Date(validatedParams.from);
    const toDate = new Date(validatedParams.to);
    
    if (fromDate > toDate) {
      // Swap dates if from is after to
      const temp = validatedParams.from;
      validatedParams.from = validatedParams.to;
      validatedParams.to = temp;
    }
    
    // Ensure to date is not in the future
    const now = new Date();
    const toDateObj = new Date(validatedParams.to);
    if (toDateObj > now) {
      validatedParams.to = now.toISOString().split('T')[0];
    }
  }
  
  Object.entries(validatedParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        searchParams.set(key, value.join(','));
      }
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      searchParams.set(key, value.toString());
    }
  });
  
  return searchParams.toString();
};

// Fetch with retry logic
const fetchWithRetry = async (
  url: string, 
  options: RequestInit = {}, 
  retries = MAX_RETRY_ATTEMPTS
): Promise<Response> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // If not the last attempt and status is retryable (5xx or 429)
      if (attempt < retries - 1 && 
          (response.status >= 500 || response.status === 429)) {
        const delay = RETRY_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      if (attempt === retries - 1) {
        throw err;
      }
      
      const delay = RETRY_BACKOFF_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retry attempts reached');
};

// Load saved filters from localStorage
const loadSavedFilters = (): AuditLogQueryParams | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Convert date strings back to proper format if needed
      if (parsed.from && parsed.from.includes('T')) {
        parsed.from = parsed.from.split('T')[0];
      }
      if (parsed.to && parsed.to.includes('T')) {
        parsed.to = parsed.to.split('T')[0];
      }
      
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load saved filters:', err);
  }
  
  return null;
};

// Save filters to localStorage
const saveFilters = (filters: AuditLogQueryParams): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch (err) {
    console.warn('Failed to save filters:', err);
  }
};

export const useAuditLogs = (initialParams?: AuditLogQueryParams): UseAuditLogsReturn => {
  // Data states
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [trends, setTrends] = useState<AuditTrendData[]>([]);
  const [actors, setActors] = useState<ActorActivity[]>([]);
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  
  // Abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Load saved filters or use defaults
  const savedFilters = loadSavedFilters();
  const [filters, setFiltersState] = useState<AuditLogQueryParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    sort: 'desc',
    sortBy: 'createdAt',
    ...savedFilters,
    ...initialParams,
  });

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set filters with validation and persistence
  const setFilters = useCallback((newFilters: AuditLogQueryParams) => {
    setFiltersState((prev: AuditLogQueryParams) => { // Added type annotation
      const updated = {
        ...prev,
        ...newFilters,
        page: newFilters.page !== undefined ? newFilters.page : 1,
      };
      
      // Save to localStorage
      saveFilters(updated);
      
      return updated;
    });
  }, []);

  // Cancel all pending requests
  const cancelRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    }
    
    // Clear WebSocket reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Fetch audit logs with filters
  const fetchLogs = useCallback(async (params?: AuditLogQueryParams) => {
    setLoading(true);
    setError(null);
    
    const queryParams = params || filters;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const queryString = buildQueryString(queryParams);
      const response = await fetchWithRetry(`/api/audit/logs?${queryString}`, {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
      }
      
      const data: PaginatedAuditLogs = await response.json();
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (err) {
      // Check if it's an AbortError
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Fetch logs request was aborted');
        return;
      }
      
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch audit statistics
  const fetchStats = useCallback(async (params?: Partial<AuditLogQueryParams>) => {
    try {
      const queryParams = {
        ...params,
        // Remove pagination params for stats
        page: undefined,
        limit: undefined,
      };
      
      const queryString = buildQueryString(queryParams);
      const response = await fetchWithRetry(`/api/audit/stats?${queryString}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audit stats: ${response.statusText}`);
      }
      
      const data: AuditStats = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching audit stats:', err);
    }
  }, []);

  // Fetch audit trends for charts
  const fetchTrends = useCallback(async (days: number = 7) => {
    try {
      const response = await fetchWithRetry(`/api/audit/trends?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audit trends: ${response.statusText}`);
      }
      
      const data: AuditTrendData[] = await response.json();
      setTrends(data);
    } catch (err) {
      console.error('Error fetching audit trends:', err);
    }
  }, []);

  // Fetch top actors
  const fetchActors = useCallback(async (limit: number = 10) => {
    try {
      const response = await fetchWithRetry(`/api/audit/actors?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch top actors: ${response.statusText}`);
      }
      
      const data: ActorActivity[] = await response.json();
      setActors(data);
    } catch (err) {
      console.error('Error fetching top actors:', err);
    }
  }, []);

  // Fetch active alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetchWithRetry('/api/audit/alerts');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }
      
      const data: AuditAlert[] = await response.json();
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  }, []);

  // Export logs to file
  const exportLogs = useCallback(async (request: AuditExportRequest): Promise<Blob> => {
    try {
      const response = await fetchWithRetry('/api/audit/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (err) {
      console.error('Error exporting logs:', err);
      throw err;
    }
  }, []);

  // Acknowledge an alert
  const acknowledgeAlert = useCallback(async (alertId: string, userId: string) => {
    try {
      const response = await fetchWithRetry(`/api/audit/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          acknowledgedBy: userId,
          acknowledgedAt: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
      }
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              acknowledged: true, 
              acknowledgedBy: userId, 
              acknowledgedAt: new Date().toISOString() 
            }
          : alert
      ));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      throw err;
    }
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const defaultFilters: AuditLogQueryParams = {
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      sort: 'desc',
      sortBy: 'createdAt',
    };
    
    setFiltersState(defaultFilters);
    
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    }
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchLogs(),
      fetchStats(),
      fetchTrends(7),
      fetchActors(10),
      fetchAlerts(),
    ]);
  }, [fetchLogs, fetchStats, fetchTrends, fetchActors, fetchAlerts]);

  // Initialize WebSocket for real-time updates
  const setupWebSocket = useCallback(() => {
    // Only connect in browser environment
    if (typeof window === 'undefined') return () => {}; // Return empty cleanup function
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/audit`;
    
    let reconnectAttempts = 0;
    
    const connect = () => {
      try {
        // Close existing connection
        if (wsRef.current) {
          wsRef.current.close();
        }
        
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected for audit logs');
          reconnectAttempts = 0;
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const realTimeEvent: RealTimeAuditEvent = JSON.parse(event.data);
            
            switch (realTimeEvent.type) {
              case 'NEW_LOG':
                // Add new log to beginning of list, respecting limit
                setLogs(prev => [realTimeEvent.payload as AuditLog, ...prev.slice(0, pagination.limit - 1)]);
                break;
                
              case 'STATS_UPDATE':
                setStats(realTimeEvent.payload as AuditStats);
                break;
                
              case 'ALERT':
                setAlerts(prev => [realTimeEvent.payload as AuditAlert, ...prev]);
                break;
            }
          } catch (err) {
            console.error('Error processing WebSocket message:', err);
          }
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        wsRef.current.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          
          // Attempt reconnection with exponential backoff
          if (reconnectAttempts < WS_RECONNECT_ATTEMPTS) {
            const delay = WS_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts);
            reconnectAttempts++;
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`Attempting to reconnect (${reconnectAttempts}/${WS_RECONNECT_ATTEMPTS})...`);
              connect();
            }, delay);
          } else {
            console.warn('Max WebSocket reconnection attempts reached');
          }
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
      }
    };
    
    connect();
    
    // Return cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [pagination.limit]);

  // Fetch initial data
  useEffect(() => {
    refreshAll(); // Store the promise if needed
    const cleanupWebSocket = setupWebSocket();
    
    // Cleanup function
    return () => {
      cancelRequests();
      if (typeof cleanupWebSocket === 'function') {
        cleanupWebSocket(); // Fixed: Check if it's a function before calling
      }
    };
  }, [refreshAll, setupWebSocket, cancelRequests]);

  // Fetch logs when filters change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, DEFAULT_DEBOUNCE_MS);
    
    return () => clearTimeout(timer);
  }, [filters, fetchLogs]);

  // Auto-refresh stats and trends every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchTrends(7);
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [fetchStats, fetchTrends]);

  return {
    // Data
    logs,
    loading,
    error,
    stats,
    trends,
    actors,
    alerts,
    
    // Pagination
    pagination,
    
    // Filters
    filters,
    
    // Actions
    fetchLogs,
    fetchStats,
    fetchTrends,
    fetchActors,
    fetchAlerts,
    exportLogs,
    acknowledgeAlert,
    setFilters,
    clearFilters,
    refreshAll,
    cancelRequests,
  };
};

// Optional: Hook for single log detail
export const useAuditLogDetail = (logId?: string) => {
  const [log, setLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLogDetail = useCallback(async (id: string) => {
    if (!id) return;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchWithRetry(`/api/audit/logs/${id}`, {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch log detail: ${response.statusText}`);
      }
      
      const data: AuditLog = await response.json();
      setLog(data);
    } catch (err) {
      // Check if it's an AbortError
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Fetch log detail request was aborted');
        return;
      }
      
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching log detail:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (logId) {
      fetchLogDetail(logId);
    }
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [logId, fetchLogDetail]);

  const refetch = useCallback(() => {
    if (logId) {
      fetchLogDetail(logId);
    }
  }, [logId, fetchLogDetail]);

  return { log, loading, error, refetch };
};