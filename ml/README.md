# Gluco One — ML Data Pipeline

Machine learning data infrastructure for 30-60 minute hypoglycemia prediction in Type 1 Diabetes.

## Quick Start

### 1. Generate Synthetic Dataset
```bash
cd ml
python dataset_generator.py
```

Creates 7-day synthetic T1D dataset:
- `data/glucose.csv` — CGM readings (5-min intervals)
- `data/insulin.csv` — Insulin events (bolus + basal)
- `data/meals.csv` — Meal logs with carb estimates

### 2. Explore Data
```bash
python data_exploration.py
```

Outputs:
- Console report with statistics
- `data/data_exploration_report.json` — Detailed analysis

### 3. Engineer Features
```bash
python feature_engineering.py
```

Creates training dataset with:
- **29 engineered features** (glucose, insulin, meal, time-based)
- **Binary labels** (hypoglycemia <70 mg/dL in next 30-60 min)
- **Ready for ML model training**

## Data Structure

### Input: Raw Data (3 CSV files)

**glucose.csv**
```
timestamp,glucose_mg_dl
2024-01-01 06:00:00,125.3
2024-01-01 06:05:00,128.1
...
```

**insulin.csv**
```
timestamp,type,dose,duration_hours,carbs_estimated
2024-01-01 08:00:00,bolus,5.5,,45
2024-01-01 06:00:00,basal,1.0,12,
...
```

**meals.csv**
```
timestamp,meal_name,carbs,region,confidence
2024-01-01 07:00:00,Breakfast,45,North,0.95
2024-01-01 13:00:00,Lunch,65,South,0.90
...
```

### Output: Features (Pandas DataFrame)

**29 Features:**
- 11 Glucose features (current, trend, acceleration, statistics)
- 5 Insulin features (IOB, timing, frequency)
- 5 Meal features (COB, timing, frequency)
- 8 Temporal features (hour, day pattern, meal time)

**Binary Label:**
- 0 = No hypoglycemia (<70) in next 30-60 minutes
- 1 = Hypoglycemia will occur

## Modules

### dataset_generator.py
**Class:** `SyntheticT1DDataset`

Generates realistic Type 1 Diabetes data based on OhioT1DM specifications.

**Example:**
```python
from dataset_generator import SyntheticT1DDataset

generator = SyntheticT1DDataset(seed=42)
glucose_df, insulin_df, meal_df = generator.create_dataset(
    duration_days=7,
    output_dir='ml/data'
)
```

**Features:**
- Realistic CGM noise and drift
- Physiological glucose patterns (circadian rhythm)
- Typical insulin schedules (bolus + basal)
- Indian diet meal patterns (5 meals/day, 15-80g carbs)

### feature_engineering.py
**Class:** `T1DFeatureEngineer`

Extracts and engineers 29 features for hypoglycemia prediction.

**Example:**
```python
from feature_engineering import T1DFeatureEngineer
import pandas as pd

# Load data
glucose_df = pd.read_csv('data/glucose.csv')
insulin_df = pd.read_csv('data/insulin.csv')
meal_df = pd.read_csv('data/meals.csv')

# Engineer features
engineer = T1DFeatureEngineer(prediction_horizon_minutes=45)
X, y = engineer.create_training_dataset(glucose_df, insulin_df, meal_df)

print(f"Training samples: {len(X)}")
print(f"Features: {list(X.columns)}")
print(f"Positive class: {y.sum()} ({100*y.sum()/len(y):.1f}%)")
```

**Feature Extraction:**
- `extract_glucose_features()` — Glucose statistics, trends, derivatives
- `extract_insulin_features()` — IOB, bolus history, timing
- `extract_meal_features()` — COB, carbs history, meal timing
- `extract_time_features()` — Hour, circadian patterns

### data_exploration.py
**Class:** `DataExplorer`

Analyzes data quality, distributions, and statistics.

**Example:**
```python
from data_exploration import DataExplorer

explorer = DataExplorer()
explorer.load_data()
report = explorer.generate_report()
explorer.print_report(report)
```

**Analysis:**
- Glucose: statistics, range distribution, time-in-range
- Insulin: bolus/basal frequency and doses
- Meals: carb distribution, regional patterns
- Quality: completeness, data alignment, time coverage

## Data Source

### Synthetic (Current)
- Realistic generator based on OhioT1DM structure
- Fast iteration during development
- Reproducible (seeded random)

### Real Data (Future)
The OhioT1DM dataset is available to researchers:
- 12 patients × 8 weeks data
- CGM (5-min), insulin, meals, physiological sensors
- Request: Email `razvan.bunescu@charlotte.edu`

To integrate real data:
1. Download and unzip OhioT1DM
2. Convert to our CSV format
3. Run data exploration
4. Engineer features as usual

## Features Explained

### Glucose (11 features)
- `glucose_current` — Current reading
- `glucose_trend_15min` — Rate of change (mg/dL/min)
- `glucose_trend_30min` — Longer-term trend
- `glucose_acceleration` — Trend acceleration (2nd derivative)
- `glucose_avg_120min` — 2-hour average
- `glucose_min_120min`, `glucose_max_120min` — Range
- `glucose_std_120min` — Variability
- `glucose_below_70`, `glucose_below_90` — Danger zones
- `glucose_in_range` — Normal range (70-180)

### Insulin (5 features)
- `time_since_last_insulin` — Minutes since injection
- `recent_insulin_total_180min` — Total insulin last 3 hours
- `active_insulin_iob` — Insulin on Board (active insulin)
- `recent_bolus_count` — Number of meal injections
- `insulin_recent` — Was insulin given recently?

### Meal (5 features)
- `time_since_last_meal` — Minutes since meal
- `recent_carbs_total_300min` — Total carbs last 5 hours
- `active_carbs_cob` — Carbs on Board (digesting carbs)
- `recent_meal_count` — Number of meals logged
- `meal_recent` — Was there a recent meal?

### Temporal (8 features)
- `hour_of_day` — 0-23
- `minute_of_hour` — 0-59
- `is_night` — 22:00-06:00?
- `is_meal_time`, `is_breakfast_time`, `is_lunch_time`, `is_dinner_time` — Time-of-day patterns

## Model Development

### Phase 6 (Next)

1. **Data preparation**
   ```python
   X, y = engineer.create_training_dataset(...)
   
   # Split
   X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3)
   
   # Normalize
   scaler = StandardScaler()
   X_train = scaler.fit_transform(X_train)
   X_test = scaler.transform(X_test)
   ```

2. **Model training**
   ```python
   from sklearn.ensemble import RandomForestClassifier
   from xgboost import XGBClassifier
   
   # Baseline
   model = RandomForestClassifier()
   model.fit(X_train, y_train)
   
   # Advanced
   model = XGBClassifier(max_depth=5, learning_rate=0.1)
   model.fit(X_train, y_train)
   ```

3. **Evaluation**
   ```python
   from sklearn.metrics import recall_score, precision_score, roc_auc_score
   
   y_pred = model.predict(X_test)
   y_pred_proba = model.predict_proba(X_test)[:, 1]
   
   recall = recall_score(y_test, y_pred)  # Minimize missed hypos
   precision = precision_score(y_test, y_pred)  # Minimize false alarms
   auc = roc_auc_score(y_test, y_pred_proba)
   
   print(f"Recall: {recall:.3f}, Precision: {precision:.3f}, AUC: {auc:.3f}")
   ```

## Performance Targets

For hypoglycemia prediction:
- **Recall ≥ 0.85** — Catch ≥85% of true hypos
- **Precision ≥ 0.70** — Minimize false alarms to <30%
- **ROC-AUC ≥ 0.80** — Good discrimination

Priority: Recall > Precision (missing hypo is dangerous)

## Prediction Horizons

Currently: **30-60 minutes**

Future:
- 15 minutes (immediate risk)
- 30 minutes (warning zone)
- 60 minutes (planning)
- 120 minutes (long-term)

Adjust with:
```python
engineer = T1DFeatureEngineer(prediction_horizon_minutes=30)
```

## Limitations

### Current
- Synthetic data (unrealistic noise characteristics)
- No sensor data (heart rate, activity)
- Simplified insulin models (no absorption variations)
- Indian diet focus only

### Real Data Limitations
- Small dataset: 12 patients
- High individual variability
- Limited to pump users
- 8 weeks per patient

### Mitigation
- Transfer learning across patients
- Data augmentation
- Personalization during inference

## References

**Papers:**
- Marling & Bunescu (2020): OhioT1DM Dataset
- Bunescu et al. (2023): 30-60 min BGL prediction
- Nature (2024): Transformer-based multi-horizon prediction

**Datasets:**
- OhioT1DM: https://webpages.charlotte.edu/rbunescu/data/ohiot1dm/
- UVA/Padova T1DMS: https://www.padovauniversitypress.it/

## Contributing

To extend the data pipeline:

1. Add new feature types: Edit `feature_engineering.py`
2. Integrate real data: Create `load_real_data.py`
3. Handle missing values: Add `imputation.py`
4. Improve generator: Expand `dataset_generator.py`

## License

Part of Gluco One hackathon project.

---

**Phase 5 Complete** — Ready for Phase 6: ML Model Training
