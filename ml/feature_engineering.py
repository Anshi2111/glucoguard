"""
Feature Engineering for T1D Hypoglycemia Prediction
Extracts and engineers features from glucose, insulin, and meal data
for 30-60 minute prediction horizon
"""

import pandas as pd
import numpy as np
from datetime import timedelta

class T1DFeatureEngineer:
    """Engineer features for hypoglycemia prediction"""
    
    # Thresholds (mg/dL)
    HYPOGLYCEMIA_THRESHOLD = 70
    IMPENDING_HYPOGLYCEMIA = 90
    NORMAL_LOW = 70
    NORMAL_HIGH = 180
    
    def __init__(self, prediction_horizon_minutes=45):
        """
        prediction_horizon_minutes: Minutes ahead to predict (30-60)
        """
        self.prediction_horizon_minutes = prediction_horizon_minutes
    
    def extract_glucose_features(self, glucose_df, timestamp, lookback_minutes=120):
        """
        Extract features from glucose data
        
        Features:
        - current_glucose: Current glucose level
        - glucose_trend: Rate of change
        - glucose_acceleration: Second derivative (is trend accelerating?)
        - glucose_velocity: Point-to-point changes
        - recent_avg_glucose: Average over lookback period
        - recent_min_glucose: Minimum in lookback period
        - recent_max_glucose: Maximum in lookback period
        """
        
        # Filter data in lookback window
        lookback_start = timestamp - timedelta(minutes=lookback_minutes)
        window = glucose_df[
            (glucose_df['timestamp'] >= lookback_start) & 
            (glucose_df['timestamp'] <= timestamp)
        ].sort_values('timestamp')
        
        if len(window) < 2:
            return {}
        
        # Current glucose
        current_glucose = window['glucose_mg_dl'].iloc[-1]
        
        # Recent glucose readings (5-min intervals → 12 readings/hour)
        recent_15min = glucose_df[
            (glucose_df['timestamp'] > timestamp - timedelta(minutes=15)) & 
            (glucose_df['timestamp'] <= timestamp)
        ]
        recent_30min = glucose_df[
            (glucose_df['timestamp'] > timestamp - timedelta(minutes=30)) & 
            (glucose_df['timestamp'] <= timestamp)
        ]
        
        # Glucose trend (mg/dL per minute)
        if len(recent_15min) >= 2:
            glucose_trend_15 = (recent_15min['glucose_mg_dl'].iloc[-1] - 
                               recent_15min['glucose_mg_dl'].iloc[0]) / 15.0
        else:
            glucose_trend_15 = 0
        
        if len(recent_30min) >= 2:
            glucose_trend_30 = (recent_30min['glucose_mg_dl'].iloc[-1] - 
                               recent_30min['glucose_mg_dl'].iloc[0]) / 30.0
        else:
            glucose_trend_30 = 0
        
        # Glucose acceleration (trend change)
        glucose_acceleration = glucose_trend_30 - glucose_trend_15
        
        features = {
            'glucose_current': current_glucose,
            'glucose_trend_15min': glucose_trend_15,
            'glucose_trend_30min': glucose_trend_30,
            'glucose_acceleration': glucose_acceleration,
            'glucose_avg_120min': window['glucose_mg_dl'].mean(),
            'glucose_min_120min': window['glucose_mg_dl'].min(),
            'glucose_max_120min': window['glucose_mg_dl'].max(),
            'glucose_std_120min': window['glucose_mg_dl'].std(),
            'glucose_below_70': int(current_glucose < 70),
            'glucose_below_90': int(current_glucose < 90),
            'glucose_in_range': int(70 <= current_glucose <= 180),
            'glucose_above_180': int(current_glucose > 180),
        }
        
        return features
    
    def extract_insulin_features(self, insulin_df, timestamp, lookback_minutes=180):
        """
        Extract features from insulin data
        
        Features:
        - time_since_last_insulin: Minutes since last bolus
        - recent_insulin_dose: Total insulin in last 2 hours
        - active_insulin: Estimated IOB (Insulin on Board)
        - insulin_trend: Is insulin activity increasing?
        """
        
        lookback_start = timestamp - timedelta(minutes=lookback_minutes)
        
        # Find bolus events (rapid-acting insulin)
        bolus_events = insulin_df[
            (insulin_df['type'] == 'bolus') &
            (insulin_df['timestamp'] <= timestamp) &
            (insulin_df['timestamp'] >= lookback_start)
        ].sort_values('timestamp')
        
        # Find last insulin event
        last_insulin = insulin_df[insulin_df['timestamp'] <= timestamp].sort_values('timestamp').tail(1)
        
        if len(last_insulin) > 0:
            time_since_insulin = (timestamp - last_insulin['timestamp'].iloc[0]).total_seconds() / 60
        else:
            time_since_insulin = np.inf
        
        # Total recent insulin
        total_recent_insulin = 0
        if len(bolus_events) > 0:
            total_recent_insulin = bolus_events['dose'].sum()
        
        # Active insulin (simplified IOB)
        # Rapid-acting insulin: ~4 hour duration, peak 60-90 min
        active_insulin = 0
        for _, event in bolus_events.iterrows():
            time_since_bolus = (timestamp - event['timestamp']).total_seconds() / 60
            # Simplified: assume linear decay over 240 minutes (4 hours)
            if time_since_bolus < 240:
                active_insulin += event['dose'] * (1 - time_since_bolus / 240)
        
        features = {
            'time_since_last_insulin': min(time_since_insulin, 1000),  # Cap at 1000 min
            'recent_insulin_total_180min': total_recent_insulin,
            'active_insulin_iob': active_insulin,
            'recent_bolus_count': len(bolus_events),
            'insulin_recent': int(time_since_insulin < 120),
        }
        
        return features
    
    def extract_meal_features(self, meal_df, timestamp, lookback_minutes=300):
        """
        Extract features from meal data
        
        Features:
        - time_since_last_meal: Minutes since meal
        - recent_carbs: Total carbs in last 5 hours
        - active_carbs: Estimated carbs being digested
        - meal_recency: How recent is last meal?
        """
        
        lookback_start = timestamp - timedelta(minutes=lookback_minutes)
        
        # Find meals in lookback window
        meal_events = meal_df[
            (meal_df['timestamp'] <= timestamp) &
            (meal_df['timestamp'] >= lookback_start)
        ].sort_values('timestamp')
        
        # Find last meal
        last_meal = meal_df[meal_df['timestamp'] <= timestamp].sort_values('timestamp').tail(1)
        
        if len(last_meal) > 0:
            time_since_meal = (timestamp - last_meal['timestamp'].iloc[0]).total_seconds() / 60
        else:
            time_since_meal = np.inf
        
        # Total recent carbs
        total_recent_carbs = 0
        if len(meal_events) > 0:
            total_recent_carbs = meal_events['carbs'].sum()
        
        # Active carbs (simplified COB - Carbs on Board)
        # Assumes ~3 hour digestion window, peak 45-90 min
        active_carbs = 0
        for _, meal in meal_events.iterrows():
            time_since_meal_event = (timestamp - meal['timestamp']).total_seconds() / 60
            # Simplified: linear model, peaks at 60 min, gone by 180 min
            if 0 <= time_since_meal_event <= 180:
                if time_since_meal_event <= 60:
                    active_carbs += meal['carbs'] * (time_since_meal_event / 60)
                else:
                    active_carbs += meal['carbs'] * (1 - (time_since_meal_event - 60) / 120)
        
        features = {
            'time_since_last_meal': min(time_since_meal, 1000),
            'recent_carbs_total_300min': total_recent_carbs,
            'active_carbs_cob': active_carbs,
            'recent_meal_count': len(meal_events),
            'meal_recent': int(time_since_meal < 180),
        }
        
        return features
    
    def extract_time_features(self, timestamp):
        """
        Extract temporal features
        
        Features:
        - hour_of_day: 0-23
        - is_night: Binary (22:00 - 06:00)
        - is_meal_time: Binary
        """
        
        hour = timestamp.hour
        minute = timestamp.minute
        
        is_night = hour >= 22 or hour < 6
        is_breakfast_time = 6 <= hour < 9
        is_lunch_time = 12 <= hour < 14
        is_dinner_time = 18 <= hour < 20
        
        features = {
            'hour_of_day': hour,
            'minute_of_hour': minute,
            'is_night': int(is_night),
            'is_meal_time': int(is_breakfast_time or is_lunch_time or is_dinner_time),
            'is_breakfast_time': int(is_breakfast_time),
            'is_lunch_time': int(is_lunch_time),
            'is_dinner_time': int(is_dinner_time),
        }
        
        return features
    
    def engineer_features(self, glucose_df, insulin_df, meal_df, timestamp):
        """
        Engineer all features for a given timestamp
        Returns dict of feature name -> value
        """
        
        features = {}
        
        # Extract from each data source
        features.update(self.extract_glucose_features(glucose_df, timestamp))
        features.update(self.extract_insulin_features(insulin_df, timestamp))
        features.update(self.extract_meal_features(meal_df, timestamp))
        features.update(self.extract_time_features(timestamp))
        
        return features
    
    def create_training_dataset(self, glucose_df, insulin_df, meal_df, 
                                sampling_interval_minutes=30):
        """
        Create training dataset with features and labels
        
        Label: Is glucose < 70 mg/dL within prediction_horizon_minutes?
        """
        
        features_list = []
        labels_list = []
        
        # Get sorted unique timestamps
        timestamps = sorted(glucose_df['timestamp'].unique())
        
        # Sample every N minutes
        sampling_delta = timedelta(minutes=sampling_interval_minutes)
        current_sample_time = timestamps[0]
        
        while current_sample_time < timestamps[-1]:
            # Find closest timestamp to current sample time
            closest_idx = (glucose_df['timestamp'] - current_sample_time).abs().argmin()
            current_timestamp = glucose_df.iloc[closest_idx]['timestamp']
            
            # Define future window
            future_timestamp = current_timestamp + timedelta(minutes=self.prediction_horizon_minutes)
            
            # Skip if future timestamp is beyond data
            if future_timestamp > timestamps[-1]:
                break
            
            # Engineer features at current timestamp
            features = self.engineer_features(glucose_df, insulin_df, meal_df, 
                                            current_timestamp)
            
            if not features:
                current_sample_time += sampling_delta
                continue
            
            # Get label: did hypoglycemia occur in next prediction_horizon_minutes?
            future_glucose = glucose_df[
                (glucose_df['timestamp'] > current_timestamp) &
                (glucose_df['timestamp'] <= future_timestamp)
            ]['glucose_mg_dl']
            
            label = int((future_glucose < 70).any()) if len(future_glucose) > 0 else 0
            
            features_list.append(features)
            labels_list.append(label)
            
            current_sample_time += sampling_delta
        
        # Convert to DataFrame
        X = pd.DataFrame(features_list)
        y = pd.Series(labels_list)
        
        return X, y

if __name__ == '__main__':
    # Example usage
    from dataset_generator import SyntheticT1DDataset
    
    # Generate synthetic data
    generator = SyntheticT1DDataset()
    glucose_df, insulin_df, meal_df = generator.create_dataset(duration_days=7)
    
    # Engineer features
    engineer = T1DFeatureEngineer(prediction_horizon_minutes=45)
    X, y = engineer.create_training_dataset(glucose_df, insulin_df, meal_df)
    
    print(f"\n✓ Features engineered")
    print(f"  - Training samples: {len(X)}")
    print(f"  - Features: {len(X.columns)}")
    print(f"  - Positive class (hypoglycemia): {y.sum()} ({100*y.sum()/len(y):.1f}%)")
    print(f"\nFeature names:")
    print(X.columns.tolist())
