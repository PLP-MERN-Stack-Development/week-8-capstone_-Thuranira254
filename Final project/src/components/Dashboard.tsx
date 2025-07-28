import React from 'react';
import { HealthData } from '../utils/dataUtils';
import MetricCard from './MetricCard';
import QuickChart from './QuickChart';
import RecentActivity from './RecentActivity';
import GoalProgress from './GoalProgress';
import { 
  Heart, 
  Activity, 
  Zap, 
  Moon, 
  Target,
  TrendingUp 
} from 'lucide-react';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning! 🌅';
  if (hour < 17) return 'Good afternoon! ☀️';
  if (hour < 21) return 'Good evening! 🌆';
  return 'Good night! 🌙';
};

const getMotivationalMessage = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Ready to start your day strong?';
  if (hour < 17) return 'Keep up the great momentum!';
  if (hour < 21) return 'How did your day go?';
  return 'Time to wind down and rest well!';
};

interface DashboardProps {
  data: HealthData[];
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const latestData = data.slice(-7); // Last 7 entries
  const today = new Date().toISOString().split('T')[0];
  const todayData = data.find(d => d.date === today);

  // Calculate averages and trends
  const avgWeight = data.length > 0 ? data.reduce((sum, d) => sum + (d.weight || 0), 0) / data.filter(d => d.weight).length : 0;
  const avgSteps = data.length > 0 ? data.reduce((sum, d) => sum + (d.steps || 0), 0) / data.filter(d => d.steps).length : 0;
  const avgSleep = data.length > 0 ? data.reduce((sum, d) => sum + (d.sleep || 0), 0) / data.filter(d => d.sleep).length : 0;

  const metrics = [
    {
      title: 'Today\'s Steps',
      value: todayData?.steps || 0,
      unit: 'steps',
      goal: 10000,
      icon: Activity,
      color: 'blue',
      trend: '+12% from yesterday'
    },
    {
      title: 'Current Weight',
      value: todayData?.weight || avgWeight,
      unit: 'lbs',
      goal: 150,
      icon: Target,
      color: 'green',
      trend: '-0.5 lbs this week'
    },
    {
      title: 'Calories Burned',
      value: todayData?.calories || 0,
      unit: 'kcal',
      goal: 2200,
      icon: Zap,
      color: 'orange',
      trend: '+5% from yesterday'
    },
    {
      title: 'Sleep Quality',
      value: todayData?.sleep || avgSleep,
      unit: 'hours',
      goal: 8,
      icon: Moon,
      color: 'purple',
      trend: '7.5 avg this week'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">{getGreeting()}</h2>
            <p className="text-blue-100 text-lg">{getMotivationalMessage()}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{data.length}</div>
            <div className="text-blue-100">Days tracked</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Weekly Overview</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <QuickChart data={latestData} />
          </div>
          
          <GoalProgress data={data} />
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <RecentActivity data={latestData} />
          
          {/* Health Score */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Health Score</h3>
              <Heart className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">87</div>
              <div className="text-sm text-gray-500 mb-4">Excellent</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;