import React, { useEffect, useState } from 'react';
import {
  performanceBaseline,
  PerformanceBaseline,
} from '../../lib/performance/performance-baseline';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Activity, Clock, Zap, BarChart3, RefreshCw, Download } from 'lucide-react';

const PerformanceDebugPage: React.FC = () => {
  // Hooks MUST be called first, unconditionally
  const [baseline, setBaseline] = useState<PerformanceBaseline | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Always call useEffect, but conditionally execute logic inside
    const timer = setTimeout(() => {
      if (import.meta.env.DEV) {
        setBaseline(performanceBaseline.getBaseline());
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Now we can conditionally return early for non-dev environments
  if (!import.meta.env.DEV) {
    return null;
  }
  const handleMeasureNow = () => {
    setIsRecording(true);

    // Wait a bit for metrics to update
    setTimeout(() => {
      setBaseline(performanceBaseline.getBaseline());
      setIsRecording(false);
    }, 1000);
  };

  const handleExportJSON = () => {
    if (!baseline) return;

    const dataStr = JSON.stringify(baseline, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `performance-baseline-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getScoreColor = (value: number, type: 'lcp' | 'cls' | 'fcp') => {
    // Core Web Vitals thresholds
    if (type === 'lcp') {
      if (value < 2500) return 'text-green-600';
      if (value < 4000) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (type === 'fcp') {
      if (value < 1800) return 'text-green-600';
      if (value < 3000) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (type === 'cls') {
      if (value < 0.1) return 'text-green-600';
      if (value < 0.25) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Debug</h1>
          <p className="text-gray-600">Monitor Core Web Vitals and performance metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRecording ? 'animate-spin' : ''}`} />}
            onClick={handleMeasureNow}
            disabled={isRecording}
          >
            Measure Now
          </Button>
          <Button
            variant="primary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportJSON}
            disabled={!baseline}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">LCP</p>
              <p className="text-xs text-gray-400">Largest Contentful Paint</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-3xl font-bold mb-2">
            <span className={getScoreColor(baseline?.LCP || 0, 'lcp')}>
              {formatTime(baseline?.LCP || 0)}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Target: {'<'} 2.5s • Poor: {'>'} 4s
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">FCP</p>
              <p className="text-xs text-gray-400">First Contentful Paint</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold mb-2">
            <span className={getScoreColor(baseline?.FCP || 0, 'fcp')}>
              {formatTime(baseline?.FCP || 0)}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Target: {'<'} 1.8s • Poor: {'>'} 3s
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">CLS</p>
              <p className="text-xs text-gray-400">Cumulative Layout Shift</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
          <div className="text-3xl font-bold mb-2">
            <span className={getScoreColor(baseline?.CLS || 0, 'cls')}>
              {baseline?.CLS?.toFixed(3) || '0'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Target: {'<'} 0.1 • Poor: {'>'} 0.25
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">TTI</p>
              <p className="text-xs text-gray-400">Time to Interactive</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-3xl font-bold mb-2">{formatTime(baseline?.TTI || 0)}</div>
          <div className="text-xs text-gray-500">Approximate • Lower is better</div>
        </Card>
      </div>

      {/* API Latency */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API Latency</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Average</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(baseline?.apiLatency?.average || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">P95</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(baseline?.apiLatency?.p95 || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">P99</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(baseline?.apiLatency?.p99 || 0)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Component Render Times */}
      {baseline?.componentRenderTimes && Object.keys(baseline.componentRenderTimes).length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Component Render Times</h2>
            <div className="space-y-3">
              {Object.entries(baseline.componentRenderTimes).map(([name, time]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{name}</span>
                  <span className="text-sm font-medium text-gray-900">{formatTime(time)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">📊 How to Measure</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Open this page in an incognito window for accurate measurements</li>
          <li>• Click "Measure Now" after navigating through the app</li>
          <li>• Export the baseline JSON to track changes over time</li>
          <li>• LCP and FCP are measured automatically on page load</li>
          <li>• API latency is recorded automatically during API calls</li>
        </ul>
      </div>
    </div>
  );
};

export default PerformanceDebugPage;
