const API_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');

// Page titles
const titles = {
  dashboard: ["PATIENT OVERVIEW", "Good morning, Demo Patient", "Your glucose, meal, activity and insulin context in one place."],
  glucose: ["GLUCOSE MONITORING", "Glucose monitoring", "Log and track your glucose readings."],
  meal: ["MEAL INTELLIGENCE", "Meal Intelligence", "Log meals and track carbohydrate intake."],
  insulin: ["INSULIN LOG", "Insulin Log", "Insulin history is used as context, not as a dosing recommendation."],
  risk: ["AI RISK ENGINE", "AI Risk Engine", "Rule-based short-term hypoglycemia risk assessment."],
  timeline: ["HEALTH TIMELINE", "Health Timeline", "Glucose, meals, insulin, and AI insights in one view."],
  cgm: ["CGM DEVICES", "CGM Integration", "Connect Continuous Glucose Monitors for automatic data sync."],
  safety: ["SAFETY & PRIVACY", "Safety & Privacy", "Safety-first principles built into the application."]
};

// Page navigation
function go(page) {
  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  const target = document.getElementById(page);
  if (target) target.classList.add("active");
  document.querySelectorAll("[data-page]").forEach(x => x.classList.toggle("active", x.dataset.page === page));
  if (titles[page]) {
    document.getElementById("eyebrow").textContent = titles[page][0];
    document.getElementById("page-title").textContent = titles[page][1];
    document.getElementById("page-subtitle").textContent = titles[page][2];
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Navigation buttons setup moved to DOMContentLoaded below

// Toast notification
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.style.display = "none", 2200);
}

// Check authentication
function checkAuth() {
  if (!authToken) {
    window.location.href = 'login.html';
  }
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('authToken');
  window.location.href = 'login.html';
});

// API calls with auth
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${endpoint}`, options);
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
    return null;
  }
  return response.json();
}

// Load user profile
async function loadUserProfile() {
  const data = await apiCall('/user');
  if (data && data.user) {
    const initials = (data.user.firstName?.[0] || 'U') + (data.user.lastName?.[0] || '');
    document.getElementById('user-avatar').textContent = initials;
    document.getElementById('user-name').textContent = `${data.user.firstName} ${data.user.lastName}`;
    document.getElementById('user-diabetes').textContent = `${data.user.diabetesType || 'Type Unknown'} • Active`;
    document.getElementById('top-avatar').textContent = initials;
    document.getElementById('top-name').textContent = `${data.user.firstName} ${data.user.lastName}`;
  }
}

// Load dashboard data
async function loadDashboard() {
  const data = await apiCall('/dashboard');
  if (data) {
    // Update current glucose
    if (data.currentGlucose) {
      document.getElementById('current-glucose').innerHTML = `${data.currentGlucose.value} <small>mg/dL</small>`;
      document.getElementById('glucose-status').textContent = `● ${data.currentGlucose.status}`;
      document.getElementById('trend-line').innerHTML = `${data.currentGlucose.trend} <span>Last reading ${data.currentGlucose.minutesAgo} min ago</span>`;
    }

    // Try to get ML-based risk, fall back to rule-based
    let riskData = await apiCall('/predict-risk', 'POST');
    if (!riskData || riskData.error || riskData.message) {
      riskData = data.risk;
    }

    // Update risk
    if (riskData) {
      const riskLevel = riskData.risk_level || riskData.level || 'UNKNOWN';
      const colors = { 'LOW': '#62c957', 'MODERATE': '#f1b532', 'ELEVATED': '#e75c69', 'UNKNOWN': '#999' };
      const color = colors[riskLevel] || '#2f80ed';
      
      document.getElementById('risk-status').textContent = riskLevel;
      document.getElementById('risk-value').innerHTML = `<strong>${riskLevel}</strong><span>risk</span>`;
      document.getElementById('risk-value').style.color = color;
      document.getElementById('risk-description').textContent = riskData.description || data.risk.description;
    }

    // Update context cards
    let contextHTML = '';
    if (data.contextCards) {
      data.contextCards.forEach(card => {
        contextHTML += `
          <div class="context-card">
            <div class="context-icon ${card.color}">${card.icon}</div>
            <div>
              <span>${card.label}</span>
              <strong>${card.value}</strong>
              <small>${card.detail}</small>
            </div>
            <b class="check">${card.available ? '✓' : '✗'}</b>
          </div>
        `;
      });
    }
    if (contextHTML) document.getElementById('context-grid').innerHTML = contextHTML;
  }
}

// Glucose section
document.getElementById('add-glucose-btn')?.addEventListener('click', async () => {
  const value = document.getElementById('glucose-value').value;
  const unit = document.getElementById('glucose-unit').value;
  const time = document.getElementById('glucose-time').value;
  const notes = document.getElementById('glucose-notes').value;

  if (!value || !time) {
    showToast('Please fill in all required fields');
    return;
  }

  const result = await apiCall('/glucose', 'POST', {
    value: parseFloat(value),
    unit,
    timestamp: new Date(time).toISOString(),
    notes
  });

  if (result && result.id) {
    showToast('Glucose reading saved');
    document.getElementById('glucose-value').value = '';
    document.getElementById('glucose-notes').value = '';
    loadGlucoseData();
  } else {
    showToast('Error saving glucose reading');
  }
});

async function loadGlucoseData() {
  const data = await apiCall('/glucose?limit=30');
  if (data && data.readings) {
    // Update stats
    if (data.readings.length > 0) {
      document.getElementById('stat-current').textContent = data.readings[0].value;
      const avg = Math.round(data.readings.reduce((sum, r) => sum + r.value, 0) / data.readings.length);
      document.getElementById('stat-avg').textContent = avg;
      document.getElementById('stat-count').textContent = data.readings.length;

      // Calculate trend
      if (data.readings.length >= 2) {
        const trend = data.readings[0].value > data.readings[1].value ? '↑ Rising' : data.readings[0].value < data.readings[1].value ? '↓ Falling' : '→ Stable';
        document.getElementById('stat-trend').textContent = trend;
      }
    }
  }
}

// Meal section
document.getElementById('add-meal-btn')?.addEventListener('click', async () => {
  const name = document.getElementById('meal-name').value;
  const carbs = document.getElementById('meal-carbs').value;
  const time = document.getElementById('meal-time').value;
  const notes = document.getElementById('meal-notes').value;

  if (!name || !carbs || !time) {
    showToast('Please select a food and fill required fields');
    return;
  }

  const result = await apiCall('/meals', 'POST', {
    name,
    estimatedCarbs: parseFloat(carbs),
    timestamp: new Date(time).toISOString(),
    notes
  });

  if (result && result.id) {
    showToast('Meal record saved');
    document.getElementById('meal-name').value = '';
    document.getElementById('meal-carbs').value = '';
    document.getElementById('meal-servings').value = '1';
    document.getElementById('meal-notes').value = '';
    document.getElementById('food-results').style.display = 'none';
    document.getElementById('food-search').value = '';
    loadMealHistory();
  } else {
    showToast('Error saving meal');
  }
});

// Food search and selection
let currentSelectedFood = null;

async function searchFoods() {
  const query = document.getElementById('food-search').value.trim();
  if (query.length < 2) {
    document.getElementById('food-results').style.display = 'none';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/foods?search=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    let html = '';
    if (!data.foods || data.foods.length === 0) {
      html = '<div style="text-align: center; color: #738196; padding: 15px; font-size: 9px;">No foods found</div>';
    } else {
      data.foods.forEach(food => {
        const foodId = food.id;
        const foodName = (food.name || '').replace(/'/g, "\\'");
        const foodCarbs = parseFloat(food.carbsPerServing) || 0;
        const foodRegion = food.region || 'Unknown';
        
        html += `<div style="padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; background: #fff; transition: background 0.2s;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='#fff'" onclick="selectFood(${foodId}, '${foodName}', ${foodCarbs}, '${foodRegion}')">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px;">
            <div style="flex: 1;">
              <b style="font-size: 12px; color: #222;">${food.name}</b><br>
              <small style="color: #738196;">${food.category || ''} • ${food.servingSize || ''}</small>
            </div>
            <div style="text-align: right; color: #2f80ed; font-weight: bold; margin-left: 10px;">
              <div>${foodCarbs}g</div>
              <small style="color: #738196; font-weight: normal; font-size: 9px;">${foodRegion}</small>
            </div>
          </div>
        </div>`;
      });
    }
    document.getElementById('food-results').innerHTML = html;
    document.getElementById('food-results').style.display = 'block';
  } catch (err) {
    console.error('Food search error:', err);
    showToast('Error searching foods');
  }
}

function filterByRegion() {
  const region = document.getElementById('food-region').value;
  if (!region) {
    document.getElementById('food-results').style.display = 'none';
    document.getElementById('food-search').value = '';
    return;
  }

  fetch(`${API_URL}/foods?region=${encodeURIComponent(region)}&limit=50`)
    .then(r => r.json())
    .then(data => {
      let html = '';
      if (!data.foods || data.foods.length === 0) {
        html = '<div style="text-align: center; color: #738196; padding: 15px; font-size: 9px;">No foods found for this region</div>';
      } else {
        data.foods.forEach(food => {
          const foodId = food.id;
          const foodName = (food.name || '').replace(/'/g, "\\'");
          const foodCarbs = parseFloat(food.carbsPerServing) || 0;
          const foodRegion = food.region || 'Unknown';
          
          html += `<div style="padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; background: #fff; transition: background 0.2s;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='#fff'" onclick="selectFood(${foodId}, '${foodName}', ${foodCarbs}, '${foodRegion}')">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px;">
              <div style="flex: 1;">
                <b style="font-size: 12px; color: #222;">${food.name}</b><br>
                <small style="color: #738196;">${food.category || ''} • ${food.servingSize || ''}</small>
              </div>
              <div style="text-align: right; color: #2f80ed; font-weight: bold; margin-left: 10px;">
                <div>${foodCarbs}g</div>
                <small style="color: #738196; font-weight: normal; font-size: 9px;">${foodRegion}</small>
              </div>
            </div>
          </div>`;
        });
      }
      document.getElementById('food-results').innerHTML = html;
      document.getElementById('food-results').style.display = 'block';
    })
    .catch(err => {
      console.error('Filter error:', err);
      showToast('Error filtering foods');
    });
}

function selectFood(id, name, carbs, region) {
  currentSelectedFood = { id, name, carbs, region };
  document.getElementById('meal-name').value = name;
  document.getElementById('meal-servings').value = '1';
  calculateCarbs();
  document.getElementById('food-results').style.display = 'none';
  showToast(`Selected: ${name}`);
}

function calculateCarbs() {
  if (!currentSelectedFood) {
    document.getElementById('meal-carbs').value = '';
    return;
  }
  const servings = parseFloat(document.getElementById('meal-servings').value) || 1;
  const totalCarbs = (currentSelectedFood.carbs * servings).toFixed(1);
  document.getElementById('meal-carbs').value = totalCarbs;
}

async function loadMealHistory() {
  const data = await apiCall('/meals?limit=20');
  if (data && data.meals) {
    let html = '';
    if (data.meals.length === 0) {
      html = '<div style="text-align: center; color: #738196; padding: 20px; font-size: 9px;">No meals logged yet</div>';
    } else {
      data.meals.forEach(meal => {
        const time = new Date(meal.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        html += `
          <div class="history-row">
            <span>🍽 <b>${meal.name}</b><small>${time} • ${meal.estimatedCarbs}g carbs</small></span>
            <button onclick="deleteMeal(${meal.id})" style="background:none; border:none; color:#e75c69; cursor:pointer; font-size:12px;">✕</button>
          </div>
        `;
      });
    }
    document.getElementById('meal-history').innerHTML = html;
  }
}

async function deleteMeal(id) {
  if (confirm('Delete this meal?')) {
    await apiCall(`/meals/${id}`, 'DELETE');
    showToast('Meal deleted');
    loadMealHistory();
  }
}

// Insulin section
document.getElementById('add-insulin-btn')?.addEventListener('click', async () => {
  const type = document.getElementById('insulin-type').value;
  const dose = document.getElementById('insulin-dose').value;
  const time = document.getElementById('insulin-time').value;
  const notes = document.getElementById('insulin-notes').value;

  if (!dose || !time) {
    showToast('Please fill in all required fields');
    return;
  }

  const result = await apiCall('/insulin', 'POST', {
    type,
    dose: parseFloat(dose),
    timestamp: new Date(time).toISOString(),
    notes
  });

  if (result && result.id) {
    showToast('Insulin record saved');
    document.getElementById('insulin-dose').value = '';
    document.getElementById('insulin-notes').value = '';
    loadInsulinHistory();
  } else {
    showToast('Error saving insulin record');
  }
});

async function loadInsulinHistory() {
  const data = await apiCall('/insulin?limit=20');
  if (data && data.history) {
    let html = '';
    if (data.history.length === 0) {
      html = '<div style="text-align: center; color: #738196; padding: 20px; font-size: 9px;">No insulin logged yet</div>';
    } else {
      data.history.forEach(record => {
        const time = new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        html += `
          <div class="history-row">
            <span>💉 <b>${record.type}</b><small>${time}</small></span>
            <strong>${record.dose} units</strong>
          </div>
        `;
      });
    }
    document.getElementById('insulin-history').innerHTML = html;
  }
}

// Risk engine
document.getElementById('rerun-risk-btn')?.addEventListener('click', async () => {
  loadRiskEngine();
});

async function loadRiskEngine() {
  // Try ML prediction first, fall back to rule-based
  let data = await apiCall('/predict-risk', 'POST');
  
  if (!data || data.error || data.message === 'Insufficient glucose data for prediction') {
    // Fallback to rule-based
    data = await apiCall('/risk');
  }
  
  if (data) {
    const colors = { 'LOW': '#62c957', 'MODERATE': '#f1b532', 'ELEVATED': '#e75c69', 'UNKNOWN': '#999' };
    const color = colors[data.risk_level || data.level] || '#2f80ed';
    
    const riskLevel = data.risk_level || data.level || 'UNKNOWN';
    const title = data.title || `Risk: ${riskLevel}`;
    const description = data.description || (data.probability ? `ML Model Probability: ${(data.probability * 100).toFixed(1)}%` : 'Loading risk assessment based on your data...');
    
    document.getElementById('risk-ring-detail').innerHTML = `<div><strong>${riskLevel}</strong><small>short-term</small></div>`;
    const ring = document.getElementById('risk-ring-detail').querySelector('.large-ring');
    if (ring) ring.style.borderColor = color;
    document.getElementById('risk-title').textContent = title;
    document.getElementById('risk-details').textContent = description;

    // Build factors display
    let factorsHTML = '';
    if (data.factors && Array.isArray(data.factors)) {
      data.factors.forEach(factor => {
        // Handle both old format (contribution) and new format (importance)
        const importance = factor.importance || factor.weight || 0;
        const contribution = factor.contribution || (importance > 0.6 ? 'high' : importance > 0.3 ? 'medium' : 'low');
        const width = importance * 100;
        const progressClass = { 'high': '', 'medium': 'yellow', 'low': 'cyan' }[contribution] || '';
        
        factorsHTML += `
          <div class="factor">
            <div>
              <span>${factor.name}</span>
              <b>${contribution.charAt(0).toUpperCase() + contribution.slice(1)}</b>
            </div>
            <div class="progress ${progressClass}"><i style="width:${Math.min(width, 100)}%"></i></div>
          </div>
        `;
      });
    }
    
    // Add model info
    if (data.model) {
      const modelBadge = data.model === 'logistic_regression' ? 'ML Model' : data.model === 'rule-based' ? 'Rule-Based' : 'AI Engine';
      const confidence = data.confidence ? ` • ${(data.confidence * 100).toFixed(0)}% confidence` : '';
      factorsHTML = `<div style="padding: 10px; background: #f0f7ff; border-radius: 8px; margin-bottom: 15px; font-size: 9px; color: #2f80ed;">
        <b>${modelBadge}</b>${confidence}
      </div>` + factorsHTML;
    }
    
    document.getElementById('risk-factors').innerHTML = factorsHTML || '<div style="text-align:center; color:#738196; font-size:9px; padding:20px;">No risk factors calculated</div>';
  }
}

// Timeline
async function loadTimeline() {
  const data = await apiCall('/timeline?days=1');
  if (data && data.events) {
    let html = '';
    if (data.events.length === 0) {
      html = '<div style="text-align: center; color: #738196; padding: 30px; font-size: 9px;">No events recorded today</div>';
    } else {
      data.events.forEach(event => {
        const time = new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        let icon = '●', color = 'blue';
        if (event.type === 'glucose') { icon = '●'; color = 'blue'; }
        else if (event.type === 'meal') { icon = '🍽'; color = 'orange'; }
        else if (event.type === 'insulin') { icon = '💉'; color = 'purple'; }
        else if (event.type === 'risk') { icon = '✦'; color = 'blue'; }

        html += `
          <div class="event">
            <div class="event-icon ${color}">${icon}</div>
            <div>
              <b>${event.title}</b>
              <small>${event.detail}</small>
            </div>
            <time>${time}</time>
          </div>
        `;
      });
    }
    document.getElementById('timeline-events').innerHTML = html;
  }
}

// CGM Devices
document.getElementById('add-cgm-btn')?.addEventListener('click', async () => {
  const deviceType = document.getElementById('cgm-device-type').value;
  const deviceId = document.getElementById('cgm-device-id').value;
  const authToken = document.getElementById('cgm-auth-token').value;

  if (!deviceType || !deviceId || !authToken) {
    showToast('Please fill in all fields');
    return;
  }

  const result = await apiCall('/cgm/connect', 'POST', {
    deviceType,
    deviceId,
    authToken
  });

  if (result && result.success) {
    showToast(`${result.device.deviceType} connected successfully`);
    document.getElementById('cgm-device-type').value = '';
    document.getElementById('cgm-device-id').value = '';
    document.getElementById('cgm-auth-token').value = '';
    loadCGMDevices();
  } else {
    showToast(result?.error || 'Error connecting device');
  }
});

async function loadCGMDevices() {
  const data = await apiCall('/cgm/devices');
  if (data && data.devices) {
    let html = '';
    if (data.devices.length === 0) {
      html = '<div style="text-align: center; color: #738196; padding: 20px; font-size: 9px;">No CGM devices connected</div>';
    } else {
      data.devices.forEach(device => {
        const lastSync = device.lastSync ? new Date(device.lastSync).toLocaleString() : 'Never';
        html += `
          <div style="padding: 12px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <b style="text-transform: capitalize;">${device.deviceType.replace('_', ' ')}</b>
              <small style="display: block; color: #738196; margin-top: 4px;">ID: ${device.deviceId}</small>
              <small style="display: block; color: #999; margin-top: 2px;">Last sync: ${lastSync}</small>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="syncCGMDevice(${device.id})" style="background: #2f80ed; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 9px; cursor: pointer;">Sync</button>
              <button onclick="disconnectCGMDevice(${device.id})" style="background: #e75c69; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 9px; cursor: pointer;">Disconnect</button>
            </div>
          </div>
        `;
      });
    }
    document.getElementById('cgm-devices-list').innerHTML = html;
  }
}

async function syncCGMDevice(deviceId) {
  const result = await apiCall(`/cgm/sync/${deviceId}`, 'POST');
  if (result && result.status) {
    showToast(`Synced ${result.syncedReadings} glucose reading(s) from ${result.deviceType}`);
    loadCGMDevices();
    // Refresh glucose data to show newly synced readings
    setTimeout(loadGlucoseData, 500);
  } else {
    showToast(result?.error || 'Error syncing device');
  }
}

async function disconnectCGMDevice(deviceId) {
  if (confirm('Disconnect this CGM device?')) {
    const result = await apiCall(`/cgm/disconnect/${deviceId}`, 'POST');
    if (result && result.success) {
      showToast('Device disconnected');
      loadCGMDevices();
    } else {
      showToast('Error disconnecting device');
    }
  }
}

/**
 * Auto-sync all CGM devices periodically (every 5 minutes)
 */
function startCGMAutoSync() {
  setInterval(async () => {
    const result = await apiCall('/cgm/auto-sync', 'POST');
    if (result && result.totalReadings > 0) {
      console.log(`[CGM] Auto-synced ${result.totalReadings} readings from ${result.totalDevices} device(s)`);
      loadGlucoseData();
      loadDashboard();
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserProfile();
  loadDashboard();
  loadGlucoseData();
  loadMealHistory();
  loadInsulinHistory();
  loadRiskEngine();
  loadTimeline();
  loadCGMDevices();
  startCGMAutoSync();

  // Setup navigation buttons AFTER DOM is ready
  document.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => go(b.dataset.page)));

  // Set current time in forms
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('glucose-time').value = now.toISOString().slice(0, 16);
  document.getElementById('meal-time').value = now.toISOString().slice(0, 16);
  document.getElementById('insulin-time').value = now.toISOString().slice(0, 16);
});
