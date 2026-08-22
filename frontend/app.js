const API_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');

// Page metadata
const pages = {
  dashboard: { label: 'OVERVIEW', title: 'Good morning', subtitle: '' },
  glucose: { label: 'GLUCOSE', title: 'Glucose monitoring', subtitle: 'Track and log your readings' },
  meal: { label: 'MEALS', title: 'Meal intelligence', subtitle: 'Log and track Indian meals' },
  insulin: { label: 'INSULIN', title: 'Insulin log', subtitle: 'Record your insulin doses' },
  risk: { label: 'RISK', title: 'Risk assessment', subtitle: 'Short-term hypoglycemia prediction' },
  timeline: { label: 'TIMELINE', title: 'Health timeline', subtitle: 'Your glucose, meals, insulin, and insights' },
  cgm: { label: 'DEVICES', title: 'CGM devices', subtitle: 'Connect your continuous glucose monitor' },
  safety: { label: 'SAFETY', title: 'Safety & privacy', subtitle: 'How we protect your health data' }
};

// Toast notification
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.style.display = 'none', 2200);
}

// Check authentication
function checkAuth() {
  if (!authToken) {
    window.location.href = 'login.html';
  }
}

// Navigation
function go(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  
  // Show target page
  const target = document.getElementById(page);
  if (target) target.classList.add('active');
  
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  
  // Update header
  if (pages[page]) {
    document.getElementById('eyebrow').textContent = pages[page].label;
    document.getElementById('page-title').textContent = pages[page].title;
    document.getElementById('page-subtitle').textContent = pages[page].subtitle;
  }
  
  // Reload data when navigating
  if (page === 'glucose') {
    loadGlucoseData();
  } else if (page === 'meal') {
    loadMealHistory();
  } else if (page === 'insulin') {
    loadInsulinHistory();
  } else if (page === 'risk') {
    loadRiskEngine();
  } else if (page === 'timeline') {
    loadTimeline();
  } else if (page === 'cgm') {
    loadCGMDevices();
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
    const firstName = data.user.firstName || 'User';
    const lastName = data.user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const initials = (data.user.firstName?.[0] || 'U') + (data.user.lastName?.[0] || '');
    
    document.getElementById('top-avatar').textContent = initials;
    document.getElementById('user-avatar-large').textContent = initials;
    document.getElementById('user-name').textContent = fullName;
    document.getElementById('user-name-menu').textContent = fullName;
    document.getElementById('user-diabetes').textContent = `${data.user.diabetesType || 'Type Unknown'} • Active`;
    document.getElementById('user-diabetes-menu').textContent = data.user.diabetesType || 'Type Unknown';
    
    // Update greeting with actual name
    document.getElementById('page-title').textContent = `Good morning, ${firstName}`;
    
    return data.user;
  }
  return null;
}

// Load dashboard data
async function loadDashboard() {
  const data = await apiCall('/dashboard');
  if (data) {
    // Update current glucose
    if (data.currentGlucose) {
      document.getElementById('current-glucose').innerHTML = `${data.currentGlucose.value} <small class="glucose-unit">mg/dL</small>`;
      document.getElementById('glucose-status').textContent = data.currentGlucose.status;
      
      // Cap minutesAgo at 24 hours
      const minutesAgo = Math.min(data.currentGlucose.minutesAgo || 0, 1440);
      let timeText = '';
      if (minutesAgo < 1) timeText = 'just now';
      else if (minutesAgo < 60) timeText = `${minutesAgo} min ago`;
      else {
        const hours = Math.floor(minutesAgo / 60);
        const mins = minutesAgo % 60;
        timeText = mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
      }
      
      document.getElementById('trend-line').textContent = `Last reading ${timeText}`;
      updateDashboardGlucoseChart();
    }

    // Try to get ML-based risk
    let riskData = await apiCall('/predict-risk', 'POST');
    if (!riskData || riskData.error || riskData.message) {
      riskData = data.risk;
    }

    // Update risk
    if (riskData) {
      const riskLevel = riskData.risk_level || riskData.level || 'UNKNOWN';
      const riskCircle = document.getElementById('risk-value');
      
      riskCircle.textContent = riskLevel;
      riskCircle.classList.remove('low', 'moderate', 'elevated');
      if (riskLevel === 'LOW') riskCircle.classList.add('low');
      else if (riskLevel === 'MODERATE') riskCircle.classList.add('moderate');
      else if (riskLevel === 'ELEVATED') riskCircle.classList.add('elevated');
      
      const badge = document.getElementById('risk-status');
      badge.textContent = riskLevel;
      badge.classList.remove('low', 'moderate', 'elevated');
      if (riskLevel === 'LOW') badge.classList.add('low');
      else if (riskLevel === 'MODERATE') badge.classList.add('moderate');
      else if (riskLevel === 'ELEVATED') badge.classList.add('elevated');
      
      document.getElementById('risk-description').textContent = riskData.description || 'Risk assessment loaded';
    }

    // Update context cards
    let contextHTML = '';
    if (data.contextCards) {
      data.contextCards.forEach(card => {
        contextHTML += `
          <div class="context-item">
            <span class="context-icon">${card.icon}</span>
            <span class="context-label">${card.label}</span>
            <strong class="context-value">${card.value}</strong>
          </div>
        `;
      });
    }
    if (contextHTML) document.getElementById('context-grid').innerHTML = contextHTML;
  }
}

function updateDashboardGlucoseChart() {
  (async () => {
    const data = await apiCall('/glucose?limit=10');
    if (!data || !data.readings) return;
    
    const readings = data.readings.slice().reverse();
    if (readings.length < 2) return;
    
    const svg = document.getElementById('glucose-chart');
    if (!svg) return;
    
    const values = readings.map(r => r.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = Math.max(maxVal - minVal, 40);
    
    const viewBox = svg.getAttribute('viewBox').split(' ');
    const width = parseFloat(viewBox[2]);
    const height = parseFloat(viewBox[3]);
    const padding = 20;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    const pointCount = readings.length;
    const xStep = chartWidth / (pointCount - 1);
    
    let points = '';
    let circles = '';
    
    readings.forEach((reading, index) => {
      const x = padding + (index * xStep);
      const normalizedValue = (reading.value - (minVal - range * 0.1)) / (range * 1.2);
      const y = height - padding - (Math.max(0, Math.min(1, normalizedValue)) * chartHeight);
      
      points += `${x},${y} `;
      const isLast = index === pointCount - 1;
      circles += `<circle cx="${x}" cy="${y}" r="${isLast ? 5 : 3.5}"/>`;
    });
    
    svg.querySelectorAll('polyline, g[fill="#00D9FF"]').forEach(el => el.remove());
    
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#00D9FF');
    polyline.setAttribute('stroke-width', '3.5');
    polyline.setAttribute('stroke-linejoin', 'round');
    polyline.setAttribute('points', points.trim());
    svg.appendChild(polyline);
    
    const circleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    circleGroup.setAttribute('fill', '#00D9FF');
    circleGroup.innerHTML = circles;
    svg.appendChild(circleGroup);
  })();
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
    showToast('✓ Glucose reading saved');
    document.getElementById('glucose-value').value = '';
    document.getElementById('glucose-notes').value = '';
    loadGlucoseData();
    loadDashboard();
  }
});

async function loadGlucoseData() {
  const data = await apiCall('/glucose?limit=30');
  if (data && data.readings) {
    if (data.readings.length > 0) {
      const currentValue = parseFloat(data.readings[0].value);
      document.getElementById('stat-current').textContent = isNaN(currentValue) ? '--' : currentValue;
      
      const sum = data.readings.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
      const avg = data.readings.length > 0 ? Math.round(sum / data.readings.length) : 0;
      document.getElementById('stat-avg').textContent = isNaN(avg) ? '--' : avg;
      
      document.getElementById('stat-count').textContent = data.readings.length;

      if (data.readings.length >= 2) {
        const latest = parseFloat(data.readings[0].value);
        const previous = parseFloat(data.readings[1].value);
        let trend = '→ Stable';
        if (latest > previous) trend = '↑ Rising';
        else if (latest < previous) trend = '↓ Falling';
        document.getElementById('stat-trend').textContent = trend;
      }

      updateGlucoseTrendChart(data.readings);
    }
  }
}

function updateGlucoseTrendChart(readings) {
  if (!readings || readings.length === 0) return;
  
  const sorted = [...readings].reverse();
  const chartData = sorted.slice(-15);
  
  if (chartData.length < 2) return;
  
  const values = chartData.map(r => r.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = Math.max(maxVal - minVal, 50);
  
  const width = 900;
  const height = 300;
  const padding = { top: 30, bottom: 40, left: 60, right: 30 };
  const chartWidth = width - (padding.left + padding.right);
  const chartHeight = height - (padding.top + padding.bottom);
  
  const pointCount = chartData.length;
  const xStep = chartWidth / (pointCount - 1);
  
  let points = '';
  let circles = '';
  let tooltips = '';
  
  chartData.forEach((reading, index) => {
    const x = padding.left + (index * xStep);
    const normalizedValue = (reading.value - (minVal - range * 0.1)) / (range * 1.2);
    const y = height - padding.bottom - (Math.max(0, Math.min(1, normalizedValue)) * chartHeight);
    
    points += `${x},${y} `;
    circles += `<circle cx="${x}" cy="${y}" r="${index === pointCount - 1 ? 6 : 5}" class="glucose-point"/>`;
    
    const time = new Date(reading.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    tooltips += `<g class="tooltip-group" data-index="${index}" style="display: none;">
      <rect x="${x - 35}" y="${y - 50}" width="70" height="45" rx="4" fill="#0d121a" stroke="#00D9FF" stroke-width="1"/>
      <text x="${x}" y="${y - 28}" text-anchor="middle" fill="#f0f2f5" font-size="13" font-weight="bold">${Math.round(reading.value)}</text>
      <text x="${x}" y="${y - 12}" text-anchor="middle" fill="#738196" font-size="10">${time}</text>
    </g>`;
  });
  
  const svg = document.getElementById('glucose-history-chart');
  if (!svg) return;
  
  svg.querySelectorAll('polyline, .circles, .y-labels, .x-labels, .target-zone, .tooltip-group').forEach(el => el.remove());
  
  const targetMin = 70;
  const targetMax = 180;
  const normalizedMin = (targetMin - (minVal - range * 0.1)) / (range * 1.2);
  const normalizedMax = (targetMax - (minVal - range * 0.1)) / (range * 1.2);
  const yMin = height - padding.bottom - (Math.max(0, Math.min(1, normalizedMin)) * chartHeight);
  const yMax = height - padding.bottom - (Math.max(0, Math.min(1, normalizedMax)) * chartHeight);
  
  const targetZone = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  targetZone.setAttribute('x', padding.left);
  targetZone.setAttribute('y', yMax);
  targetZone.setAttribute('width', chartWidth);
  targetZone.setAttribute('height', yMin - yMax);
  targetZone.setAttribute('fill', '#1a4d2e');
  targetZone.setAttribute('opacity', '0.2');
  targetZone.classList.add('target-zone');
  svg.appendChild(targetZone);
  
  const yLabelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  yLabelsGroup.classList.add('y-labels');
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(minVal - range * 0.1 + (i / 4) * range * 1.2);
    const y = height - padding.bottom - ((i / 4) * chartHeight);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', padding.left - 10);
    text.setAttribute('y', y + 4);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', '#738196');
    text.setAttribute('font-size', '11');
    text.textContent = val;
    yLabelsGroup.appendChild(text);
  }
  svg.appendChild(yLabelsGroup);
  
  const xLabelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  xLabelsGroup.classList.add('x-labels');
  for (let i = 0; i < pointCount; i += Math.ceil(pointCount / 5)) {
    if (i < pointCount) {
      const time = new Date(chartData[i].timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const x = padding.left + (i * xStep);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', height - 10);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#738196');
      text.setAttribute('font-size', '10');
      text.textContent = time;
      xLabelsGroup.appendChild(text);
    }
  }
  svg.appendChild(xLabelsGroup);
  
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', '#00D9FF');
  polyline.setAttribute('stroke-width', '5');
  polyline.setAttribute('stroke-linejoin', 'round');
  polyline.setAttribute('points', points.trim());
  svg.appendChild(polyline);
  
  const circleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  circleGroup.setAttribute('fill', '#00D9FF');
  circleGroup.classList.add('circles');
  circleGroup.innerHTML = circles;
  svg.appendChild(circleGroup);
  
  const tooltipGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  tooltipGroup.innerHTML = tooltips;
  svg.appendChild(tooltipGroup);
  
  svg.querySelectorAll('.glucose-point').forEach((circle, idx) => {
    circle.addEventListener('mouseenter', () => {
      svg.querySelectorAll('.tooltip-group').forEach(el => el.style.display = 'none');
      svg.querySelectorAll('.glucose-point').forEach(c => c.style.opacity = '0.4');
      const tooltips = svg.querySelectorAll('.tooltip-group');
      if (tooltips[idx]) tooltips[idx].style.display = 'block';
      circle.style.opacity = '1';
    });
    circle.addEventListener('mouseleave', () => {
      svg.querySelectorAll('.tooltip-group').forEach(el => el.style.display = 'none');
      svg.querySelectorAll('.glucose-point').forEach(c => c.style.opacity = '1');
    });
  });
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
    showToast('✓ Meal saved');
    document.getElementById('meal-name').value = '';
    document.getElementById('meal-carbs').value = '';
    document.getElementById('meal-servings').value = '1';
    document.getElementById('meal-notes').value = '';
    document.getElementById('food-results').innerHTML = '';
    document.getElementById('food-search').value = '';
    loadMealHistory();
    loadDashboard();
  }
});

let currentSelectedFood = null;

async function searchFoods() {
  const query = document.getElementById('food-search').value.trim();
  if (query.length < 2) {
    document.getElementById('food-results').innerHTML = '';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/foods?search=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    let html = '';
    if (!data.foods || data.foods.length === 0) {
      html = '<div class="empty-state">No foods found</div>';
    } else {
      data.foods.forEach(food => {
        const foodId = food.id;
        const foodName = (food.name || '').replace(/'/g, "\\'");
        const foodCarbs = parseFloat(food.carbsPerServing) || 0;
        const foodRegion = food.region || 'Unknown';
        
        html += `<div class="food-result-item" onclick="selectFood(${foodId}, '${foodName}', ${foodCarbs}, '${foodRegion}')">
          <div>
            <div class="food-result-name">${food.name}</div>
            <div class="food-result-meta">${food.category || ''} • ${food.servingSize || ''}</div>
          </div>
          <div>
            <div class="food-result-carbs">${foodCarbs}g</div>
            <div class="food-result-region">${foodRegion}</div>
          </div>
        </div>`;
      });
    }
    document.getElementById('food-results').innerHTML = html;
  } catch (err) {
    console.error('Food search error:', err);
    showToast('Error searching foods');
  }
}

function filterByRegion() {
  const region = document.getElementById('food-region').value;
  if (!region) {
    document.getElementById('food-results').innerHTML = '';
    return;
  }

  fetch(`${API_URL}/foods?region=${encodeURIComponent(region)}&limit=50`)
    .then(r => r.json())
    .then(data => {
      let html = '';
      if (!data.foods || data.foods.length === 0) {
        html = '<div class="empty-state">No foods found for this region</div>';
      } else {
        data.foods.forEach(food => {
          const foodId = food.id;
          const foodName = (food.name || '').replace(/'/g, "\\'");
          const foodCarbs = parseFloat(food.carbsPerServing) || 0;
          const foodRegion = food.region || 'Unknown';
          
          html += `<div class="food-result-item" onclick="selectFood(${foodId}, '${foodName}', ${foodCarbs}, '${foodRegion}')">
            <div>
              <div class="food-result-name">${food.name}</div>
              <div class="food-result-meta">${food.category || ''} • ${food.servingSize || ''}</div>
            </div>
            <div>
              <div class="food-result-carbs">${foodCarbs}g</div>
              <div class="food-result-region">${foodRegion}</div>
            </div>
          </div>`;
        });
      }
      document.getElementById('food-results').innerHTML = html;
    });
}

function selectFood(id, name, carbs, region) {
  currentSelectedFood = { id, name, carbs, region };
  document.getElementById('meal-name').value = name;
  document.getElementById('meal-servings').value = '1';
  calculateCarbs();
  document.getElementById('food-results').innerHTML = '';
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
      html = '<p class="empty-state">No meals logged yet</p>';
    } else {
      data.meals.forEach(meal => {
        const time = new Date(meal.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        html += `
          <div class="meal-item">
            <div class="meal-item-content">
              <div class="meal-item-value">🍽 ${meal.name}</div>
              <div class="meal-item-meta">${time} • ${meal.estimatedCarbs}g carbs</div>
            </div>
            <button class="item-delete-btn" onclick="deleteMeal(${meal.id})">✕</button>
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
    showToast('✓ Insulin record saved');
    document.getElementById('insulin-dose').value = '';
    document.getElementById('insulin-notes').value = '';
    loadInsulinHistory();
    loadDashboard();
  }
});

async function loadInsulinHistory() {
  const data = await apiCall('/insulin?limit=20');
  if (data && data.history) {
    let html = '';
    if (data.history.length === 0) {
      html = '<p class="empty-state">No insulin logged yet</p>';
    } else {
      data.history.forEach(record => {
        const time = new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        html += `
          <div class="insulin-item">
            <div class="insulin-item-content">
              <div class="insulin-item-value">💉 ${record.type}</div>
              <div class="insulin-item-meta">${time} • ${record.dose} units</div>
            </div>
          </div>
        `;
      });
    }
    document.getElementById('insulin-history').innerHTML = html;
  }
}

// Risk engine
document.getElementById('rerun-risk-btn')?.addEventListener('click', () => {
  loadRiskEngine();
});

async function loadRiskEngine() {
  let data = await apiCall('/predict-risk', 'POST');
  
  if (!data || data.error || data.message === 'Insufficient glucose data for prediction') {
    data = await apiCall('/risk');
  }
  
  if (data) {
    const riskLevel = data.risk_level || data.level || 'UNKNOWN';
    const title = data.title || `Risk: ${riskLevel}`;
    const description = data.description || (data.probability ? `ML Model Probability: ${(data.probability * 100).toFixed(1)}%` : 'Loading risk assessment...');
    
    const circleEl = document.getElementById('risk-circle-large');
    circleEl.textContent = riskLevel;
    circleEl.classList.remove('low', 'moderate', 'elevated');
    if (riskLevel === 'LOW') circleEl.classList.add('low');
    else if (riskLevel === 'MODERATE') circleEl.classList.add('moderate');
    else if (riskLevel === 'ELEVATED') circleEl.classList.add('elevated');
    
    document.getElementById('risk-explanation').textContent = description;

    let factorsHTML = '';
    if (data.factors && Array.isArray(data.factors)) {
      data.factors.forEach((factor, idx) => {
        const importance = factor.importance || factor.weight || 0;
        const contribution = factor.contribution || (importance > 0.6 ? 'high' : importance > 0.3 ? 'medium' : 'low');
        const width = importance * 100;
        
        factorsHTML += `
          <div class="factor-item" style="animation-delay: ${idx * 50}ms;">
            <div class="factor-header">
              <span class="factor-name">${factor.name}</span>
              <span class="factor-importance ${contribution}">${contribution.charAt(0).toUpperCase() + contribution.slice(1)}</span>
            </div>
            <div class="factor-bar">
              <div class="factor-bar-fill" style="width: ${Math.min(width, 100)}%; --width: ${Math.min(width, 100)}%;"></div>
            </div>
          </div>
        `;
      });
    }
    
    document.getElementById('risk-factors').innerHTML = factorsHTML || '<p class="empty-state">No risk factors calculated</p>';
  }
}

// Timeline
async function loadTimeline() {
  const data = await apiCall('/timeline?days=1');
  if (data && data.events) {
    let html = '';
    if (data.events.length === 0) {
      html = '<p class="empty-state">No events recorded today</p>';
    } else {
      data.events.forEach((event, idx) => {
        const time = new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        let icon = '●';
        let type = 'glucose';
        if (event.type === 'meal') { icon = '🍽'; type = 'meal'; }
        else if (event.type === 'insulin') { icon = '💉'; type = 'insulin'; }
        else if (event.type === 'risk') { icon = '✦'; type = 'risk'; }

        html += `
          <div class="timeline-event ${type}" style="animation-delay: ${idx * 50}ms;">
            <div class="timeline-content">
              <div class="timeline-title">${icon} ${event.title}</div>
              <div class="timeline-detail">${event.detail}</div>
              <div class="timeline-time">${time}</div>
            </div>
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
    showToast(`✓ ${result.device.deviceType} connected`);
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
      html = '<p class="empty-state">No devices connected</p>';
    } else {
      data.devices.forEach(device => {
        const lastSync = device.lastSync ? new Date(device.lastSync).toLocaleString() : 'Never';
        html += `
          <div class="device-item">
            <div class="device-info">
              <div class="device-name">${device.deviceType.replace('_', ' ')}</div>
              <div class="device-detail">ID: ${device.deviceId}</div>
              <div class="device-detail">Last sync: ${lastSync}</div>
            </div>
            <div class="device-actions">
              <button class="device-btn" onclick="syncCGMDevice(${device.id})">Sync</button>
              <button class="device-btn danger" onclick="disconnectCGMDevice(${device.id})">Disconnect</button>
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
    showToast(`✓ Synced ${result.syncedReadings} reading(s)`);
    loadCGMDevices();
    setTimeout(loadGlucoseData, 500);
  }
}

async function disconnectCGMDevice(deviceId) {
  if (confirm('Disconnect this CGM device?')) {
    const result = await apiCall(`/cgm/disconnect/${deviceId}`, 'POST');
    if (result && result.success) {
      showToast('Device disconnected');
      loadCGMDevices();
    }
  }
}

function startCGMAutoSync() {
  setInterval(async () => {
    const result = await apiCall('/cgm/auto-sync', 'POST');
    if (result && result.totalReadings > 0) {
      console.log(`[CGM] Auto-synced ${result.totalReadings} readings`);
      loadGlucoseData();
      loadDashboard();
    }
  }, 5 * 60 * 1000);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  checkAuth();
  await loadUserProfile();
  loadDashboard();
  loadGlucoseData();
  loadMealHistory();
  loadInsulinHistory();
  loadRiskEngine();
  loadTimeline();
  loadCGMDevices();
  startCGMAutoSync();

  // Setup navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => go(btn.dataset.page));
  });

  // Profile menu
  const profileBtn = document.getElementById('profile-btn');
  const profileMenu = document.getElementById('profile-menu');
  profileBtn.addEventListener('click', () => {
    profileMenu.style.display = profileMenu.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
      profileMenu.style.display = 'none';
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
  });

  // Set current time in forms
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('glucose-time').value = now.toISOString().slice(0, 16);
  document.getElementById('meal-time').value = now.toISOString().slice(0, 16);
  document.getElementById('insulin-time').value = now.toISOString().slice(0, 16);
});
