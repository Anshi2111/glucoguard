"""
Synthetic T1D Dataset Generator
Generates realistic Type 1 Diabetes glucose, insulin, and meal data
based on OhioT1DM dataset structure for development and testing.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

class SyntheticT1DDataset:
    """Generate synthetic T1D data for model training"""
    
    def __init__(self, seed=42):
        np.random.seed(seed)
        self.seed = seed
    
    def generate_glucose_trace(self, duration_days=7, sample_interval_minutes=5):
        """
        Generate realistic CGM glucose readings (5-min intervals)
        Based on OhioT1DM CGM data characteristics
        """
        num_samples = (duration_days * 24 * 60) // sample_interval_minutes
        timestamps = []
        glucose_values = []
        
        start_time = datetime(2024, 1, 1, 6, 0, 0)
        
        for i in range(num_samples):
            timestamp = start_time + timedelta(minutes=i * sample_interval_minutes)
            timestamps.append(timestamp)
            
            hour_of_day = timestamp.hour
            
            # Base glucose by time of day
            if 0 <= hour_of_day < 6:
                baseline = 90
            elif 6 <= hour_of_day < 8:
                baseline = 110
            elif 8 <= hour_of_day < 12:
                baseline = 140
            elif 12 <= hour_of_day < 14:
                baseline = 150
            elif 14 <= hour_of_day < 18:
                baseline = 120
            else:
                baseline = 100
            
            # 5% chance of hypoglycemia at this reading
            if np.random.random() < 0.05:
                glucose = np.random.uniform(50, 70)
            else:
                # Normal reading
                drift = np.random.normal(0, 2)
                noise = np.random.normal(0, 3)
                glucose = np.clip(baseline + drift + noise, 40, 300)
            
            glucose_values.append(glucose)
        
        return pd.DataFrame({
            'timestamp': timestamps,
            'glucose_mg_dl': glucose_values
        })
    
    def generate_insulin_events(self, glucose_df, num_basal=2, num_bolus=4):
        """
        Generate insulin bolus and basal events
        Based on typical pump therapy patterns
        """
        events = []
        
        # Basal insulin (background): ~2 per day at regular intervals
        start_date = glucose_df['timestamp'].iloc[0].date()
        end_date = glucose_df['timestamp'].iloc[-1].date()
        current_date = start_date
        
        while current_date <= end_date:
            # Morning basal (~6 AM)
            morning_time = datetime.combine(current_date, datetime.min.time()).replace(hour=6)
            events.append({
                'timestamp': morning_time,
                'type': 'basal',
                'dose': np.random.uniform(0.8, 1.2),  # Units/hour
                'duration_hours': 12
            })
            
            # Evening basal (~6 PM)
            evening_time = datetime.combine(current_date, datetime.min.time()).replace(hour=18)
            events.append({
                'timestamp': evening_time,
                'type': 'basal',
                'dose': np.random.uniform(0.7, 1.1),
                'duration_hours': 12
            })
            
            # Bolus insulin (meal-related): ~4 per day
            meal_times = [8, 12, 15, 19]  # Breakfast, lunch, snack, dinner
            for meal_hour in meal_times:
                meal_time = datetime.combine(current_date, datetime.min.time()).replace(
                    hour=meal_hour,
                    minute=np.random.randint(0, 60)
                )
                events.append({
                    'timestamp': meal_time,
                    'type': 'bolus',
                    'dose': np.random.uniform(2, 8),  # Units
                    'carbs_estimated': np.random.uniform(30, 80)
                })
            
            current_date += timedelta(days=1)
        
        return pd.DataFrame(events)
    
    def generate_meal_events(self, glucose_df):
        """
        Generate self-reported meal times with carb estimates
        """
        events = []
        
        start_date = glucose_df['timestamp'].iloc[0].date()
        end_date = glucose_df['timestamp'].iloc[-1].date()
        current_date = start_date
        
        while current_date <= end_date:
            # Typical meal pattern for Indian diet
            meals = [
                {'hour': 7, 'name': 'Breakfast', 'carbs': np.random.uniform(35, 60)},
                {'hour': 10, 'name': 'Mid-morning snack', 'carbs': np.random.uniform(15, 30)},
                {'hour': 13, 'name': 'Lunch', 'carbs': np.random.uniform(50, 80)},
                {'hour': 16, 'name': 'Snack', 'carbs': np.random.uniform(20, 35)},
                {'hour': 19, 'name': 'Dinner', 'carbs': np.random.uniform(40, 70)},
            ]
            
            for meal in meals:
                meal_time = datetime.combine(current_date, datetime.min.time()).replace(
                    hour=meal['hour'],
                    minute=np.random.randint(0, 60)
                )
                
                # Occasionally skip a meal (realistic)
                if np.random.random() > 0.1:
                    events.append({
                        'timestamp': meal_time,
                        'meal_name': meal['name'],
                        'carbs': meal['carbs'],
                        'region': np.random.choice(['North', 'South', 'East', 'West']),
                        'confidence': np.random.uniform(0.7, 1.0)
                    })
            
            current_date += timedelta(days=1)
        
        return pd.DataFrame(events)
    
    def create_dataset(self, duration_days=7, output_dir='ml/data'):
        """
        Create complete synthetic dataset
        """
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate data
        glucose_df = self.generate_glucose_trace(duration_days=duration_days)
        insulin_df = self.generate_insulin_events(glucose_df)
        meal_df = self.generate_meal_events(glucose_df)
        
        # Save as CSV
        glucose_df.to_csv(f'{output_dir}/glucose.csv', index=False)
        insulin_df.to_csv(f'{output_dir}/insulin.csv', index=False)
        meal_df.to_csv(f'{output_dir}/meals.csv', index=False)
        
        # Save summary
        summary = {
            'duration_days': duration_days,
            'glucose_samples': len(glucose_df),
            'insulin_events': len(insulin_df),
            'meal_events': len(meal_df),
            'glucose_range': {
                'min': float(glucose_df['glucose_mg_dl'].min()),
                'max': float(glucose_df['glucose_mg_dl'].max()),
                'mean': float(glucose_df['glucose_mg_dl'].mean()),
                'std': float(glucose_df['glucose_mg_dl'].std())
            },
            'low_glucose_events': int((glucose_df['glucose_mg_dl'] < 70).sum()),
            'hypoglycemia_threshold': 70,
            'normal_range': [70, 180],
            'hyperglycemia_threshold': 180
        }
        
        with open(f'{output_dir}/summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"✓ Synthetic dataset created in {output_dir}")
        print(f"  - Glucose readings: {len(glucose_df)}")
        print(f"  - Insulin events: {len(insulin_df)}")
        print(f"  - Meal events: {len(meal_df)}")
        print(f"  - Duration: {duration_days} days")
        print(f"  - Low glucose events (<70): {summary['low_glucose_events']}")
        
        return glucose_df, insulin_df, meal_df

if __name__ == '__main__':
    generator = SyntheticT1DDataset()
    glucose_df, insulin_df, meal_df = generator.create_dataset(duration_days=7)
