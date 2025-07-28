import React from 'react';
import { HealthData } from '../utils/dataUtils';
import { Clock, CheckCircle } from 'lucide-react';

interface RecentActivityProps {
  data: HealthData[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ data }) => {
  const recentActivities = data.slice(-5).reverse().map((item, index) => {
    const activities = [];
    
    if (item.steps && item.steps > 8000) {
      activities.push({
        type: 'steps',
        message: `Walked ${item.steps.toLocaleString()} steps`,
        icon: CheckCircle,
        color: 'text-green-500',
      });
    }
    
    if (item.workouts && item.workouts > 0) {
      activities.push({
        type: 'workout',
        message: `Completed ${item.workouts} workout${item.workouts > 1 ? 's' : ''}`,
        icon: CheckCircle,
        color: 'text-blue-500',
      });
    }
    
    if (item.sleep && item.sleep >= 7) {
      activities.push({
        type: 'sleep',
        message: `Got ${item.sleep} hours of sleep`,
        icon: CheckCircle,
        color: 'text-purple-500',
      });
    }

    return activities.map(activity => ({
      ...activity,
      date: item.date,
    }));
  }).flat().slice(0, 6);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <Clock className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {recentActivities.length > 0 ? (
          recentActivities.map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <activity.icon className={`h-5 w-5 ${activity.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No recent activities</p>
            <p className="text-sm text-gray-400">Start logging your health data to see activities here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;