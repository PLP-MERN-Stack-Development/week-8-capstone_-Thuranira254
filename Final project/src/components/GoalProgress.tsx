import React from 'react';
import { HealthData } from '../utils/dataUtils';
import { Target, Award, TrendingUp } from 'lucide-react';

interface GoalProgressProps {
  data: HealthData[];
}

const GoalProgress: React.FC<GoalProgressProps> = ({ data }) => {
  const currentMonth = new Date().getMonth();
  const monthlyData = data.filter(d => new Date(d.date).getMonth() === currentMonth);
  
  const goals = [
    {
      title: 'Monthly Steps',
      current: monthlyData.reduce((sum, d) => sum + (d.steps || 0), 0),
      target: 300000,
      unit: 'steps',
      color: 'blue',
    },
    {
      title: 'Workout Sessions',
      current: monthlyData.reduce((sum, d) => sum + (d.workouts || 0), 0),
      target: 20,
      unit: 'sessions',
      color: 'green',
    },
    {
      title: 'Average Sleep',
      current: monthlyData.length > 0 ? monthlyData.reduce((sum, d) => sum + (d.sleep || 0), 0) / monthlyData.length : 0,
      target: 8,
      unit: 'hours',
      color: 'purple',
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Monthly Goals</h3>
        <Target className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-6">
        {goals.map((goal, index) => {
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          const isCompleted = progress >= 100;
          
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">{goal.title}</h4>
                  {isCompleted && <Award className="h-4 w-4 text-yellow-500" />}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">{goal.unit}</div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      goal.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                      goal.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                      'bg-gradient-to-r from-purple-500 to-purple-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {Math.round(progress)}% complete
                  </span>
                  {progress > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>On track</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GoalProgress;