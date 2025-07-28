import React from 'react';
import { HealthData } from '../utils/dataUtils';

interface QuickChartProps {
  data: HealthData[];
}

const QuickChart: React.FC<QuickChartProps> = ({ data }) => {
  const maxSteps = Math.max(...data.map(d => d.steps || 0));
  const maxWeight = Math.max(...data.map(d => d.weight || 0));

  return (
    <div className="space-y-6">
      {/* Steps Chart */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">Daily Steps</h4>
        <div className="flex items-end space-x-2 h-32">
          {data.map((item, index) => {
            const height = ((item.steps || 0) / maxSteps) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center h-24">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-500 hover:from-blue-600 hover:to-blue-500"
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weight Trend */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">Weight Trend</h4>
        <div className="relative h-20">
          <svg className="w-full h-full" viewBox="0 0 400 80">
            <defs>
              <linearGradient id="weightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Generate path for weight trend */}
            <path
              d={`M 0 ${80 - ((data[0]?.weight || 0) / maxWeight) * 60} ${data
                .map((item, index) => 
                  `L ${(index / (data.length - 1)) * 400} ${80 - ((item.weight || 0) / maxWeight) * 60}`
                )
                .join(' ')}`}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="3"
              className="transition-all duration-500"
            />
            <path
              d={`M 0 ${80 - ((data[0]?.weight || 0) / maxWeight) * 60} ${data
                .map((item, index) => 
                  `L ${(index / (data.length - 1)) * 400} ${80 - ((item.weight || 0) / maxWeight) * 60}`
                )
                .join(' ')} L 400 80 L 0 80 Z`}
              fill="url(#weightGradient)"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default QuickChart;