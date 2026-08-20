require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./config/database');
const migrate = require('./migrations/001_init_schema');
const migrate002 = require('./migrations/002_indian_foods');
const migrate003 = require('./migrations/003_cgm_devices');
const seedIndianFoods = require('./seeds/indian_foods');
const authRoutes = require('./routes/auth');
const { toMySQLDateTime } = require('./utils/dateUtils');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5500', 'file://', 'file'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Import data routes
const glucoseRoutes = require('./routes/glucose');
const mealRoutes = require('./routes/meals');
const insulinRoutes = require('./routes/insulin');
const foodsRoutes = require('./routes/foods');
const cgmRoutes = require('./routes/cgm');

app.use('/api/glucose', glucoseRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/insulin', insulinRoutes);
app.use('/api/foods', foodsRoutes);
app.use('/api/cgm', cgmRoutes);

// GET /api/user route (also protected)
const { verifyToken } = require('./middleware/auth');
const User = require('./models/User');

app.get('/api/user', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        diabetesType: user.diabetes_type
      }
    });
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// GET /api/dashboard - Dashboard data
app.get('/api/dashboard', verifyToken, async (req, res) => {
  try {
    const Glucose = require('./models/Glucose');
    const Meal = require('./models/Meal');
    const Insulin = require('./models/Insulin');

    // Get latest glucose reading
    const glucoseReadings = await Glucose.findByUserId(req.userId, 10);
    let currentGlucose = null;
    if (glucoseReadings.length > 0) {
      const latest = glucoseReadings[0];
      const now = new Date();
      const readingTime = new Date(latest.timestamp);
      const minutesAgo = Math.round((now - readingTime) / 60000);
      
      let status = 'Normal';
      if (latest.value < 70) status = 'Low';
      else if (latest.value > 180) status = 'High';

      let trend = '→';
      if (glucoseReadings.length > 1) {
        const prev = glucoseReadings[1];
        if (latest.value > prev.value) trend = '↑';
        else if (latest.value < prev.value) trend = '↓';
      }

      currentGlucose = {
        value: latest.value,
        status,
        trend,
        minutesAgo
      };
    }

    // Get recent meals
    const meals = await Meal.findByUserId(req.userId, 5);
    const totalMealCarbs = meals.reduce((sum, m) => sum + (m.estimated_carbs || 0), 0);

    // Get recent insulin
    const insulins = await Insulin.findByUserId(req.userId, 5);
    const totalInsulin = insulins.reduce((sum, i) => sum + (i.dose || 0), 0);

    // Calculate rule-based risk (basic)
    let riskLevel = 'LOW';
    let riskDescription = 'No immediate hypoglycemia risk detected.';
    
    if (currentGlucose) {
      if (currentGlucose.value < 100) {
        if (currentGlucose.trend === '↓') {
          riskLevel = 'ELEVATED';
          riskDescription = 'Falling glucose with low reading. Monitor closely.';
        } else {
          riskLevel = 'MODERATE';
          riskDescription = 'Low glucose reading detected.';
        }
      } else if (currentGlucose.value < 140 && currentGlucose.trend === '↓') {
        riskLevel = 'MODERATE';
        riskDescription = 'Glucose trending downward.';
      }
    }

    res.json({
      currentGlucose: currentGlucose || {
        value: 120,
        status: 'Normal',
        trend: '→',
        minutesAgo: 15
      },
      risk: {
        level: riskLevel,
        description: riskDescription
      },
      contextCards: [
        {
          icon: '🍽',
          label: 'Last Meal',
          value: meals.length > 0 ? `${meals[0].estimated_carbs}g` : '—',
          detail: meals.length > 0 ? meals[0].name : 'No meal logged',
          color: 'orange',
          available: meals.length > 0
        },
        {
          icon: '💉',
          label: 'Last Insulin',
          value: insulins.length > 0 ? `${insulins[0].dose}u` : '—',
          detail: insulins.length > 0 ? insulins[0].type : 'No insulin logged',
          color: 'purple',
          available: insulins.length > 0
        },
        {
          icon: '📊',
          label: 'Avg Glucose',
          value: glucoseReadings.length > 0 ? Math.round(glucoseReadings.reduce((sum, r) => sum + r.value, 0) / glucoseReadings.length) : '—',
          detail: `${glucoseReadings.length} readings`,
          color: 'blue',
          available: glucoseReadings.length > 0
        }
      ]
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/timeline - Combined timeline of all events
app.get('/api/timeline', verifyToken, async (req, res) => {
  try {
    const Glucose = require('./models/Glucose');
    const Meal = require('./models/Meal');
    const Insulin = require('./models/Insulin');

    const days = req.query.days ? parseInt(req.query.days) : 1;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch all data
    const [glucoseReadings, meals, insulins] = await Promise.all([
      Glucose.findByUserIdAndDateRange(req.userId, startDate.toISOString(), endDate.toISOString()),
      Meal.findByUserIdAndDateRange(req.userId, startDate.toISOString(), endDate.toISOString()),
      Insulin.findByUserIdAndDateRange(req.userId, startDate.toISOString(), endDate.toISOString())
    ]);

    // Combine and format events
    const events = [];

    glucoseReadings.forEach(g => {
      events.push({
        type: 'glucose',
        timestamp: g.timestamp,
        title: `Glucose Reading`,
        detail: `${g.value} ${g.unit}${g.notes ? ' • ' + g.notes : ''}`
      });
    });

    meals.forEach(m => {
      events.push({
        type: 'meal',
        timestamp: m.timestamp,
        title: `Meal: ${m.name}`,
        detail: `${m.estimated_carbs}g carbs${m.notes ? ' • ' + m.notes : ''}`
      });
    });

    insulins.forEach(i => {
      events.push({
        type: 'insulin',
        timestamp: i.timestamp,
        title: `Insulin: ${i.type}`,
        detail: `${i.dose} units${i.notes ? ' • ' + i.notes : ''}`
      });
    });

    // Sort by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ events });
  } catch (err) {
    console.error('Timeline error:', err.message);
    res.status(500).json({ error: 'Failed to load timeline' });
  }
});

// Helper: Engineer features from user data for ML model
function engineMLFeatures(glucoseReadings, meals, insulins, now) {
  const features = {};

  // Initialize all features with default values
  const featureNames = [
    'time_since_last_insulin', 'recent_insulin_total_180min', 'active_insulin_iob',
    'recent_bolus_count', 'insulin_recent', 'time_since_last_meal',
    'recent_carbs_total_300min', 'active_carbs_cob', 'recent_meal_count',
    'meal_recent', 'hour_of_day', 'minute_of_hour', 'is_night', 'is_meal_time',
    'is_breakfast_time', 'is_lunch_time', 'is_dinner_time', 'glucose_current',
    'glucose_trend_15min', 'glucose_trend_30min', 'glucose_acceleration',
    'glucose_avg_120min', 'glucose_min_120min', 'glucose_max_120min',
    'glucose_std_120min', 'glucose_below_70', 'glucose_below_90', 'glucose_in_range',
    'glucose_above_180'
  ];

  featureNames.forEach(name => features[name] = 0);

  // Temporal features
  features.hour_of_day = now.getHours();
  features.minute_of_hour = now.getMinutes();
  features.is_night = (now.getHours() >= 22 || now.getHours() < 6) ? 1 : 0;
  const hour = now.getHours();
  features.is_breakfast_time = (hour >= 6 && hour < 9) ? 1 : 0;
  features.is_lunch_time = (hour >= 12 && hour < 14) ? 1 : 0;
  features.is_dinner_time = (hour >= 18 && hour < 20) ? 1 : 0;
  features.is_meal_time = (features.is_breakfast_time || features.is_lunch_time || features.is_dinner_time) ? 1 : 0;

  // Glucose features
  if (glucoseReadings.length > 0) {
    const sorted = glucoseReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const current = sorted[0].value;
    const prev = sorted.length > 1 ? sorted[1].value : current;

    features.glucose_current = current;
    features.glucose_below_70 = current < 70 ? 1 : 0;
    features.glucose_below_90 = current < 90 ? 1 : 0;
    features.glucose_in_range = (current >= 70 && current <= 180) ? 1 : 0;
    features.glucose_above_180 = current > 180 ? 1 : 0;

    // Glucose trends
    const trend15 = (current - prev) / 15;
    features.glucose_trend_15min = trend15;
    features.glucose_trend_30min = trend15;
    features.glucose_acceleration = 0;

    // Statistics
    const values = sorted.map(r => r.value);
    features.glucose_avg_120min = values.reduce((a, b) => a + b, 0) / values.length;
    features.glucose_min_120min = Math.min(...values);
    features.glucose_max_120min = Math.max(...values);
    const mean = features.glucose_avg_120min;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    features.glucose_std_120min = Math.sqrt(variance);
  }

  // Insulin features
  if (insulins.length > 0) {
    const lastInsulin = new Date(insulins[insulins.length - 1].timestamp);
    const minSinceInsulin = (now - lastInsulin) / 60000;
    features.time_since_last_insulin = Math.min(minSinceInsulin, 1000);
    features.insulin_recent = minSinceInsulin < 120 ? 1 : 0;
    features.recent_insulin_total_180min = insulins.reduce((sum, i) => sum + (i.dose || 0), 0);
    features.recent_bolus_count = insulins.filter(i => i.type === 'bolus').length;
    
    let iob = 0;
    insulins.forEach(i => {
      const minSince = (now - new Date(i.timestamp)) / 60000;
      if (minSince < 240) {
        iob += (i.dose || 0) * (1 - minSince / 240);
      }
    });
    features.active_insulin_iob = iob;
  }

  // Meal features
  if (meals.length > 0) {
    const lastMeal = new Date(meals[meals.length - 1].timestamp);
    const minSinceMeal = (now - lastMeal) / 60000;
    features.time_since_last_meal = Math.min(minSinceMeal, 1000);
    features.meal_recent = minSinceMeal < 180 ? 1 : 0;
    features.recent_carbs_total_300min = meals.reduce((sum, m) => sum + (m.estimated_carbs || 0), 0);
    features.recent_meal_count = meals.length;

    let cob = 0;
    meals.forEach(m => {
      const minSince = (now - new Date(m.timestamp)) / 60000;
      if (minSince >= 0 && minSince <= 180) {
        if (minSince <= 60) {
          cob += (m.estimated_carbs || 0) * (minSince / 60);
        } else {
          cob += (m.estimated_carbs || 0) * (1 - (minSince - 60) / 120);
        }
      }
    });
    features.active_carbs_cob = cob;
  }

  return features;
}

// Helper: Rule-based prediction (fallback if ML not available)
function getRuleBasedPrediction(glucoseReadings, meals, insulins, now) {
  let riskLevel = 'LOW';
  let probability = 0.2;
  const factors = [];

  if (glucoseReadings.length > 0) {
    const sorted = glucoseReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const currentGlucose = sorted[0].value;
    const previousGlucose = sorted.length > 1 ? sorted[1].value : currentGlucose;

    if (currentGlucose < 70) {
      probability += 0.5;
      factors.push({ name: 'Low glucose (<70)', importance: 0.8 });
    } else if (currentGlucose < 100) {
      probability += 0.2;
      factors.push({ name: 'Below-target glucose', importance: 0.4 });
    }

    const trend = currentGlucose - previousGlucose;
    if (trend < -10) {
      probability += 0.3;
      factors.push({ name: 'Rapidly falling', importance: 0.6 });
    } else if (trend < 0) {
      probability += 0.1;
      factors.push({ name: 'Falling glucose', importance: 0.3 });
    }

    if (insulins.length > 0) {
      const lastInsulinTime = new Date(insulins[insulins.length - 1].timestamp);
      const minutesSinceInsulin = (now - lastInsulinTime) / 60000;
      if (minutesSinceInsulin < 120) {
        probability += 0.15;
        factors.push({ name: 'Recent insulin', importance: 0.3 });
      }
    }

    if (meals.length === 0 || (now - new Date(meals[meals.length - 1].timestamp)) / 60000 > 180) {
      if (currentGlucose < 120) {
        probability += 0.1;
        factors.push({ name: 'No recent carbs', importance: 0.2 });
      }
    }
  }

  probability = Math.min(Math.max(probability, 0), 1);

  if (probability >= 0.7) {
    riskLevel = 'ELEVATED';
  } else if (probability >= 0.4) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }

  return {
    prediction: probability >= 0.5 ? 1 : 0,
    probability: parseFloat(probability.toFixed(3)),
    risk_level: riskLevel,
    factors: factors.length > 0 ? factors : [{ name: 'Stable glucose', importance: 0.2 }],
    confidence: parseFloat((Math.abs(probability - 0.5) * 2).toFixed(2)),
    model: 'rule-based'
  };
}

// POST /api/predict-risk - ML-based risk prediction
app.post('/api/predict-risk', verifyToken, async (req, res) => {
  try {
    const Glucose = require('./models/Glucose');
    const Meal = require('./models/Meal');
    const Insulin = require('./models/Insulin');
    const mlBridge = require('./ml-bridge');

    // Get recent data (last 3 hours for features)
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const [glucoseReadings, meals, insulins] = await Promise.all([
      Glucose.findByUserIdAndDateRange(req.userId, threeHoursAgo.toISOString(), now.toISOString()),
      Meal.findByUserIdAndDateRange(req.userId, threeHoursAgo.toISOString(), now.toISOString()),
      Insulin.findByUserIdAndDateRange(req.userId, threeHoursAgo.toISOString(), now.toISOString())
    ]);

    if (glucoseReadings.length === 0) {
      return res.json({
        prediction: 0,
        probability: 0.0,
        risk_level: 'UNKNOWN',
        message: 'Insufficient glucose data for prediction'
      });
    }

    // Engineer features from user data
    const features = engineMLFeatures(glucoseReadings, meals, insulins, now);

    // Make ML prediction
    let predictionResult;
    if (mlBridge.modelExists()) {
      try {
        predictionResult = await mlBridge.predict(features);
      } catch (err) {
        console.warn('ML prediction failed, using rule-based fallback:', err.message);
        predictionResult = getRuleBasedPrediction(glucoseReadings, meals, insulins, now);
      }
    } else {
      // Fallback to rule-based if model not available
      predictionResult = getRuleBasedPrediction(glucoseReadings, meals, insulins, now);
    }

    res.json(predictionResult);
  } catch (err) {
    console.error('Predict risk error:', err.message);
    res.status(500).json({ error: 'Failed to predict risk' });
  }
});

// GET /api/risk - Risk calculation
app.get('/api/risk', verifyToken, async (req, res) => {
  try {
    const Glucose = require('./models/Glucose');
    const Meal = require('./models/Meal');
    const Insulin = require('./models/Insulin');

    // Get recent data (last 2 hours)
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const [glucoseReadings, meals, insulins] = await Promise.all([
      Glucose.findByUserIdAndDateRange(req.userId, twoHoursAgo.toISOString(), now.toISOString()),
      Meal.findByUserIdAndDateRange(req.userId, twoHoursAgo.toISOString(), now.toISOString()),
      Insulin.findByUserIdAndDateRange(req.userId, twoHoursAgo.toISOString(), now.toISOString())
    ]);

    // Rule-based risk calculation
    let riskLevel = 'LOW';
    let riskTitle = 'No Immediate Risk';
    let riskDescription = 'Your glucose levels are stable. Continue monitoring.';
    let riskScore = 0;
    const factors = [];

    if (glucoseReadings.length > 0) {
      const currentGlucose = glucoseReadings[0].value;
      const previousGlucose = glucoseReadings.length > 1 ? glucoseReadings[1].value : currentGlucose;

      // Factor 1: Current glucose level
      if (currentGlucose < 70) {
        factors.push({ name: 'Low glucose', contribution: 'high', weight: 30 });
        riskScore += 30;
      } else if (currentGlucose < 100) {
        factors.push({ name: 'Below-target glucose', contribution: 'medium', weight: 15 });
        riskScore += 15;
      }

      // Factor 2: Glucose trend
      const trend = currentGlucose - previousGlucose;
      if (trend < -5) {
        factors.push({ name: 'Rapidly falling', contribution: 'high', weight: 25 });
        riskScore += 25;
      } else if (trend < 0) {
        factors.push({ name: 'Falling glucose', contribution: 'medium', weight: 10 });
        riskScore += 10;
      }

      // Factor 3: Recent insulin
      if (insulins.length > 0) {
        const lastInsulinTime = new Date(insulins[0].timestamp);
        const minutesSinceInsulin = (now - lastInsulinTime) / 60000;
        if (minutesSinceInsulin < 120) {
          factors.push({ name: 'Recent insulin', contribution: 'medium', weight: 12 });
          riskScore += 12;
        }
      }

      // Factor 4: Meal timing (no recent carbs)
      if (meals.length === 0 || (now - new Date(meals[0].timestamp)) / 60000 > 120) {
        if (currentGlucose < 100) {
          factors.push({ name: 'No recent carbs', contribution: 'medium', weight: 8 });
          riskScore += 8;
        }
      }
    }

    // Determine risk level
    if (riskScore >= 50) {
      riskLevel = 'ELEVATED';
      riskTitle = 'Elevated Risk';
      riskDescription = 'Multiple factors suggest elevated hypoglycemia risk in the next 30-60 minutes.';
    } else if (riskScore >= 25) {
      riskLevel = 'MODERATE';
      riskTitle = 'Moderate Risk';
      riskDescription = 'Some risk factors present. Consider having a snack or monitoring closely.';
    } else {
      riskLevel = 'LOW';
      riskTitle = 'Low Risk';
      riskDescription = 'No immediate hypoglycemia risk detected. Continue your normal routine.';
    }

    res.json({
      level: riskLevel,
      title: riskTitle,
      description: riskDescription,
      score: riskScore,
      factors: factors.length > 0 ? factors : [
        { name: 'Stable glucose', contribution: 'low', weight: 0 }
      ]
    });
  } catch (err) {
    console.error('Risk error:', err.message);
    res.status(500).json({ error: 'Failed to calculate risk' });
  }
});

// Test database connection
app.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const result = await connection.query('SELECT NOW() as time');
    connection.release();
    res.json({ status: 'ok', timestamp: result[0][0].time });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Initialize database on startup
async function startServer() {
  try {
    // Test connection first
    const connection = await pool.getConnection();
    const result = await connection.query('SELECT NOW() as time');
    connection.release();
    console.log('✓ Database connection verified');

    // Run migrations
    await migrate();
    await migrate002();
    await migrate003();
    
    // Seed indian foods if table is empty
    const foodConnection = await pool.getConnection();
    const foodCount = await foodConnection.query('SELECT COUNT(*) as count FROM indian_foods');
    foodConnection.release();
    
    if (foodCount[0][0].count === 0) {
      await seedIndianFoods();
    } else {
      console.log(`✓ Indian foods already seeded (${foodCount[0][0].count} foods)`);
    }

    console.log('✓ Database schema initialized');

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Health check: GET http://localhost:${PORT}/health`);
      console.log(`✓ Phase 4: Indian Food Database Ready`);
    });
  } catch (err) {
    console.error('');
    console.error('✗ Failed to start server');
    console.error('Error:', err.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Is MySQL running?');
    console.error('2. Check your .env file:');
    console.error('   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
    console.error('3. Does the database exist?');
    console.error('   mysql -u root -e "CREATE DATABASE glucoguard_dev;"');
    console.error('');
    process.exit(1);
  }
}

startServer();

module.exports = app;
