"""
T1D Data Exploration and Analysis
Explores dataset statistics, distributions, and patterns
"""

import pandas as pd
import json
import os

class DataExplorer:
    """Explore and analyze T1D datasets"""
    
    def __init__(self, data_dir='ml/data'):
        self.data_dir = data_dir
        self.glucose_df = None
        self.insulin_df = None
        self.meal_df = None
    
    def load_data(self):
        """Load CSV data"""
        self.glucose_df = pd.read_csv(f'{self.data_dir}/glucose.csv')
        self.glucose_df['timestamp'] = pd.to_datetime(self.glucose_df['timestamp'])
        
        self.insulin_df = pd.read_csv(f'{self.data_dir}/insulin.csv')
        self.insulin_df['timestamp'] = pd.to_datetime(self.insulin_df['timestamp'])
        
        self.meal_df = pd.read_csv(f'{self.data_dir}/meals.csv')
        self.meal_df['timestamp'] = pd.to_datetime(self.meal_df['timestamp'])
        
        return self.glucose_df, self.insulin_df, self.meal_df
    
    def analyze_glucose(self):
        """Analyze glucose data statistics"""
        if self.glucose_df is None:
            self.load_data()
        
        glucose = self.glucose_df['glucose_mg_dl']
        
        analysis = {
            'glucose_statistics': {
                'count': len(glucose),
                'mean': float(glucose.mean()),
                'median': float(glucose.median()),
                'std': float(glucose.std()),
                'min': float(glucose.min()),
                'q25': float(glucose.quantile(0.25)),
                'q75': float(glucose.quantile(0.75)),
                'max': float(glucose.max()),
            },
            'glucose_ranges': {
                'hypoglycemia_<70': int((glucose < 70).sum()),
                'impending_70_90': int(((glucose >= 70) & (glucose < 90)).sum()),
                'normal_70_180': int(((glucose >= 70) & (glucose <= 180)).sum()),
                'hyperglycemia_>180': int((glucose > 180).sum()),
            },
            'glucose_percentages': {
                'hypoglycemia_<70': float(100 * (glucose < 70).sum() / len(glucose)),
                'impending_70_90': float(100 * ((glucose >= 70) & (glucose < 90)).sum() / len(glucose)),
                'normal_70_180': float(100 * ((glucose >= 70) & (glucose <= 180)).sum() / len(glucose)),
                'hyperglycemia_>180': float(100 * (glucose > 180).sum() / len(glucose)),
            }
        }
        
        return analysis
    
    def analyze_insulin(self):
        """Analyze insulin data"""
        if self.insulin_df is None:
            self.load_data()
        
        bolus = self.insulin_df[self.insulin_df['type'] == 'bolus']
        basal = self.insulin_df[self.insulin_df['type'] == 'basal']
        
        analysis = {
            'insulin_counts': {
                'total_events': len(self.insulin_df),
                'bolus_events': len(bolus),
                'basal_events': len(basal),
            },
            'bolus_statistics': {
                'count': len(bolus),
                'mean_dose': float(bolus['dose'].mean()) if len(bolus) > 0 else 0,
                'median_dose': float(bolus['dose'].median()) if len(bolus) > 0 else 0,
                'min_dose': float(bolus['dose'].min()) if len(bolus) > 0 else 0,
                'max_dose': float(bolus['dose'].max()) if len(bolus) > 0 else 0,
                'mean_estimated_carbs': float(bolus['carbs_estimated'].mean()) if 'carbs_estimated' in bolus else 0,
            },
            'basal_statistics': {
                'count': len(basal),
                'mean_dose': float(basal['dose'].mean()) if len(basal) > 0 else 0,
                'median_dose': float(basal['dose'].median()) if len(basal) > 0 else 0,
                'mean_duration': float(basal['duration_hours'].mean()) if 'duration_hours' in basal else 0,
            }
        }
        
        return analysis
    
    def analyze_meals(self):
        """Analyze meal data"""
        if self.meal_df is None:
            self.load_data()
        
        carbs = self.meal_df['carbs']
        
        analysis = {
            'meal_statistics': {
                'total_meals': len(self.meal_df),
                'mean_carbs': float(carbs.mean()),
                'median_carbs': float(carbs.median()),
                'min_carbs': float(carbs.min()),
                'max_carbs': float(carbs.max()),
                'std_carbs': float(carbs.std()),
            },
            'regional_distribution': dict(self.meal_df['region'].value_counts()),
            'meal_spacing': {
                'description': 'Time intervals between consecutive meals',
                'note': 'Calculated from timestamp differences'
            }
        }
        
        # Calculate meal intervals
        if len(self.meal_df) > 1:
            meal_times = self.meal_df.sort_values('timestamp')['timestamp'].values
            intervals = pd.Series(meal_times).diff().dt.total_seconds() / 60  # Convert to minutes
            analysis['meal_spacing']['mean_interval_minutes'] = float(intervals.mean())
            analysis['meal_spacing']['median_interval_minutes'] = float(intervals.median())
            analysis['meal_spacing']['min_interval_minutes'] = float(intervals.min())
            analysis['meal_spacing']['max_interval_minutes'] = float(intervals.max())
        
        return analysis
    
    def analyze_data_quality(self):
        """Check data quality and completeness"""
        if self.glucose_df is None:
            self.load_data()
        
        # Time range
        glucose_start = self.glucose_df['timestamp'].min()
        glucose_end = self.glucose_df['timestamp'].max()
        duration = (glucose_end - glucose_start).total_seconds() / 3600 / 24  # Days
        
        # Expected vs actual samples (5-min intervals)
        expected_samples = duration * 24 * 12
        actual_samples = len(self.glucose_df)
        completeness = 100 * actual_samples / expected_samples if expected_samples > 0 else 0
        
        analysis = {
            'data_range': {
                'start': glucose_start.isoformat(),
                'end': glucose_end.isoformat(),
                'duration_days': float(duration),
            },
            'glucose_completeness': {
                'expected_samples_5min_intervals': int(expected_samples),
                'actual_samples': actual_samples,
                'completeness_percent': float(completeness),
                'missing_values': int(self.glucose_df['glucose_mg_dl'].isna().sum()),
            },
            'data_alignment': {
                'glucose_records': len(self.glucose_df),
                'insulin_records': len(self.insulin_df),
                'meal_records': len(self.meal_df),
            }
        }
        
        return analysis
    
    def generate_report(self, output_file='ml/data_exploration_report.json'):
        """Generate comprehensive data exploration report"""
        
        report = {
            'timestamp': pd.Timestamp.now().isoformat(),
            'glucose_analysis': self.analyze_glucose(),
            'insulin_analysis': self.analyze_insulin(),
            'meal_analysis': self.analyze_meals(),
            'data_quality': self.analyze_data_quality(),
        }
        
        # Save report
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        return report
    
    def print_report(self, report):
        """Print human-readable report"""
        print("\n" + "="*60)
        print("T1D DATA EXPLORATION REPORT")
        print("="*60)
        
        print("\n📊 GLUCOSE ANALYSIS")
        print("-" * 60)
        glucose = report['glucose_analysis']
        print(f"Total readings: {glucose['glucose_statistics']['count']}")
        print(f"Mean glucose: {glucose['glucose_statistics']['mean']:.1f} mg/dL")
        print(f"Range: {glucose['glucose_statistics']['min']:.0f} - {glucose['glucose_statistics']['max']:.0f} mg/dL")
        print(f"\nGlucose Distribution:")
        print(f"  Hypoglycemia (<70):      {glucose['glucose_ranges']['hypoglycemia_<70']:4d} readings ({glucose['glucose_percentages']['hypoglycemia_<70']:5.1f}%)")
        print(f"  Impending (70-90):       {glucose['glucose_ranges']['impending_70_90']:4d} readings ({glucose['glucose_percentages']['impending_70_90']:5.1f}%)")
        print(f"  Normal (70-180):         {glucose['glucose_ranges']['normal_70_180']:4d} readings ({glucose['glucose_percentages']['normal_70_180']:5.1f}%)")
        print(f"  Hyperglycemia (>180):    {glucose['glucose_ranges']['hyperglycemia_>180']:4d} readings ({glucose['glucose_percentages']['hyperglycemia_>180']:5.1f}%)")
        
        print("\n💉 INSULIN ANALYSIS")
        print("-" * 60)
        insulin = report['insulin_analysis']
        print(f"Total insulin events: {insulin['insulin_counts']['total_events']}")
        print(f"  - Bolus (meal-related): {insulin['insulin_counts']['bolus_events']}")
        print(f"    Mean dose: {insulin['bolus_statistics']['mean_dose']:.1f} units")
        print(f"  - Basal (background): {insulin['insulin_counts']['basal_events']}")
        print(f"    Mean dose: {insulin['basal_statistics']['mean_dose']:.2f} units/hour")
        
        print("\n🍽 MEAL ANALYSIS")
        print("-" * 60)
        meal = report['meal_analysis']
        print(f"Total meals logged: {meal['meal_statistics']['total_meals']}")
        print(f"Mean carbs per meal: {meal['meal_statistics']['mean_carbs']:.1f}g")
        print(f"Range: {meal['meal_statistics']['min_carbs']:.0f} - {meal['meal_statistics']['max_carbs']:.0f}g")
        print(f"\nRegional Distribution:")
        for region, count in meal['regional_distribution'].items():
            print(f"  {region}: {count}")
        
        print("\n✅ DATA QUALITY")
        print("-" * 60)
        quality = report['data_quality']
        print(f"Duration: {quality['data_range']['duration_days']:.1f} days")
        print(f"Glucose completeness: {quality['glucose_completeness']['completeness_percent']:.1f}%")
        print(f"Actual samples: {quality['glucose_completeness']['actual_samples']}")
        print(f"Expected samples (5-min intervals): {quality['glucose_completeness']['expected_samples_5min_intervals']}")
        
        print("\n" + "="*60)

if __name__ == '__main__':
    explorer = DataExplorer()
    explorer.load_data()
    
    report = explorer.generate_report()
    explorer.print_report(report)
    
    print(f"\n✓ Report saved to ml/data_exploration_report.json")
