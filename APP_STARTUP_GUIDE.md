# Gluco One App - Startup & Access Guide

## ✅ Status: App Running

**Backend:** http://localhost:5000  
**Frontend:** http://localhost:5500  

---

## Quick Access

### Open the App
**Frontend:** http://localhost:5500

### Test Backend Health
**API Health Check:** http://localhost:5000/health

---

## What's Running

### Backend (Node.js + Express)
- ✓ Server on port 5000
- ✓ MySQL database connected
- ✓ All tables created (users, glucose_readings, meals, insulin_logs, indian_foods, cgm_devices, cgm_sync_history)
- ✓ 44 Indian foods seeded
- ✓ ML models available (phase 6)
- ✓ Risk engine ready (phase 7)
- ✓ CGM endpoints ready (phase 9)

### Frontend (Vanilla HTML/CSS/JS)
- ✓ Server on port 5500
- ✓ Login page
- ✓ Dashboard with ML risk prediction
- ✓ Glucose monitoring
- ✓ Meal intelligence (with Indian foods)
- ✓ Insulin logging
- ✓ AI Risk Engine (ML-based)
- ✓ Timeline view
- ✓ CGM device management
- ✓ Safety & Privacy info

---

## Test User Flow

### 1. Create Account
1. Open http://localhost:5500
2. Go to Login page
3. Register: `user@example.com` / `password123`

### 2. Add Data
1. **Glucose:** Click "Glucose" → Enter 120 mg/dL → Save
2. **Meal:** Click "Meal Intelligence" → Search "Samosa" → Select → Save
3. **Insulin:** Click "Insulin Log" → Enter 5 units → Save

### 3. View ML Predictions
1. Click "AI Risk Engine"
2. Should show:
   - Risk level (LOW/MODERATE/ELEVATED)
   - ML model badge
   - Contributing factors
   - Confidence score

### 4. View Timeline
1. Click "Timeline"
2. Should show all glucose, meal, insulin events chronologically

### 5. Connect CGM Device (Design Only)
1. Click "CGM Devices"
2. Try connecting (uses mock API)
3. See device appear in list

---

## API Endpoints Available

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token
- `GET /api/user` — Get user profile

### Data Management
- `GET/POST /api/glucose` — Glucose readings
- `GET/POST /api/meals` — Meal logs
- `GET/POST /api/insulin` — Insulin logs
- `GET /api/foods` — Search Indian foods

### AI Risk Engine
- `POST /api/predict-risk` — ML-based prediction
- `GET /api/risk` — Rule-based prediction
- `GET /api/dashboard` — Combined dashboard
- `GET /api/timeline` — Combined timeline

### CGM Integration
- `POST /api/cgm/connect` — Connect device
- `GET /api/cgm/devices` — List devices
- `POST /api/cgm/sync/:id` — Trigger sync
- `POST /api/cgm/disconnect/:id` — Disconnect device
- `GET /api/cgm/status` — Integration status

---

## Phases Completed (9/10)

✅ Phase 2: Backend Setup  
✅ Phase 3: Authentication & CRUD  
✅ Phase 4: Indian Food Database  
✅ Phase 5: ML Data Pipeline  
✅ Phase 6: ML Model Training  
✅ Phase 7: Risk Engine Integration  
✅ Phase 8: Explainability & Frontend  
✅ Phase 9: CGM Integration Design  
⏳ Phase 10: Final Testing & Real API Integration  

---

## Key Features

### 1. ML-Powered Risk Prediction
- Trained on synthetic T1D data
- 29 engineered features
- Logistic Regression model
- Shows prediction probability & factors
- Fallback to rule-based if ML unavailable

### 2. Indian Food Database
- 44+ Indian meals
- North, South, East, West India regions
- Carb counts per serving
- Search & region filtering
- Auto-carb calculation

### 3. User Data Isolation
- Each user's data is separate
- No cross-user access
- Secure JWT authentication
- 24-hour token expiration

### 4. Explainability
- Shows which factors contributed to risk
- Feature importance scores
- Visual progress bars
- Confidence percentages

### 5. CGM Ready
- Device connection UI
- Manual sync buttons
- Device management
- Ready for Dexcom/Freestyle Libre APIs (Phase 10)

---

## If You Get Errors

### Backend Won't Start
```bash
cd backend
npm install  # Reinstall dependencies
npm start    # Start server
```

### MySQL Connection Error
- Verify MySQL is running
- Check .env file has correct credentials
- Run: `mysql -u root -e "CREATE DATABASE glucoguard_dev;"`

### ML Prediction Fails
- Python 3 installed? (required for ML model)
- Run: `pip install scikit-learn numpy pandas`
- Should fallback to rule-based automatically

### Frontend Not Loading
```bash
cd frontend
python -m http.server 5500  # Restart frontend
```

---

## Project Structure

```
Glucoguard_AI Prototype/
├── backend/
│   ├── config/          # Database config
│   ├── middleware/      # Auth middleware
│   ├── migrations/      # Database schema
│   ├── models/          # Data models
│   ├── routes/          # API endpoints
│   ├── seeds/           # Initial data
│   ├── utils/           # Utilities
│   ├── server.js        # Main server
│   └── package.json
├── frontend/
│   ├── app.js           # JavaScript logic
│   ├── index.html       # Pages
│   ├── login.html       # Login page
│   └── style.css        # Styling
├── ml/
│   ├── models/          # Trained ML models
│   ├── data/            # Training data
│   ├── model_training.py
│   ├── model_inference.py
│   └── ...
├── PHASE_*.md           # Phase documentation
└── README.md
```

---

## Next: Phase 10

Phase 10 will include:
- End-to-end testing flow
- Multi-user data isolation verification
- Security review
- Real Dexcom/Freestyle Libre API integration
- Webhook implementation
- Final documentation

---

**Status:** ✅ 9 of 10 phases complete (90%)  
**Date:** August 18, 2026  
**Ready for:** Phase 10 Final Testing

