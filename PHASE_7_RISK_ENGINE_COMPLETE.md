# PHASE 7: RISK ENGINE INTEGRATION — COMPLETE ✓

ML model integration into backend API for real-time hypoglycemia risk predictions.

---

## WHAT WAS BUILT

### 1. ML Bridge (`backend/ml-bridge.js`)
Node.js wrapper that communicates with Python ML model:
- Spawns Python process to load trained model
- Sends features via stdin
- Receives predictions as JSON
- Handles errors gracefully
- Falls back to rule-based if ML unavailable

### 2. Python Inference Wrapper (`ml/model_inference_wrapper.py`)
Standalone Python script that:
- Loads trained model and scaler from pkl files
- Accepts features as JSON via stdin
- Performs feature scaling
- Makes prediction
- Returns: prediction, probability, risk_level, factors

### 3. Risk Prediction Endpoint (`POST /api/predict-risk`)
Backend API that:
- Extracts recent glucose, meals, insulin from database
- Engineers 29 ML features from user data
- Calls ML model via bridge
- Falls back to rule-based if ML fails
- Returns risk level + factors

### 4. Feature Engineering (`engineMLFeatures()` in server.js)
Converts database records to ML features:
- **Glucose:** current, trend, acceleration, statistics
- **Insulin:** active IOB, timing, frequency
- **Meals:** active carbs, timing, frequency
- **Temporal:** hour, meal times, night/day

### 5. Rule-Based Fallback (`getRuleBasedPrediction()` in server.js)
Simple heuristic-based prediction when ML unavailable:
- Current glucose level
- Glucose trend
- Recent insulin activity
- Meal timing

---

## HOW TO USE

### Backend already has ML prediction endpoint ready:

```bash
# POST /api/predict-risk
curl -X POST http://localhost:5000/api/predict-risk \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

### Example Response (ML Model):
```json
{
  "prediction": 1,
  "probability": 0.72,
  "risk_level": "ELEVATED",
  "factors": [
    {"name": "Low glucose level", "value": 85, "importance": 0.85},
    {"name": "Rapidly falling", "value": -2.5, "importance": 0.72}
  ],
  "confidence": 0.44,
  "model": "logistic_regression"
}
```

### Example Response (Fallback):
```json
{
  "prediction": 0,
  "probability": 0.35,
  "risk_level": "MODERATE",
  "factors": [
    {"name": "Falling glucose", "importance": 0.3},
    {"name": "Recent insulin", "importance": 0.3}
  ],
  "confidence": 0.3,
  "model": "rule-based"
}
```

---

## RISK LEVELS

| Level | Probability | Action |
|-------|-------------|--------|
| **LOW** | < 0.4 | No action needed |
| **MODERATE** | 0.4 - 0.7 | Monitor closely, consider snack |
| **ELEVATED** | ≥ 0.7 | Alert user, recommend checking glucose |

---

## RESPONSE FIELDS

| Field | Type | Description |
|-------|------|-------------|
| `prediction` | int (0/1) | Binary: hypo (1) or not (0) |
| `probability` | float (0-1) | Confidence of prediction |
| `risk_level` | string | LOW, MODERATE, or ELEVATED |
| `factors` | array | Contributing factors + importance |
| `confidence` | float (0-1) | Overall confidence in prediction |
| `model` | string | "logistic_regression" or "rule-based" |
| `message` | string | Error message if insufficient data |

---

## FEATURE ENGINEERING

### From Glucose Data:
- `glucose_current` — Current glucose reading (mg/dL)
- `glucose_trend_15min` — Rate of change (mg/dL per minute)
- `glucose_trend_30min` — Longer trend
- `glucose_acceleration` — Is trend accelerating?
- `glucose_avg_120min` — Average over 2 hours
- `glucose_min_120min` — Minimum reading
- `glucose_max_120min` — Maximum reading
- `glucose_std_120min` — Variability
- `glucose_below_70` — Binary (currently hypo?)
- `glucose_below_90` — Binary (impending?)
- `glucose_in_range` — Binary (normal?)
- `glucose_above_180` — Binary (high?)

### From Insulin Data:
- `time_since_last_insulin` — Minutes since bolus
- `recent_insulin_total_180min` — Total units in last 3 hours
- `active_insulin_iob` — Estimated insulin on board
- `recent_bolus_count` — Number of bolus events
- `insulin_recent` — Binary (injected <2h ago?)

### From Meal Data:
- `time_since_last_meal` — Minutes since meal
- `recent_carbs_total_300min` — Total carbs in last 5 hours
- `active_carbs_cob` — Estimated carbs on board (digesting)
- `recent_meal_count` — Number of meal events
- `meal_recent` — Binary (eaten <3h ago?)

### Temporal:
- `hour_of_day` — 0-23
- `minute_of_hour` — 0-59
- `is_night` — Binary (22:00-06:00?)
- `is_meal_time` — Binary (breakfast/lunch/dinner?)
- `is_breakfast_time` — Binary (06:00-09:00?)
- `is_lunch_time` — Binary (12:00-14:00?)
- `is_dinner_time` — Binary (18:00-20:00?)

---

## ML MODEL DETAILS

### Model Selection
- **Logistic Regression** — Fast, interpretable baseline
- **Random Forest** — Handles non-linearity, feature importance
- **XGBoost** — Gradient boosting, highest performance

Currently using: **Logistic Regression** (best recall + simplicity)

### Training Data
- 21-day synthetic T1D dataset
- ~1,000 samples (36% hypo, 64% normal)
- 29 features engineered
- 70/30 train/test split
- Stratified to preserve class distribution

### Performance (on test set):
- **Recall:** 0.578 (catches 58% of true hypos)
- **Precision:** 0.380 (false alarm rate 62%)
- **Accuracy:** 0.508
- **ROC-AUC:** 0.543

*Note: Performance limited by synthetic data. Real data should improve significantly.*

---

## FALLBACK BEHAVIOR

If ML model not available:
1. Check if model files exist in `ml/models/`
2. If not, use rule-based heuristic
3. Rule-based factors:
   - Low glucose (<70): +50% probability
   - Below-target (<100): +20%
   - Rapidly falling (<-10): +30%
   - Recent insulin (<2h): +15%
   - No recent carbs: +10%

---

## ERROR HANDLING

### Insufficient Data
```json
{
  "prediction": 0,
  "probability": 0.0,
  "risk_level": "UNKNOWN",
  "message": "Insufficient glucose data for prediction"
}
```

### ML Model Fails
Automatically falls back to rule-based prediction with:
```json
{
  "model": "rule-based",
  ...
}
```

### Database Error
```json
{
  "error": "Failed to predict risk"
}
```

---

## INTEGRATION POINTS

### Backend Routes
```
POST /api/predict-risk      ← New ML prediction endpoint
GET  /api/risk              ← Existing rule-based endpoint
GET  /api/dashboard         ← Uses existing risk calculation
```

### Files Created/Modified

**New:**
- `backend/ml-bridge.js` — ML communication
- `ml/model_inference_wrapper.py` — Python inference script

**Modified:**
- `backend/server.js` — Added helper functions + POST endpoint

### Dependencies
- No new npm packages required
- Python 3.8+ required on system
- Existing Python ML models (from Phase 6)

---

## TESTING

### Test ML Prediction Endpoint

```bash
# 1. Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Add sample glucose reading
curl -X POST http://localhost:5000/api/glucose \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"value":85,"unit":"mg/dL"}'

# 4. Make risk prediction
curl -X POST http://localhost:5000/api/predict-risk \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"

# Expected: Risk prediction with probability + factors
```

---

## DEPLOYMENT CHECKLIST

- [x] ML model trained and saved
- [x] Python wrapper created
- [x] Backend bridge implemented
- [x] Feature engineering done
- [x] Fallback logic implemented
- [ ] Frontend integrated (Phase 8+)
- [ ] Error monitoring set up
- [ ] Performance benchmarked
- [ ] Model versioning strategy
- [ ] Retraining pipeline

---

## NEXT STEPS: PHASE 8

**Explainability Layer:**
- Extract top contributing factors
- Generate user-friendly explanations
- Show which features pushed risk up/down
- Visualize risk factors in UI

**Frontend Integration:**
- Call POST /api/predict-risk on Risk page
- Display probability + risk level
- Show factor explanations
- Add trend chart

---

## KNOWN LIMITATIONS

### Model
- Trained on synthetic data (not clinical)
- No personalization per patient
- Fixed 45-minute prediction horizon
- No physiological sensor data

### System
- Python process spawn adds latency (~200-500ms)
- Model requires all 29 features (missing data uses 0)
- No model versioning yet
- No A/B testing framework

### Data
- Needs real T1D data for validation
- Small training set (~1,000 samples)
- No cross-validation on holdout set
- Class imbalance not fully addressed

---

## SUCCESS CRITERIA ✓

| Criterion | Status |
|-----------|--------|
| ML endpoint implemented | ✓ |
| Feature engineering working | ✓ |
| Python inference wrapper created | ✓ |
| Fallback logic implemented | ✓ |
| Error handling in place | ✓ |
| No new npm dependencies | ✓ |
| Response format defined | ✓ |
| Risk levels documented | ✓ |
| Factors explained | ✓ |

---

## ARCHITECTURE

```
Frontend (Risk Page)
    ↓
POST /api/predict-risk
    ↓
Backend (engineMLFeatures)
    ├→ Extract from database
    ├→ Engineer 29 features
    ├→ Check model exists
    ↓
ML Bridge (spawn Python)
    ↓
Python Wrapper
    ├→ Load model + scaler
    ├→ Scale features
    ├→ Predict
    ↓
Response JSON
    ↑
Backend (fallback if needed)
    ├→ Rule-based calculation
    ↓
Frontend: Display risk + factors
```

---

## STATUS

✅ **Phase 7 Complete**

Risk engine integration done. ML model integrated into backend API.
Ready for Phase 8: Explainability layer & frontend integration.

---

**Prepared by:** Kiro  
**Date:** August 18, 2026  
**Project:** Gluco One  
**Phase:** 7 of 10

