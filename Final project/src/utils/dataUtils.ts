export interface HealthData {
  id: string;
  date: string;
  weight?: number;
  steps?: number;
  calories?: number;
  sleep?: number;
  workouts?: number;
  heartRate?: number;
  notes?: string;
}

export const generateMockData = (): HealthData[] => {
  const data: HealthData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Last 30 days

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Generate realistic data with some variation
    const baseSteps = 8000 + Math.random() * 4000;
    const baseWeight = 155 + (Math.random() - 0.5) * 10;
    const baseSleep = 7 + Math.random() * 2;
    const baseCalories = 2000 + Math.random() * 600;
    
    data.push({
      id: `mock-${i}`,
      date: date.toISOString().split('T')[0],
      steps: Math.round(baseSteps + Math.sin(i * 0.1) * 1000),
      weight: Math.round((baseWeight + Math.sin(i * 0.05) * 3) * 10) / 10,
      calories: Math.round(baseCalories + Math.sin(i * 0.15) * 200),
      sleep: Math.round((baseSleep + Math.sin(i * 0.2) * 1) * 10) / 10,
      workouts: Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0,
      heartRate: Math.round(65 + Math.random() * 15),
      notes: Math.random() > 0.8 ? 'Feeling great today!' : undefined,
    });
  }

  return data;
};