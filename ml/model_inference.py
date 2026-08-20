"""
Model Inference - Use trained model to make predictions
"""

import pandas as pd
import numpy as np
import pickle
import json
from datetime import datetime, timedelta

class HypoglycemiaPredictor:
    """Load trained model and make predictions"""
    
    def __init__(self, model_path='ml/models/random_forest_model.pkl', 
                 scaler_path='ml/models/scaler.pkl'):
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.model = None
        self.scaler = None
        self.load_model()
    
    def load_model(self):
        """Load trained model and scaler"""
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            with open(self.scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
            print(f"✓ Model loaded: {self.model_path}")
            print(f"✓ Scaler loaded: {self.scaler_path}")
        except FileNotFoundError:
            print(f"⚠️  Model not found at {self.model_path}")
            print("Train a model first with model_training.py")
    
    def predict(self, features_dict):
        """
        Make prediction from feature dict
        
        Args:
            features_dict: Dict with 29 features
            
        Returns:
            Dict with prediction, probability, and risk level
        """
        if self.model is None or self.scaler is None:
            return {'error': 'Model not loaded'}
        
        # Convert dict to array in correct order
        feature_names = [
            'glucose_current', 'glucose_trend_15min', 'glucose_trend_30min',
            'glucose_acceleration', 'glucose_avg_120min', 'glucose_min_120min',
            'glucose_max_120min', 'glucose_std_120min', 'glucose_below_70',
            'glucose_below_90', 'glucose_in_range', 'time_since_last_insulin',
            'recent_insulin_total_180min', 'active_insulin_iob', 'recent_bolus_count',
            'insulin_recent', 'time_since_last_meal', 'recent_carbs_total_300min',
            'active_carbs_cob', 'recent_meal_count', 'meal_recent', 'hour_of_day',
            'minute_of_hour', 'is_night', 'is_meal_time', 'is_breakfast_time',
            'is_lunch_time', 'is_dinner_time'
        ]
        
        # Extract features in order
        X = np.array([[features_dict.get(name, 0) for name in feature_names]])
        
        # Scale
        X_scaled = self.scaler.transform(X)
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        probability = self.model.predict_proba(X_scaled)[0][1]
        
        # Determine risk level
        if probability >= 0.7:
            risk_level = 'ELEVATED'
        elif probability >= 0.4:
            risk_level = 'MODERATE'
        else:
            risk_level = 'LOW'
        
        return {
            'prediction': int(prediction),  # 0 or 1
            'probability': float(probability),
            'risk_level': risk_level,
            'confidence': float(max(self.model.predict_proba(X_scaled)[0])),
            'timestamp': datetime.now().isoformat()
        }
    
    def predict_batch(self, features_df):
        """Make predictions on batch of samples"""
        if self.model is None:
            return []
        
        X_scaled = self.scaler.transform(features_df)
        predictions = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)[:, 1]
        
        results = []
        for pred, prob in zip(predictions, probabilities):
            if prob >= 0.7:
                risk_level = 'ELEVATED'
            elif prob >= 0.4:
                risk_level = 'MODERATE'
            else:
                risk_level = 'LOW'
            
            results.append({
                'prediction': int(pred),
                'probability': float(prob),
                'risk_level': risk_level
            })
        
        return results
    
    def get_feature_importance(self):
        """Get feature importance from model"""
        if self.model is None:
            return {}
        
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            feature_names = [
                'glucose_current', 'glucose_trend_15min', 'glucose_trend_30min',
                'glucose_acceleration', 'glucose_avg_120min', 'glucose_min_120min',
                'glucose_max_120min', 'glucose_std_120min', 'glucose_below_70',
                'glucose_below_90', 'glucose_in_range', 'time_since_last_insulin',
                'recent_insulin_total_180min', 'active_insulin_iob', 'recent_bolus_count',
                'insulin_recent', 'time_since_last_meal', 'recent_carbs_total_300min',
                'active_carbs_cob', 'recent_meal_count', 'meal_recent', 'hour_of_day',
                'minute_of_hour', 'is_night', 'is_meal_time', 'is_breakfast_time',
                'is_lunch_time', 'is_dinner_time'
            ]
            
            # Sort by importance
            sorted_idx = np.argsort(importances)[::-1]
            
            importance_dict = {}
            for idx in sorted_idx[:10]:  # Top 10
                importance_dict[feature_names[idx]] = float(importances[idx])
            
            return importance_dict
        
        return {}

if __name__ == '__main__':
    # Example usage
    predictor = HypoglycemiaPredictor()
    
    # Example features (from a real patient)
    example_features = {
        'glucose_current': 85,
        'glucose_trend_15min': -2.5,
        'glucose_trend_30min': -2.0,
        'glucose_acceleration': 0.5,
        'glucose_avg_120min': 110,
        'glucose_min_120min': 75,
        'glucose_max_120min': 150,
        'glucose_std_120min': 20,
        'glucose_below_70': 0,
        'glucose_below_90': 1,
        'glucose_in_range': 0,
        'time_since_last_insulin': 45,
        'recent_insulin_total_180min': 3.5,
        'active_insulin_iob': 2.1,
        'recent_bolus_count': 1,
        'insulin_recent': 1,
        'time_since_last_meal': 180,
        'recent_carbs_total_300min': 0,
        'active_carbs_cob': 0,
        'recent_meal_count': 0,
        'meal_recent': 0,
        'hour_of_day': 14,
        'minute_of_hour': 30,
        'is_night': 0,
        'is_meal_time': 0,
        'is_breakfast_time': 0,
        'is_lunch_time': 1,
        'is_dinner_time': 0,
    }
    
    print("\nExample Prediction:")
    print("-" * 60)
    result = predictor.predict(example_features)
    print(json.dumps(result, indent=2))
    
    print("\nTop Features:")
    print("-" * 60)
    importance = predictor.get_feature_importance()
    for feature, importance_score in sorted(importance.items(), key=lambda x: x[1], reverse=True):
        print(f"{feature:<30} {importance_score:.4f}")
