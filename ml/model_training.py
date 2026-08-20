"""
ML Model Training for T1D Hypoglycemia Prediction
Train multiple models and select the best performer
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, roc_curve,
    recall_score, precision_score, f1_score, accuracy_score
)
import json
import pickle
import os
from datetime import datetime

from dataset_generator import SyntheticT1DDataset
from feature_engineering import T1DFeatureEngineer

class ModelTrainer:
    """Train and evaluate ML models for hypoglycemia prediction"""
    
    def __init__(self, model_dir='ml/models'):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.models = {}
        self.results = {}
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.scaler = None
    
    def prepare_data(self, glucose_df, insulin_df, meal_df, test_size=0.3, random_state=42):
        """Prepare and split data"""
        print("\n📊 Preparing data...")
        
        # Engineer features
        engineer = T1DFeatureEngineer(prediction_horizon_minutes=45)
        X, y = engineer.create_training_dataset(glucose_df, insulin_df, meal_df)
        
        print(f"✓ Total samples: {len(X)}")
        print(f"✓ Features: {len(X.columns)}")
        print(f"✓ Positive class (hypo): {y.sum()} ({100*y.sum()/len(y):.1f}%)")
        print(f"✓ Feature list:\n  {list(X.columns)}")
        
        # Handle missing values
        X = X.fillna(X.median())
        
        # Split data
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        # Scale features
        self.scaler = StandardScaler()
        self.X_train = self.scaler.fit_transform(self.X_train)
        self.X_test = self.scaler.transform(self.X_test)
        
        print(f"\n✓ Train set: {len(self.X_train)} samples")
        print(f"✓ Test set: {len(self.X_test)} samples")
        print(f"✓ Class distribution (train): {self.y_train.sum()} hypos ({100*self.y_train.sum()/len(self.y_train):.1f}%)")
        print(f"✓ Class distribution (test): {self.y_test.sum()} hypos ({100*self.y_test.sum()/len(self.y_test):.1f}%)")
    
    def train_logistic_regression(self):
        """Train Logistic Regression baseline"""
        print("\n" + "="*60)
        print("Training: Logistic Regression (Baseline)")
        print("="*60)
        
        model = LogisticRegression(
            random_state=42,
            max_iter=1000,
            class_weight='balanced'  # Handle class imbalance
        )
        
        model.fit(self.X_train, self.y_train)
        self.models['logistic_regression'] = model
        
        self._evaluate_model('logistic_regression', model)
    
    def train_random_forest(self):
        """Train Random Forest"""
        print("\n" + "="*60)
        print("Training: Random Forest")
        print("="*60)
        
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
            class_weight='balanced',
            n_jobs=-1
        )
        
        model.fit(self.X_train, self.y_train)
        self.models['random_forest'] = model
        
        self._evaluate_model('random_forest', model)
    
    def train_xgboost(self):
        """Train XGBoost"""
        try:
            import xgboost as xgb
        except ImportError:
            print("⚠️  XGBoost not installed. Skipping.")
            return
        
        print("\n" + "="*60)
        print("Training: XGBoost")
        print("="*60)
        
        # Calculate scale_pos_weight for imbalanced data
        scale_pos_weight = (len(self.y_train) - self.y_train.sum()) / self.y_train.sum()
        
        model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            scale_pos_weight=scale_pos_weight,
            n_jobs=-1
        )
        
        model.fit(self.X_train, self.y_train)
        self.models['xgboost'] = model
        
        self._evaluate_model('xgboost', model)
    
    def _evaluate_model(self, model_name, model):
        """Evaluate model on test set"""
        y_pred = model.predict(self.X_test)
        y_pred_proba = model.predict_proba(self.X_test)[:, 1]
        
        # Calculate metrics
        recall = recall_score(self.y_test, y_pred)
        precision = precision_score(self.y_test, y_pred)
        f1 = f1_score(self.y_test, y_pred)
        accuracy = accuracy_score(self.y_test, y_pred)
        roc_auc = roc_auc_score(self.y_test, y_pred_proba)
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(self.y_test, y_pred).ravel()
        specificity = tn / (tn + fp)
        
        results = {
            'recall': float(recall),
            'precision': float(precision),
            'f1_score': float(f1),
            'accuracy': float(accuracy),
            'roc_auc': float(roc_auc),
            'specificity': float(specificity),
            'tp': int(tp),
            'tn': int(tn),
            'fp': int(fp),
            'fn': int(fn),
        }
        
        self.results[model_name] = results
        
        # Print results
        print(f"\n✓ {model_name.upper()} Results:")
        print(f"  Recall:      {recall:.3f}  (catch {recall*100:.1f}% of true hypos)")
        print(f"  Precision:   {precision:.3f}  (false alarm rate {(1-precision)*100:.1f}%)")
        print(f"  F1-score:    {f1:.3f}")
        print(f"  Accuracy:    {accuracy:.3f}")
        print(f"  ROC-AUC:     {roc_auc:.3f}")
        print(f"  Specificity: {specificity:.3f}")
        print(f"\n  Confusion Matrix:")
        print(f"    TP={tp:3d}  FP={fp:3d}")
        print(f"    FN={fn:3d}  TN={tn:3d}")
    
    def select_best_model(self):
        """Select best model based on recall (priority: catch hypos)"""
        if not self.results:
            print("No models trained yet!")
            return None
        
        # Sort by recall (primary), then ROC-AUC (secondary)
        sorted_models = sorted(
            self.results.items(),
            key=lambda x: (x[1]['recall'], x[1]['roc_auc']),
            reverse=True
        )
        
        best_model_name = sorted_models[0][0]
        
        print("\n" + "="*60)
        print("BEST MODEL SELECTED")
        print("="*60)
        print(f"Model: {best_model_name}")
        print(f"Recall: {self.results[best_model_name]['recall']:.3f}")
        print(f"Precision: {self.results[best_model_name]['precision']:.3f}")
        print(f"ROC-AUC: {self.results[best_model_name]['roc_auc']:.3f}")
        
        return best_model_name
    
    def save_model(self, model_name):
        """Save trained model"""
        if model_name not in self.models:
            print(f"Model {model_name} not found!")
            return
        
        model_path = f"{self.model_dir}/{model_name}_model.pkl"
        scaler_path = f"{self.model_dir}/scaler.pkl"
        
        with open(model_path, 'wb') as f:
            pickle.dump(self.models[model_name], f)
        
        with open(scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
        
        print(f"✓ Model saved: {model_path}")
        print(f"✓ Scaler saved: {scaler_path}")
    
    def save_results(self, output_file='ml/model_training_results.json'):
        """Save training results"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'training_summary': {
                'train_samples': len(self.X_train),
                'test_samples': len(self.X_test),
                'train_positive_rate': float(self.y_train.sum() / len(self.y_train)),
                'test_positive_rate': float(self.y_test.sum() / len(self.y_test)),
            },
            'model_results': self.results,
        }
        
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n✓ Results saved: {output_file}")
    
    def print_summary(self):
        """Print comprehensive summary"""
        print("\n" + "="*60)
        print("TRAINING SUMMARY")
        print("="*60)
        
        print("\nModel Performance Comparison:")
        print("-" * 60)
        print(f"{'Model':<20} {'Recall':<10} {'Precision':<10} {'ROC-AUC':<10}")
        print("-" * 60)
        
        for model_name, metrics in sorted(self.results.items()):
            print(f"{model_name:<20} {metrics['recall']:<10.3f} {metrics['precision']:<10.3f} {metrics['roc_auc']:<10.3f}")
        
        print("-" * 60)
        print("\nInterpretation:")
        print("✓ HIGH Recall (≥0.85) = Catches most hypos (critical!)")
        print("✓ HIGH Precision (≥0.70) = Few false alarms")
        print("✓ HIGH ROC-AUC (≥0.80) = Good overall discrimination")

if __name__ == '__main__':
    # Step 1: Generate synthetic data (use 21 days for more hypo events)
    print("Step 1: Generating synthetic data...")
    generator = SyntheticT1DDataset()
    glucose_df, insulin_df, meal_df = generator.create_dataset(duration_days=21)
    
    # Step 2: Prepare data
    print("\nStep 2: Preparing training data...")
    trainer = ModelTrainer()
    trainer.prepare_data(glucose_df, insulin_df, meal_df)
    
    # Step 3: Train models
    print("\nStep 3: Training models...")
    trainer.train_logistic_regression()
    trainer.train_random_forest()
    try:
        trainer.train_xgboost()
    except:
        print("Note: XGBoost training skipped")
    
    # Step 4: Select best model
    print("\nStep 4: Selecting best model...")
    best_model = trainer.select_best_model()
    
    # Step 5: Save model
    print("\nStep 5: Saving model...")
    trainer.save_model(best_model)
    trainer.save_results()
    
    # Step 6: Print summary
    trainer.print_summary()
    
    print("\n✅ Phase 6 Complete!")
