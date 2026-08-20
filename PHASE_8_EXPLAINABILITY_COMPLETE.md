# PHASE 8: EXPLAINABILITY & FRONTEND INTEGRATION — COMPLETE ✓

Frontend integration of ML-based risk predictions with explainable factors.

---

## WHAT WAS BUILT

### 1. ML-Based Risk Display in UI
**Risk Engine Page** (`#risk` section):
- Real-time ML predictions instead of rule-based
- Shows risk level (LOW/MODERATE/ELEVATED)
- Displays model confidence
- Lists contributing factors with importance scores
- Model type badge (ML Model vs Rule-Based fallback)

**Dashboard Card** (`#dashboard` section):
- Shows current risk with ML prediction
- Color-coded risk levels
- Quick link to detailed ML factors
- Updates with fresh ML prediction on page load

### 2. Feature Importance Explanation
Each risk prediction includes:
- **Factor name:** What contributed to risk (e.g., "glucose_current", "active_insulin_iob")
- **Contribution level:** High/Medium/Low
- **Visual progress bar:** Shows relative importance
- **Value:** Actual feature value used in prediction

Example factors:
```
- Low glucose (<70): High contribution
- Rapidly falling: High contribution  
- Recent insulin: Medium contribution
- No recent carbs: Medium contribution
- Stable glucose: Low contribution
```

### 3. Frontend Fallback Logic
If ML prediction fails:
1. Automatically falls back to rule-based risk calculation
2. Shows "Rule-Based" label instead of "ML Model"
3. Returns same risk level + factors for consistency
4. User experience unaffected by backend failures

### 4. Response Format Handling
Frontend handles both response formats:
- **ML Format:** `prediction`, `probability`, `risk_level`, `factors`, `confidence`, `model`
- **Rule-Based Format:** `level`, `title`, `description`, `factors`, `score`

Unified display for both.

---

## FILES MODIFIED

**frontend/app.js:**
- Updated `loadDashboard()` to call ML prediction endpoint
- Updated `loadRiskEngine()` to display ML predictions
- Added fallback logic for rule-based when ML unavailable
- Added model badge display (ML Model vs Rule-Based)
- Added confidence score display

**frontend/index.html:**
- Changed Risk Engine page description to highlight ML
- Updated pill badge from "DEMO OUTPUT" to "ML MODEL"
- Updated model pipeline description to show actual pipeline
- Updated disclaimer to note synthetic data training

---

## HOW IT WORKS

### User Flow on Risk Engine Page

```
1. User clicks "AI Risk Engine" in sidebar
2. Frontend calls POST /api/predict-risk
3. Backend:
   - Extracts last 3 hours of glucose, meals, insulin
   - Engineers 29 ML features
   - Loads trained model
   - Makes prediction
   - Returns: prediction, probability, risk_level, factors
4. Frontend displays:
   - Risk level (colored ring)
   - Probability/confidence
   - Contributing factors with bars
   - Model type badge
5. User clicks "Run analysis again" to refresh
```

### User Flow on Dashboard

```
1. Page loads
2. Frontend calls GET /api/dashboard
3. Frontend also calls POST /api/predict-risk
4. Combines results:
   - Uses ML risk if available
   - Falls back to rule-based if needed
5. Shows quick risk card with color
   - "ML Model" badge (if using ML)
   - Link to detailed factors page
```

---

## RISK LEVELS & COLORS

| Level | Color | Range | Action |
|-------|-------|-------|--------|
| **LOW** | Green (#62c957) | Prob < 0.4 | No action needed |
| **MODERATE** | Yellow (#f1b532) | Prob 0.4-0.7 | Monitor, consider snack |
| **ELEVATED** | Red (#e75c69) | Prob ≥ 0.7 | Alert user, check glucose |
| **UNKNOWN** | Gray (#999) | No data | Insufficient data |

---

## FACTOR DISPLAY

### Factor Object Format
```json
{
  "name": "Rapidly falling",
  "importance": 0.72,
  "value": -2.5,
  "contribution": "high"
}
```

### Visual Representation
```
[█████████████░░░░░░░░░] 72% - High
[████████░░░░░░░░░░░░░░] 40% - Medium  
[█████░░░░░░░░░░░░░░░░░] 25% - Low
```

### Top Factors Shown
- Up to top 5 most important features
- Ranked by model coefficient importance
- Includes actual value used in prediction

---

## CONFIDENCE SCORE

**Displayed as percentage (0-100%):**
- Represents how certain the model is about its prediction
- Calculated as: `|probability - 0.5| * 2 * 100`
- 100% = Very confident (prob near 0 or 1)
- 0% = Uncertain (prob near 0.5)

Example:
- Probability 0.85 → Confidence 70%
- Probability 0.72 → Confidence 44%
- Probability 0.50 → Confidence 0%

---

## ERROR HANDLING

### ML Model Not Available
```json
{
  "model": "rule-based",
  "prediction": 0,
  "probability": 0.35,
  "risk_level": "MODERATE",
  "factors": [...]
}
```
Frontend shows: "Rule-Based" badge instead of "ML Model"

### Insufficient Data
```json
{
  "prediction": 0,
  "probability": 0.0,
  "risk_level": "UNKNOWN",
  "message": "Insufficient glucose data for prediction"
}
```
Frontend: Hides ML factors, shows "UNKNOWN" risk with message

### Python Process Timeout
Automatically falls back to rule-based calculation.

---

## FEATURE IMPORTANCE MAPPING

### Features Displayed (Top 5)
Backend selects top features by model coefficients:

1. **Glucose features** (weight: high)
   - Current glucose level
   - Glucose trend (falling)
   - Recent minimum glucose

2. **Insulin features** (weight: medium)
   - Active insulin on board
   - Time since last bolus
   - Recent bolus count

3. **Meal features** (weight: medium)
   - Carbs on board (digesting)
   - Time since last meal
   - Total recent carbs

4. **Temporal features** (weight: low)
   - Time of day
   - Is night (higher hypo risk)

5. **Status features** (weight: low)
   - Is glucose below thresholds
   - Is in range

---

## MODEL INTERPRETABILITY

### Why ML Over Rule-Based?

**Rule-Based Limitations:**
- Fixed thresholds (arbitrary values)
- No interaction between features
- Can't learn patterns from data
- No confidence/probability

**ML Advantages:**
- Learns actual patterns from data
- Handles feature interactions
- Provides probability estimates
- Shows feature importance
- Adapts to different situations

### Example: Glucose Falling
**Rule-Based:** "If glucose < 100 AND falling → MODERATE risk" (binary)

**ML:** "If glucose = 92, falling at -2.5 mg/min, time since meal = 90 min, recent insulin = 5u → Probability 0.68 = MODERATE risk" (probabilistic, considers all factors)

---

## TESTING THE INTEGRATION

### Test ML Prediction on Risk Page

1. **Register & Login:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Copy token
```

2. **Add sample data:**
```bash
# Add glucose reading
curl -X POST http://localhost:5000/api/glucose \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"value":85,"unit":"mg/dL"}'

# Add meal
curl -X POST http://localhost:5000/api/meals \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Samosa","estimatedCarbs":45,"timestamp":"2024-01-01T12:00:00Z"}'

# Add insulin
curl -X POST http://localhost:5000/api/insulin \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"bolus","dose":5,"timestamp":"2024-01-01T12:15:00Z"}'
```

3. **Navigate to Risk Engine page** in frontend
   - Should show ML prediction with factors
   - Click "Run analysis again" to refresh
   - Check browser console for any errors

4. **Check dashboard**
   - Risk card should show ML-based level
   - Link to detailed factors works

---

## LIMITATIONS & FUTURE IMPROVEMENTS

### Current Limitations
- Synthetic training data (not real patients)
- Single model (no personalization)
- 45-minute prediction horizon only
- No historical tracking of predictions
- No model versioning

### Future Phase 9+
- Train on real T1D data
- Per-patient model personalization
- Variable prediction horizons (15-120 min)
- Prediction accuracy tracking
- A/B testing different models
- CGM device integration
- Push notifications for high risk

---

## TRANSPARENCY

### What We Show Users
- ✅ Risk level (LOW/MODERATE/ELEVATED)
- ✅ Model confidence/probability
- ✅ Contributing factors ranked by importance
- ✅ Feature values used in prediction
- ✅ Model type (ML vs Rule-Based)
- ✅ Disclaimer about synthetic data

### What We Don't Claim
- ❌ Clinical validation
- ❌ FDA approval
- ❌ Perfect accuracy
- ❌ Medical diagnosis capability
- ❌ Replacement for professional care

---

## SUCCESS CRITERIA ✓

| Criterion | Status |
|-----------|--------|
| ML predictions displayed in UI | ✓ |
| Factors shown with importance | ✓ |
| Color-coded risk levels | ✓ |
| Confidence score displayed | ✓ |
| Fallback to rule-based working | ✓ |
| Dashboard shows ML risk | ✓ |
| Risk page updated text | ✓ |
| Model badge displayed | ✓ |
| Error handling in place | ✓ |
| All warnings & disclaimers present | ✓ |

---

## FILES STATUS

**Modified:**
- `frontend/app.js` — ML integration + fallback logic
- `frontend/index.html` — Updated descriptions & badges

**No new files needed** (backend ready from Phase 7)

**Existing but now used:**
- `backend/server.js` — POST /api/predict-risk endpoint
- `backend/ml-bridge.js` — ML communication
- `ml/model_inference_wrapper.py` — Model inference
- ML models in `ml/models/`

---

## ARCHITECTURE

```
Frontend (Risk Engine Page)
    ↓
User clicks "Run analysis again"
    ↓
POST /api/predict-risk (via backend/ml-bridge.js)
    ↓
Python Model Inference
    ├→ Load logistic_regression_model.pkl
    ├→ Scale features with scaler.pkl
    ├→ Predict probability
    └→ Return JSON result
    ↓
Backend (engineMLFeatures)
    └→ Fallback to rule-based if needed
    ↓
Frontend JavaScript
    ├→ Parse response
    ├→ Build factors display
    ├→ Color-code risk level
    ├→ Show model badge
    └→ Render UI
```

---

## NOTES FOR NEXT PHASE (PHASE 9)

### CGM Integration Design
- Keep current API structure
- Add `/api/glucose/sync` for CGM data
- Support for Dexcom, Freestyle Libre formats
- Auto-refresh glucose every 5 minutes
- Trigger risk predictions when new glucose arrives

### Real-World Testing Phase 10
- Collect real prediction accuracy
- Compare ML vs rule-based performance
- Identify failure cases
- Retrain model with real data
- A/B test with real users

---

## STATUS

✅ **Phase 8 Complete**

ML predictions fully integrated into frontend with explainability. Risk Engine page now shows ML-based predictions with contributing factors. Dashboard shows ML risk. Fallback to rule-based when needed.

Ready for Phase 9: CGM Integration Design.

---

**Prepared by:** Kiro  
**Date:** August 18, 2026  
**Project:** Gluco One  
**Phase:** 8 of 10

