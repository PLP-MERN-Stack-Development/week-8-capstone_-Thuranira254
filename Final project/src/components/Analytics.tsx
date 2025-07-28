import React, { useState } from 'react';
import { HealthData } from '../utils/dataUtils';
import AdvancedChart from './AdvancedChart';
import TrendAnalysis from './TrendAnalysis';
import { BarChart3, TrendingUp, Calendar, Filter } from 'lucide-react';

interface AnalyticsProps {
  data: HealthData[];
}

const Analytics: React.FC<AnalyticsProps> = ({ data }) => {
  const [selectedMetric, setSelectedMetric] = useState('steps');
  const [timeRange, setTimeRange] = useState('30');

  const metrics = [
    { value: 'steps', label: 'Steps', color: 'blue' },
    { value: 'weight', label: 'Weight', color: 'green' },
    { value: 'calories', label: 'Calories', color: 'orange' },
    { value: 'sleep', label: 'Sleep', color: 'purple' },
    { value: 'workouts', label: 'Workouts', color: 'red' },
  ];

  const timeRanges = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 3 months' },
    { value: 'all', label: 'All time' },
  ];

  const filteredData = timeRange === 'all' 
    ? data 
    : data.slice(-parseInt(timeRange));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Metric Selector */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {metrics.map((metric) => (
                  <option key={metric.value} value={metric.value}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {metrics.find(m => m.value === selectedMetric)?.label} Trend
          </h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <AdvancedChart 
          data={filteredData} 
          metric={selectedMetric} 
          color={metrics.find(m => m.value === selectedMetric)?.color || 'blue'}
        />
      </div>

      {/* Trend Analysis */}
      <TrendAnalysis data={filteredData} selectedMetric={selectedMetric} />

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const values = filteredData
            .map(d => d[metric.value as keyof HealthData])
            .filter(v => v !== undefined) as number[];
          
          if (values.length === 0) return null;

          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          const max = Math.max(...values);
          const min = Math.min(...values);

          return (
            <div key={metric.value} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">{metric.label} Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average:</span>
                  <span className="font-semibold">{avg.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Maximum:</span>
                  <span className="font-semibold text-green-600">{max}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Minimum:</span>
                  <span className="font-semibold text-red-600">{min}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Analytics;