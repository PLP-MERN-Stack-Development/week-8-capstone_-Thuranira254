import React, { useState } from 'react';
import { HealthData } from '../utils/dataUtils';
import { Save, Calendar, Activity, Weight, Zap, Moon, Dumbbell } from 'lucide-react';

interface DataEntryProps {
  onSubmit: (data: Omit<HealthData, 'id'>) => void;
}

const DataEntry: React.FC<DataEntryProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    steps: '',
    calories: '',
    sleep: '',
    workouts: '',
    heartRate: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const data: Omit<HealthData, 'id'> = {
      date: formData.date,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      steps: formData.steps ? parseInt(formData.steps) : undefined,
      calories: formData.calories ? parseInt(formData.calories) : undefined,
      sleep: formData.sleep ? parseFloat(formData.sleep) : undefined,
      workouts: formData.workouts ? parseInt(formData.workouts) : undefined,
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : undefined,
      notes: formData.notes || undefined,
    };

    onSubmit(data);
    setIsSubmitting(false);
    setSubmitSuccess(true);

    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      weight: '',
      steps: '',
      calories: '',
      sleep: '',
      workouts: '',
      heartRate: '',
      notes: '',
    });

    // Hide success message after 3 seconds
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const inputFields = [
    {
      name: 'weight',
      label: 'Weight',
      type: 'number',
      placeholder: '150',
      unit: 'lbs',
      icon: Weight,
      color: 'text-green-500',
    },
    {
      name: 'steps',
      label: 'Steps',
      type: 'number',
      placeholder: '10000',
      unit: 'steps',
      icon: Activity,
      color: 'text-blue-500',
    },
    {
      name: 'calories',
      label: 'Calories Burned',
      type: 'number',
      placeholder: '2200',
      unit: 'kcal',
      icon: Zap,
      color: 'text-orange-500',
    },
    {
      name: 'sleep',
      label: 'Sleep Duration',
      type: 'number',
      placeholder: '8',
      unit: 'hours',
      step: '0.5',
      icon: Moon,
      color: 'text-purple-500',
    },
    {
      name: 'workouts',
      label: 'Workout Sessions',
      type: 'number',
      placeholder: '1',
      unit: 'sessions',
      icon: Dumbbell,
      color: 'text-red-500',
    },
    {
      name: 'heartRate',
      label: 'Resting Heart Rate',
      type: 'number',
      placeholder: '70',
      unit: 'bpm',
      icon: Activity,
      color: 'text-pink-500',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {submitSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Save className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Health data saved successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">Add Health Data</h2>
          <p className="text-blue-100 mt-1">Track your daily health and fitness metrics</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Date Selection */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="h-5 w-5 text-gray-600" />
              <label className="text-lg font-semibold text-gray-900">Date</label>
            </div>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inputFields.map((field) => {
              const Icon = field.icon;
              return (
                <div key={field.name} className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Icon className={`h-5 w-5 ${field.color}`} />
                    <label className="text-lg font-semibold text-gray-900">
                      {field.label}
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name as keyof typeof formData]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      step={field.step}
                      className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      {field.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes about your day, how you felt, achievements, etc."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Save className="h-5 w-5" />
                  <span>Save Health Data</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DataEntry;