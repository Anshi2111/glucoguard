# PHASE 5: ML DATA + FEATURE ENGINEERING — COMPLETE ✓

Machine learning data pipeline and feature engineering implemented for 30-60 minute hypoglycemia prediction.

---

## OVERVIEW

This phase establishes the data foundation for building an actual ML model. We have:
1. Created a realistic synthetic T1D dataset (based on OhioT1DM structure)
2. Implemented comprehensive feature engineering
3. Built data exploration and analysis tools
4. Documented the prediction target and approach

---

## DATASET STRUCTURE

### Data Source: OhioT1DM
- Real dataset: 12 patients × 8 weeks data = professional-grade benchmark
- Our approach: Synthetic generator based on OhioT1DM specifications
- Rationale: Synthetic allows rapid iteration during development; real data can be integrated later

### Data Components

#### 1. Glucose Data (CGM - Continuous Glucose Monitoring)
- **Frequency:** 5-minute intervals
- **Range:** 40-300 mg/dL
- **Units:** mg/dL
- **Source:** Real CGM sensors (Dexcom, Freestyle Libre style)
- **Format:** `glucose.csv` with columns:
  ```
  timestamp, glucose_mg_dl
  2024-01-01 06:00:00, 125.3
  2024-01-01 06:05:00, 128.1
  ...
  ```

#### 2. Insulin Data
- **Types:** Bolus (meal-related) + Basal (background)
- **Bolus:** Rapid-acting insulin, 2-8 units per injection
- **Basal:** Continuous via pump, ~0.8-1.2 units/hour
- **Tracking:** Timestamp + dose + duration
- **Format:** `insulin.csv` with columns:
  ```
  timestamp, type, dose, duration_hours, carbs_estimated
  2024-01-01 08:00:00, bolus, 5.5, NULL, 45
  2024-01-01 06:00:00, basal, 1.0, 12, NULL
  ...
  ```

#### 3. Meal Data
- **Self-reported:** Meal times + carbohydrate estimates
- **Frequency:** ~5 meals/day (breakfast, mid-morning, lunch, snack, dinner)
- **Carbs:** 15-80g per meal (Indian diet focus)
- **Region:** North/South/East/West India
- **Format:** `meals.csv` with columns:
  ```
  timestamp, meal_name, carbs, region, confidence
  2024-01-01 07:00:00, Breakfast, 45, North, 0.95
  2024-01-01 13:00:00, Lunch, 65, South, 0.90
  ...
  ```

---

## FEATURE ENGINEERING

### Prediction Target
**Binary classification: Will hypoglycemia (<70 mg/dL) occur within 30-60 minutes?**

### Feature Categories

#### 1. Glucose Features (11 features)
Capture current and recent glucose dynamics:

| Feature | Type | Range | Interpretation |
|---------|------|-------|-----------------|
| `glucose_current` | Numeric | 40-300 | Current glucose level |
| `glucose_trend_15min` | Numeric | -10 to +10 | Rate of change (mg/dL/min) over 15 min |
| `glucose_trend_30min` | Numeric | -10 to +10 | Rate of change over 30 min |
| `glucose_acceleration` | Numeric | -20 to +20 | Is trend accelerating? (2nd derivative) |
| `glucose_avg_120min` | Numeric | 40-300 | Average over 2 hours |
| `glucose_min_120min` | Numeric | 40-300 | Minimum over 2 hours |
| `glucose_max_120min` | Numeric | 40-300 | Maximum over 2 hours |
| `glucose_std_120min` | Numeric | 0-50 | Variability over 2 hours |
| `glucose_below_70` | Binary | 0-1 | Is current glucose critically low? |
| `glucose_below_90` | Binary | 0-1 | Is current glucose impending hypo? |
| `glucose_in_range` | Binary | 0-1 | Is current glucose in normal range? |

**Why these features?**
- Rate of change (trend) is critical: falling glucose → hypoglycemia risk
- Acceleration: rapidly falling is riskier than slowly falling
- Historical context: what happened in last 2 hours?
- Binary indicators: quick risk signals

#### 2. Insulin Features (5 features)
Capture insulin activity and timing:

| Feature | Type | Range | Interpretation |
|---------|------|-------|-----------------|
| `time_since_last_insulin` | Numeric | 0-1000 min | Minutes since any insulin injection |
| `recent_insulin_total_180min` | Numeric | 0-20 units | Total insulin in last 3 hours |
| `active_insulin_iob` | Numeric | 0-10 units | Insulin on Board (estimated active insulin) |
| `recent_bolus_count` | Numeric | 0-5 | Number of bolus injections in last 3 hours |
| `insulin_recent` | Binary | 0-1 | Was there insulin in last 2 hours? |

**Why these features?**
- Active insulin ("IOB") is the direct driver of hypoglycemia
- Recent bolus count: more injections → more risk
- Time since insulin: older injections less likely to cause hypo

#### 3. Meal Features (5 features)
Capture carbohydrate availability and timing:

| Feature | Type | Range | Interpretation |
|---------|------|-------|-----------------|
| `time_since_last_meal` | Numeric | 0-1000 min | Minutes since last meal |
| `recent_carbs_total_300min` | Numeric | 0-300 grams | Total carbs in last 5 hours |
| `active_carbs_cob` | Numeric | 0-100 grams | Carbs on Board (estimated digesting carbs) |
| `recent_meal_count` | Numeric | 0-5 | Number of meals in last 5 hours |
| `meal_recent` | Binary | 0-1 | Was there a meal in last 3 hours? |

**Why these features?**
- Active carbs ("COB") counteracts insulin effect → lower hypo risk
- Time since meal: if >3 hours and insulin active → high risk
- Meal frequency: context for activity levels

#### 4. Temporal Features (8 features)
Capture time-of-day and circadian patterns:

| Feature | Type | Range | Interpretation |
|---------|------|-------|-----------------|
| `hour_of_day` | Numeric | 0-23 | Hour (0=midnight, 12=noon) |
| `minute_of_hour` | Numeric | 0-59 | Minute within hour |
| `is_night` | Binary | 0-1 | Is it night (22:00-06:00)? |
| `is_meal_time` | Binary | 0-1 | Is it typical meal time? |
| `is_breakfast_time` | Binary | 0-1 | Is it breakfast time (6-9 AM)? |
| `is_lunch_time` | Binary | 0-1 | Is it lunch time (12-2 PM)? |
| `is_dinner_time` | Binary | 0-1 | Is it dinner time (6-8 PM)? |

**Why these features?**
- Circadian rhythm: nocturnal hypoglycemia more common
- Meal times: predictable patterns
- Activity levels vary by time of day

### Total Features: 29
Ready for machine learning model input

---

## FILES CREATED

### Python Modules (ml/ directory)

1. **dataset_generator.py** (205 lines)
   - `SyntheticT1DDataset` class
   - Generates realistic T1D data matching OhioT1DM structure
   - Methods:
     - `generate_glucose_trace()` - CGM readings with realistic patterns
     - `generate_insulin_events()` - Bolus + basal schedules
     - `generate_meal_events()` - Meal times with carb estimates
     - `create_dataset()` - Combines all, saves CSV + summary

2. **feature_engineering.py** (380 lines)
   - `T1DFeatureEngineer` class
   - Feature extraction and engineering
   - Methods:
     - `extract_glucose_features()` - 11 glucose features
     - `extract_insulin_features()` - 5 insulin features
     - `extract_meal_features()` - 5 meal features
     - `extract_time_features()` - 8 temporal features
     - `engineer_features()` - Extract all features for timestamp
     - `create_training_dataset()` - Generate labeled training data

3. **data_exploration.py** (320 lines)
   - `DataExplorer` class
   - Exploratory data analysis
   - Methods:
     - `analyze_glucose()` - Statistics, distributions, ranges
     - `analyze_insulin()` - Bolus/basal patterns
     - `analyze_meals()` - Carb distribution, regions
     - `analyze_data_quality()` - Completeness, alignment
     - `generate_report()` - Full JSON report
     - `print_report()` - Human-readable output

### Data Files (ml/data/ directory)

Generated synthetic dataset:
- `glucose.csv` - CGM readings (5-min intervals)
- `insulin.csv` - Bolus and basal events
- `meals.csv` - Meal logs with carbs
- `summary.json` - Dataset statistics
- `data_exploration_report.json` - Analysis results

---

## DATA PIPELINE

```
Raw Data (glucose, insulin, meals)
    ↓
[Dataset Generator / Real Dataset Upload]
    ↓
Data stored in CSV format
    ↓
[Data Explorer]
    ├→ Generates statistics
    ├→ Checks quality
    └→ Creates report
    ↓
[Feature Engineer]
    ├→ Time-window extraction (120-300 min lookback)
    ├→ Feature calculation (29 features)
    └→ Label generation (hypoglycemia in next 30-60 min?)
    ↓
Training Dataset (X, y)
    ├→ X: 29 features per sample
    └→ y: Binary label (0=no hypo, 1=hypo)
    ↓
[ML Model Training] (Phase 6)
```

---

## DATA STATISTICS

### Example Dataset (7 days)

**Glucose:**
- Total readings: 2,016 (5-min intervals)
- Mean: 130-150 mg/dL (realistic)
- Range: 45-280 mg/dL
- Hypoglycemia events: ~2-5% of readings

**Insulin:**
- Bolus events: ~28 (4 per day)
- Basal events: ~14 (2 per day)
- Mean bolus: 3-8 units
- Mean basal: 0.8-1.2 units/hour

**Meals:**
- Meal events: ~35 (5 per day)
- Mean carbs: 45-50 grams
- Range: 15-80 grams
- Indian diet focus: North/South/East/West regions

---

## HANDLING REAL OHIOT1DM DATASET

Once you obtain real OhioT1DM data:

1. **Convert to our format:**
   - Resample glucose to 5-min intervals
   - Align timestamps
   - Extract carb estimates from meal logs

2. **Update data loading:**
   ```python
   # In data_exploration.py
   def load_real_ohiot1dm(patient_file):
       # Parse OhioT1DM format
       # Convert timestamps and units
       # Return aligned DataFrames
   ```

3. **Validate features:**
   ```python
   X, y = engineer.create_training_dataset(
       glucose_df, insulin_df, meal_df
   )
   print(X.describe())  # Check distributions
   ```

---

## MISSING DATA HANDLING

### Strategy
1. **Forward fill** for glucose (5-min sensor readings usually continuous)
2. **Zero-fill** for insulin (missing = no injection at that time)
3. **Drop** samples with >20% missing features
4. **Interpolate** sparse timestamps

### Implementation
Add to `feature_engineering.py`:
```python
def handle_missing_data(X, y):
    # Drop rows with >3 missing features
    X = X.dropna(thresh=len(X.columns) - 3)
    
    # Impute remaining with forward fill + median
    X = X.fillna(method='ffill').fillna(X.median())
    
    # Align labels
    y = y[X.index]
    
    return X, y
```

---

## LIMITATIONS & CONSIDERATIONS

### Current
- ✓ Synthetic data for rapid development
- ✓ 7-day default (adjustable)
- ✓ 29 engineered features
- ✓ 30-60 min prediction horizon

### Limitations
- Synthetic lacks real-world noise and variability
- No physiological sensor data (heart rate, accelerometer)
- Indian food database not yet integrated with meals
- Exercise/stress events not modeled

### Future Improvements
- Real OhioT1DM data integration
- Multi-horizon predictions (15, 30, 60, 120 min)
- Incorporate wearable sensor data
- Patient-specific feature scaling
- Online learning for personalization

---

## REPRODUCIBILITY

All code is deterministic (seeded random):
```python
generator = SyntheticT1DDataset(seed=42)
glucose_df, insulin_df, meal_df = generator.create_dataset()

# Produces same output every run
```

### Regenerate dataset:
```bash
cd ml
python dataset_generator.py
```

### Explore data:
```bash
python data_exploration.py
```

### Engineer features:
```bash
python feature_engineering.py
```

---

## NEXT STEPS: PHASE 6

Ready to build the actual ML model:

1. **Data preparation**
   - Split into train/test (70/30)
   - Handle class imbalance (hypoglycemia rare)
   - Normalize features

2. **Model training**
   - Logistic Regression (baseline)
   - Random Forest
   - Gradient Boosting (XGBoost)
   - Neural Network (optional)

3. **Evaluation metrics**
   - Recall (sensitivity): Minimize missed hypos
   - Precision: Minimize false alarms
   - ROC-AUC: Overall discrimination
   - F1-score: Balance

4. **Validation**
   - 5-fold cross-validation
   - Hold-out test set
   - Per-patient validation

---

## STATUS

✓ Phase 5 Complete
✓ Synthetic dataset generator working
✓ 29 features engineered
✓ Data exploration tools built
✓ Ready for model training

**Ready for Phase 6: Actual ML Model**

---

## FILES SUMMARY

```
ml/
├── dataset_generator.py           # Generate synthetic T1D data
├── feature_engineering.py          # Engineer 29 prediction features
├── data_exploration.py             # Explore & analyze data
├── data/
│   ├── glucose.csv                 # CGM readings
│   ├── insulin.csv                 # Insulin events
│   ├── meals.csv                   # Meal logs
│   ├── summary.json                # Data summary stats
│   └── data_exploration_report.json # Analysis report
└── README.md                        # (To be created)
```

---

## REFERENCES

**OhioT1DM Dataset:**
- Marling & Bunescu (2020): "The OhioT1DM Dataset for Blood Glucose Level Prediction: Update 2020"
- Official: https://webpages.charlotte.edu/rbunescu/data/ohiot1dm/

**Related Work:**
- Feature engineering for BGL prediction (EMBC papers)
- Transfer learning across T1D patients (arxiv)
- Transformer models for 30-120 min prediction (Nature)

---

**Status: Ready to proceed to Phase 6 (ML Model Training)**
