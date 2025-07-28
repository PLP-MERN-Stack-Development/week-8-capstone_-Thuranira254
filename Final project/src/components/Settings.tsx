import React, { useState } from 'react';
import { 
  User, 
  Target, 
  Bell, 
  Download, 
  Upload, 
  Trash2, 
  Save,
  Shield,
  Moon,
  Sun
} from 'lucide-react';

const Settings: React.FC = () => {
  const [profile, setProfile] = useState({
    name: 'Jesse Thuranira',
    email: 'jessythuranira@gmail.com',
    age: '30',
    height: '5\'10"',
    activityLevel: 'moderate',
  });

  const [goals, setGoals] = useState({
    dailySteps: '10000',
    targetWeight: '150',
    sleepGoal: '8',
    weeklyWorkouts: '4',
  });

  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    dataSharing: false,
    weeklyReports: true,
  });

  const [activeSection, setActiveSection] = useState('profile');

  const sections = [
    { id: 'profile', title: 'Profile', icon: User },
    { id: 'goals', title: 'Goals', icon: Target },
    { id: 'notifications', title: 'Notifications', icon: Bell },
    { id: 'data', title: 'Data & Privacy', icon: Shield },
  ];

  const handleSave = () => {
    // Simulate saving
    alert('Settings saved successfully!');
  };

  const handleExportData = () => {
    // Simulate data export
    alert('Data export started. You will receive an email when ready.');
  };

  const handleDeleteAllData = () => {
    if (window.confirm('Are you sure you want to delete all your health data? This action cannot be undone.')) {
      alert('All data has been deleted.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-blue-100 mt-1">Customize your LifeFit experience</p>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Sidebar */}
          <div className="lg:w-64 bg-gray-50 border-r border-gray-200">
            <nav className="p-4 space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-8">
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Profile Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={profile.age}
                      onChange={(e) => setProfile(prev => ({ ...prev, age: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Height
                    </label>
                    <input
                      type="text"
                      value={profile.height}
                      onChange={(e) => setProfile(prev => ({ ...prev, height: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Activity Level
                    </label>
                    <select
                      value={profile.activityLevel}
                      onChange={(e) => setProfile(prev => ({ ...prev, activityLevel: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="sedentary">Sedentary (little to no exercise)</option>
                      <option value="light">Light (light exercise 1-3 days/week)</option>
                      <option value="moderate">Moderate (moderate exercise 3-5 days/week)</option>
                      <option value="active">Active (hard exercise 6-7 days/week)</option>
                      <option value="very-active">Very Active (very hard exercise, physical job)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'goals' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Health Goals</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daily Steps Goal
                    </label>
                    <input
                      type="number"
                      value={goals.dailySteps}
                      onChange={(e) => setGoals(prev => ({ ...prev, dailySteps: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 8,000-12,000 steps</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Weight (lbs)
                    </label>
                    <input
                      type="number"
                      value={goals.targetWeight}
                      onChange={(e) => setGoals(prev => ({ ...prev, targetWeight: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sleep Goal (hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={goals.sleepGoal}
                      onChange={(e) => setGoals(prev => ({ ...prev, sleepGoal: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 7-9 hours</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weekly Workouts
                    </label>
                    <input
                      type="number"
                      value={goals.weeklyWorkouts}
                      onChange={(e) => setGoals(prev => ({ ...prev, weeklyWorkouts: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 3-5 sessions</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Notification Preferences</h3>
                
                <div className="space-y-4">
                  {[
                    { key: 'notifications', label: 'Push Notifications', desc: 'Get reminders and updates' },
                    { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Receive weekly health summaries' },
                    { key: 'darkMode', label: 'Dark Mode', desc: 'Use dark theme for the interface' },
                  ].map((pref) => (
                    <div key={pref.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{pref.label}</h4>
                        <p className="text-sm text-gray-600">{pref.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences[pref.key as keyof typeof preferences]}
                          onChange={(e) => setPreferences(prev => ({ 
                            ...prev, 
                            [pref.key]: e.target.checked 
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'data' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Data & Privacy</h3>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Data Management</h4>
                    <div className="space-y-4">
                      <button
                        onClick={handleExportData}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export My Data</span>
                      </button>
                      
                      <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                        <Upload className="h-4 w-4" />
                        <span>Import Data</span>
                      </button>
                      
                      <button
                        onClick={handleDeleteAllData}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete All Data</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Privacy Settings</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">Data Sharing</h5>
                        <p className="text-sm text-gray-600">Allow anonymous data sharing for research</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.dataSharing}
                          onChange={(e) => setPreferences(prev => ({ 
                            ...prev, 
                            dataSharing: e.target.checked 
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;