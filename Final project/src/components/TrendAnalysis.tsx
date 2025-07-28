import React from 'react';
import { HealthData } from '../utils/dataUtils';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface TrendAnalysisProps {
  data: HealthData[];
  selectedMetric: string;
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ data, selectedMetric }) => {
  const calculateTrend = (values: number[]) => {
    if (values.length < 2) return { direction: 'stable', percentage: 0, change: 0 };
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = secondAvg - firstAvg;
    const percentage = firstAvg !== 0 ? (change / firstAvg) * 100 : 0;
    
    let direction: 'up' | 'down' | 'stable';
    if (Math.abs(percentage) < 2) direction = 'stable';
    else if (percentage > 0) direction = 'up';
    else direction = 'down';
    
    return { direction, percentage: Math.abs(percentage), change };
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = (direction: string, metric: string) => {
    const isPositiveTrend = (direction === 'up' && ['steps', 'workouts', 'sleep'].includes(metric)) ||
                           (direction === 'down' && ['weight'].includes(metric));
    
    if (direction === 'stable') return 'text-gray-500';
    return isPositiveTrend ? 'text-green-500' : 'text-red-500';
  };

  const values = data
    .map(d => d[selectedMetric as keyof HealthData])
    .filter(v => v !== undefined) as number[];

  if (values.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No data available for trend analysis</p>
          </div>
        </div>
      </div>
    );
  }

  const trend = calculateTrend(values);
  const TrendIcon = getTrendIcon(trend.direction);
  const trendColor = getTrendColor(trend.direction, selectedMetric);

  const insights = [];
  
  // Generate insights based on trends
  if (trend.direction === 'up' && selectedMetric === 'steps') {
    insights.push("Great job! Your daily activity is increasing. Keep up the momentum!");
  } else if (trend.direction === 'down' && selectedMetric === 'weight') {
    insights.push("Excellent progress on your weight management goals!");
  } else if (trend.direction === 'up' && selectedMetric === 'sleep') {
    insights.push("Your sleep habits are improving. Better rest leads to better health!");
  } else if (trend.direction === 'down' && selectedMetric === 'sleep') {
    insights.push("Consider focusing on sleep hygiene to improve your rest quality.");
  }

  // Add consistency insights
  const recentValues = values.slice(-7);
  const consistency = recentValues.length > 1 ? 
    1 - (Math.max(...recentValues) - Math.min(...recentValues)) / Math.max(...recentValues) : 0;

  if (consistency > 0.8) {
    insights.push("You're maintaining consistent habits - that's key to long-term success!");
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Trend Analysis</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trend Overview */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <TrendIcon className={`h-8 w-8 ${trendColor}`} />
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {trend.direction === 'up' ? 'Increasing' : 
                 trend.direction === 'down' ? 'Decreasing' : 'Stable'} Trend
              </h4>
              <p className="text-sm text-gray-600">
                {trend.percentage.toFixed(1)}% change over the period
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Trend Details</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Direction:</span>
                <span className={`font-medium ${trendColor}`}>
                  {trend.direction === 'up' ? '↗ Upward' : 
                   trend.direction === 'down' ? '↘ Downward' : '→ Stable'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Change:</span>
                <span className="font-medium">
                  {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Points:</span>
                <span className="font-medium">{values.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Insights & Recommendations</h4>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                  <p className="text-sm text-blue-800">{insight}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Keep tracking your data to get personalized insights and recommendations!
              </p>
            </div>
          )}
          
          {/* Consistency Score */}
          {recentValues.length > 2 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Consistency Score</h5>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${consistency * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(consistency * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Based on your last 7 entries
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;