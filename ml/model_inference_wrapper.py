#!/usr/bin/env python3
"""
ML Model Inference Wrapper
Reads features from stdin, makes prediction, outputs JSON result
Called from Node.js backend
"""

import json
import sys
import pickle
import os
from pathlib import Path

def load_model(model_dir='ml/models'):
    """Load trained model and scaler"""
    try:
        model_path = os.path.join(model_dir, 'logistic_regression_model.pkl')
        scaler_path = os.path.join(model_dir, 'scaler.pkl')
        
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
        
        return model, scaler
    except Exception as e:
        print(json.dumps({
            'error': f'Failed to load model: {str(e)}',
            'prediction': 0,
            'probability': 0.0,
            'risk_level': 'UNKNOWN'
        }))
        sys.exit(1)

def make_prediction(features_dict, model, scaler):
    """
    Make prediction from features
    Returns: {prediction, probability, risk_level, factors}
    """
    import numpy as np
    
    try:
        # Feature order must match training
        feature_names = [
            'time_since_last_insulin', 'recent_insulin_total_180min', 'active_insulin_iob',
            'recent_bolus_count', 'insulin_recent', 'time_since_last_meal',
            'recent_carbs_total_300min', 'active_carbs_cob', 'recent_meal_count',
            'meal_recent', 'hour_of_day', 'minute_of_hour', 'is_night', 'is_meal_time',
            'is_breakfast_time', 'is_lunch_time', 'is_dinner_time', 'glucose_current',
            'glucose_trend_15min', 'glucose_trend_30min', 'glucose_acceleration',
            'glucose_avg_120min', 'glucose_min_120min', 'glucose_max_120min',
            'glucose_std_120min', 'glucose_below_70', 'glucose_below_90', 'glucose_in_range',
            'glucose_above_180'
        ]
        
        # Build feature vector in correct order
        feature_vector = []
        for feature_name in feature_names:
            value = features_dict.get(feature_name, 0)
            feature_vector.append(float(value))
        
        # Convert to numpy array and reshape
        X = np.array([feature_vector])
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Make prediction
        prediction = model.predict(X_scaled)[0]
        probability = model.predict_proba(X_scaled)[0][1]
        
        # Determine risk level
        if probability >= 0.7:
            risk_level = 'ELEVATED'
        elif probability >= 0.4:
            risk_level = 'MODERATE'
        else:
            risk_level = 'LOW'
        
        # Get top contributing features (from coefficients if available)
        factors = []
        if hasattr(model, 'coef_'):
            coef_dict = {}
            for i, fname in enumerate(feature_names):
                coef_dict[fname] = abs(float(model.coef_[0][i]))
            
            # Get top 5 features
            top_features = sorted(coef_dict.items(), key=lambda x: x[1], reverse=True)[:5]
            for fname, importance in top_features:
                value = features_dict.get(fname, 0)
                factors.append({
                    'name': fname.replace('_', ' ').title(),
                    'value': round(float(value), 2),
                    'importance': round(float(importance), 3)
                })
        
        result = {
            'prediction': int(prediction),
            'probability': round(float(probability), 3),
            'risk_level': risk_level,
            'factors': factors,
            'confidence': round(float(abs(probability - 0.5) * 2), 2)  # 0-1 scale
        }
        
        return result
    
    except Exception as e:
        return {
            'error': str(e),
            'prediction': 0,
            'probability': 0.0,
            'risk_level': 'UNKNOWN'
        }

if __name__ == '__main__':
    # Read features from stdin (JSON)
    try:
        input_data = sys.stdin.read()
        features = json.loads(input_data)
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}))
        sys.exit(1)
    
    # Load model
    model, scaler = load_model()
    
    # Make prediction
    result = make_prediction(features, model, scaler)
    
    # Output result as JSON
    print(json.dumps(result))
