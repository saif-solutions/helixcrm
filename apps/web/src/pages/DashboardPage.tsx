// apps/web/src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastProvider';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { useApiQuery } from '../hooks/useApiQuery';
import { DashboardAPI, LeadsAPI, DealsAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { usePermission } from '../lib/hooks/usePermission';
import {
  Users,
  Briefcase,
  Target,
  TrendingUp,
  DollarSign,
  BarChart3,
  Calendar,
  Clock,
  ChevronRight,
  Plus,
  Download,
  RefreshCw,
  Activity,
} from 'lucide-react';

// Define types inline instead of importing from crm.types
interface PipelineStage {
  stageId?: string;
  stageName: string;
  probability: number;
  dealCount: number;
  totalValue: number;
}
// TODO: Will be used when backend types are fully integrated
// interface DashboardStats {
//   summary?: {
//     leads?: number;
//     contacts?: number;
//     deals?: number;
//     newLeadsThisWeek?: number;
//     conversionRate?: number;
//     totalWonValue?: number;
//     averageDealValue?: number;
//     winRate?: number;
//     dealsThisMonth?: number;
//     overdueDeals?: number;
//   };
//   pipeline?: {
//     name: string;
//     totalDeals: number;
//     totalValue: number;
//     stages: Array<{
//       stageId?: string;
//       stageName: string;
//       probability: number;
//       dealCount: number;
//       totalValue: number;
//     }>;
//   };
// }

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  company?: string;
  createdAt: string;
}

interface Deal {
  id: string;
  name: string;
  amount: number;
  stageId: string;
  stageName?: string;
  pipelineId: string;
  pipelineName?: string;
  probability: number;
  expectedCloseDate?: string;
  createdAt: string;
}

const DashboardPage: React.FC = () => {
  const { success, error: showError } = useToast();
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'deals'>('overview');
  const { hasPermission } = usePermission();
  // Fetch Phase 3.4 enhanced dashboard stats
  const {
    data: dashboardStats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useApiQuery(['dashboard-stats'], () => DashboardAPI.stats(), {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch recent leads
  const {
    data: recentLeads,
    isLoading: isLoadingLeads,
    error: leadsError,
  } = useApiQuery(
    ['recent-leads'],
    () => LeadsAPI.list(0, 5), // Get 5 most recent leads
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Fetch recent deals
  const {
    data: recentDeals,
    isLoading: isLoadingDeals,
    error: dealsError,
  } = useApiQuery(
    ['recent-deals'],
    () => DealsAPI.list(0, 5), // Get 5 most recent deals
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Handle errors
  useEffect(() => {
    if (statsError) {
      showError('Dashboard Error', 'Failed to load dashboard statistics');
    }
    if (leadsError) {
      showError('Leads Error', 'Failed to load recent leads');
    }
    if (dealsError) {
      showError('Deals Error', 'Failed to load recent deals');
    }
  }, [statsError, leadsError, dealsError, showError]);

  const handleLogout = async () => {
    try {
      await logout();
      success('Logged out', 'You have been successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if API call fails
      window.location.href = '/login';
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    refetchStats().finally(() => {
      setLoading(false);
      success('Dashboard Refreshed', 'Latest data has been loaded');
    });
  };

  const handleExport = () => {
    success('Export Started', 'Your dashboard report will be generated shortly');
    // TODO: Implement export functionality
  };

  // Get user from localStorage
  // Get user from auth store (in-memory only)
  const { user } = useAuthStore();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isLoading = isLoadingStats || isLoadingLeads || isLoadingDeals || loading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">H</span>
                </div>
                <span className="text-xl font-bold text-gray-900">HelixCRM</span>
              </Link>
              <div className="text-sm text-gray-400">|</div>
              <nav className="flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="text-primary-600 font-medium border-b-2 border-primary-600 pb-1"
                >
                  Dashboard
                </Link>
                <Link to="/leads" className="text-gray-700 hover:text-primary-600 font-medium">
                  Leads
                </Link>
                <Link to="/contacts" className="text-gray-700 hover:text-primary-600 font-medium">
                  Contacts
                </Link>
                <Link to="/deals" className="text-gray-700 hover:text-primary-600 font-medium">
                  Deals
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh dashboard"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <div className="text-sm text-gray-600">
                  {dashboardStats && `Updated ${new Date().toLocaleTimeString()}`}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user?.email?.split('@')[0] || 'User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)] hidden lg:block">
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Navigation
            </div>
            <Link
              to="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 text-primary-600 bg-primary-50 rounded-lg"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/leads"
              className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Target className="w-5 h-5" />
              <span>Leads</span>
            </Link>
            <Link
              to="/contacts"
              className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Contacts</span>
            </Link>
            <Link
              to="/deals"
              className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Briefcase className="w-5 h-5" />
              <span>Deals</span>
            </Link>

            {/* Only show Quick Actions if user has write permissions */}
            {(hasPermission('lead:write') ||
              hasPermission('contact:write') ||
              hasPermission('deal:write')) && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6">
                  Quick Actions
                </div>

                {hasPermission('lead:write') && (
                  <Link
                    to="/leads/new"
                    className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>New Lead</span>
                  </Link>
                )}

                {/* Add other quick actions as needed */}
              </>
            )}
            {/* Note: Contacts and Deals creation is handled within their respective pages via modals */}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 mb-6 text-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Welcome back, {user?.email?.split('@')[0] || 'User'}!
                  </h1>
                  <p className="opacity-90">Here's your CRM overview for today.</p>
                </div>
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                  {/* Only show Export button if user has report:read permission */}
                  {hasPermission('report:read') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleExport}
                      leftIcon={<Download className="w-4 h-4" />}
                      className="bg-white/20 hover:bg-white/30 text-white"
                    >
                      Export Report
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRefresh}
                    loading={loading}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Dashboard Tabs */}
            <div className="flex space-x-1 bg-white rounded-lg border border-gray-200 p-1 mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'leads'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Leads
              </button>
              <button
                onClick={() => setActiveTab('deals')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'deals'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Deals
              </button>
            </div>

            {/* Stats Cards - Phase 3.4 Enhanced */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Leads Card - requires lead:read */}
              {hasPermission('lead:read') && (
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Leads</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {isLoadingStats
                          ? '...'
                          : dashboardStats?.summary?.leads?.toLocaleString() || '0'}
                      </p>
                      {dashboardStats?.summary && (
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          <span>{dashboardStats.summary.newLeadsThisWeek} new this week</span>
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </Card>
              )}

              {/* Contacts Card - requires contact:read */}
              {hasPermission('contact:read') && (
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Contacts</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {isLoadingStats
                          ? '...'
                          : dashboardStats?.summary?.contacts?.toLocaleString() || '0'}
                      </p>
                      {dashboardStats?.summary && dashboardStats.summary.conversionRate > 0 && (
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <Activity className="w-4 h-4 mr-1" />
                          <span>
                            {dashboardStats.summary.conversionRate.toFixed(1)}% conversion
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </Card>
              )}

              {/* Deals Card - requires deal:read */}
              {hasPermission('deal:read') && (
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Active Deals</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {isLoadingStats
                          ? '...'
                          : dashboardStats?.summary?.deals?.toLocaleString() || '0'}
                      </p>
                      {dashboardStats?.summary && (
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <Briefcase className="w-4 h-4 mr-1" />
                          <span>
                            ${dashboardStats.summary.totalWonValue?.toLocaleString() || '0'} won
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </Card>
              )}

              {/* Revenue Card - requires deal:read */}
              {hasPermission('deal:read') && (
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Avg Deal Value</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {isLoadingStats
                          ? '...'
                          : formatCurrency(dashboardStats?.summary?.averageDealValue || 0)}
                      </p>
                      {dashboardStats?.summary && (
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span>{dashboardStats.summary.winRate?.toFixed(1) || '0'}% win rate</span>
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Pipeline Overview - requires deal:read */}
            {hasPermission('deal:read') && dashboardStats?.pipeline && (
              <Card className="mb-6">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {dashboardStats.pipeline.name} Pipeline
                    </h2>
                    <span className="text-sm text-gray-600">
                      {dashboardStats.pipeline.totalDeals} deals •{' '}
                      {formatCurrency(dashboardStats.pipeline.totalValue)} total
                    </span>
                  </div>

                  <div className="space-y-4">
                    {dashboardStats.pipeline.stages.map((stage: PipelineStage, index: number) => (
                      <div key={stage.stageId || `stage-${index}`} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="font-medium text-gray-700">{stage.stageName}</span>
                            <span className="text-sm text-gray-500">
                              {stage.probability}% probability
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">
                              {stage.dealCount} deals
                            </span>
                            <span className="block text-sm text-gray-500">
                              {formatCurrency(stage.totalValue)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                            style={{
                              width: `${(stage.dealCount / (dashboardStats.pipeline?.totalDeals || 1)) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Recent Activity & Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Leads - requires lead:read */}
              {hasPermission('lead:read') && (
                <Card className="lg:col-span-2">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
                      <Link
                        to="/leads"
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        View all <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>

                    {isLoadingLeads ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : recentLeads?.data && recentLeads.data.length > 0 ? (
                      <div className="space-y-4">
                        {recentLeads.data.map((lead: Lead) => (
                          <div
                            key={lead.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="font-medium text-blue-600">
                                  {lead.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{lead.name}</p>
                                <p className="text-sm text-gray-500">
                                  {lead.company || 'No company'} • {lead.email || 'No email'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  lead.status === 'new'
                                    ? 'bg-blue-100 text-blue-800'
                                    : lead.status === 'contacted'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : lead.status === 'qualified'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {lead.status}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(lead.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No recent leads found</div>
                    )}
                  </div>
                </Card>
              )}

              {/* Quick Stats - requires deal:read */}
              {hasPermission('deal:read') && (
                <Card>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>

                    {isLoadingStats ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : dashboardStats ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Win Rate</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {dashboardStats.summary?.winRate?.toFixed(1) || '0'}%
                            </p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-blue-600" />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Deals This Month</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {dashboardStats.summary?.dealsThisMonth || '0'}
                            </p>
                          </div>
                          <Calendar className="w-8 h-8 text-green-600" />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Overdue Deals</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {dashboardStats.summary?.overdueDeals || '0'}
                            </p>
                          </div>
                          <Clock className="w-8 h-8 text-purple-600" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No stats available</div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Recent Deals - requires deal:read */}
            {hasPermission('deal:read') && (
              <Card className="mt-6">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Deals</h2>
                    <Link
                      to="/deals"
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      View all <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>

                  {isLoadingDeals ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : recentDeals?.data && recentDeals.data.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                              Deal Name
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                              Stage
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                              Value
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                              Probability
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                              Expected Close
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentDeals.data.map((deal: Deal) => (
                            <tr
                              key={deal.id}
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">{deal.name}</div>
                                <div className="text-sm text-gray-500">
                                  {deal.pipelineName || 'No pipeline'}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {deal.stageName || deal.stageId}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-900">
                                {formatCurrency(deal.amount)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                    <div
                                      className="bg-green-500 h-2 rounded-full"
                                      style={{ width: `${deal.probability}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm text-gray-700">{deal.probability}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {deal.expectedCloseDate
                                  ? formatDate(deal.expectedCloseDate)
                                  : 'Not set'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No recent deals found</div>
                  )}
                </div>
              </Card>
            )}

            {/* No permissions message */}
            {!hasPermission('lead:read') &&
              !hasPermission('contact:read') &&
              !hasPermission('deal:read') && (
                <Card className="p-8 text-center">
                  <p className="text-gray-500">You don't have permission to view dashboard data.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Please contact your administrator for access.
                  </p>
                </Card>
              )}
          </div>
        </main>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-700">Loading dashboard data...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
