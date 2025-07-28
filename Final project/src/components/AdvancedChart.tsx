import React from 'react';
import { HealthData } from '../utils/dataUtils';

interface AdvancedChartProps {
  data: HealthData[];
  metric: string;
  color: string;
}

const colorMap = {
  blue: {
    stroke: 'rgb(59, 130, 246)',
    fill: 'rgba(59, 130, 246, 0.1)',
    gradient: 'blueGradient',
  },
  green: {
    stroke: 'rgb(34, 197, 94)',
    fill: 'rgba(34, 197, 94, 0.1)',
    gradient: 'greenGradient',
  },
  orange: {
    stroke: 'rgb(249, 115, 22)',
    fill: 'rgba(249, 115, 22, 0.1)',
    gradient: 'orangeGradient',
  },
  purple: {
    stroke: 'rgb(147, 51, 234)',
    fill: 'rgba(147, 51, 234, 0.1)',
    gradient: 'purpleGradient',
  },
  red: {
    stroke: 'rgb(239, 68, 68)',
    fill: 'rgba(239, 68, 68, 0.1)',
    gradient: 'redGradient',
  },
};

const AdvancedChart: React.FC<AdvancedChartProps> = ({ data, metric, color }) => {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No data available for the selected time range</p>
      </div>
    );
  }

  const values = data.map(d => d[metric as keyof HealthData] as number || 0);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  const colors = colorMap[color as keyof typeof colorMap] || colorMap.blue;

  // Generate SVG path
  const width = 800;
  const height = 300;
  const padding = 40;

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const value = (item[metric as keyof HealthData] as number) || 0;
    const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const pathData = `M ${points.split(' ').join(' L ')}`;
  const areaData = `M ${padding},${height - padding} L ${points.split(' ').join(' L ')} L ${width - padding},${height - padding} Z`;

  return (
    <div className="h-80 w-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id={colors.gradient} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.0" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Area fill */}
        <path
          d={areaData}
          fill={`url(#${colors.gradient})`}
        />

        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="3"
          filter="url(#glow)"
          className="transition-all duration-300"
        />

        {/* Data points */}
        {data.map((item, index) => {
          const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
          const value = (item[metric as keyof HealthData] as number) || 0;
          const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
          
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="white"
                stroke={colors.stroke}
                strokeWidth="3"
                className="hover:r-6 transition-all duration-200 cursor-pointer"
              >
                <title>{`${new Date(item.date).toLocaleDateString()}: ${value}`}</title>
              </circle>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((item, index) => {
          if (index % Math.ceil(data.length / 8) !== 0 && index !== data.length - 1) return null;
          
          const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
          
          return (
            <text
              key={index}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
            >
              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const value = minValue + ratio * range;
          const y = height - padding - ratio * (height - 2 * padding);
          
          return (
            <g key={index}>
              <line
                x1={padding - 5}
                y1={y}
                x2={padding}
                y2={y}
                stroke="#6b7280"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#6b7280"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default AdvancedChart;