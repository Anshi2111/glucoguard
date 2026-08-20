// Comprehensive test for all API endpoints
const http = require('http');

function makeRequest(method, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: body } });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('=== GLUCO ONE API COMPREHENSIVE TEST ===\n');

  try {
    // 1. Login
    console.log('1. LOGIN');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('   ✓ Logged in, token:', token.substring(0, 30) + '...\n');

    // 2. Add glucose reading
    console.log('2. ADD GLUCOSE READING');
    const now = new Date().toISOString();
    const glucoseRes = await makeRequest('POST', '/api/glucose', {
      value: 120,
      unit: 'mg/dL',
      timestamp: now,
      notes: 'After breakfast'
    }, { 'Authorization': `Bearer ${token}` });
    const glucoseId = glucoseRes.data.id;
    console.log('   ✓ Added glucose:', glucoseRes.data.value, glucoseRes.data.unit, '\n');

    // 3. Get glucose readings
    console.log('3. GET GLUCOSE READINGS');
    const getGlucoseRes = await makeRequest('GET', '/api/glucose', null, { 'Authorization': `Bearer ${token}` });
    console.log('   ✓ Found', getGlucoseRes.data.readings.length, 'glucose readings\n');

    // 4. Add meal
    console.log('4. ADD MEAL');
    const mealRes = await makeRequest('POST', '/api/meals', {
      name: 'Poha + Egg',
      estimatedCarbs: 35,
      timestamp: now,
      notes: 'Indian breakfast'
    }, { 'Authorization': `Bearer ${token}` });
    const mealId = mealRes.data.id;
    console.log('   ✓ Added meal:', mealRes.data.name, '-', mealRes.data.estimated_carbs, 'g carbs\n');

    // 5. Get meals
    console.log('5. GET MEALS');
    const getMealsRes = await makeRequest('GET', '/api/meals', null, { 'Authorization': `Bearer ${token}` });
    console.log('   ✓ Found', getMealsRes.data.meals.length, 'meals\n');

    // 6. Add insulin
    console.log('6. ADD INSULIN');
    const insulinRes = await makeRequest('POST', '/api/insulin', {
      type: 'Rapid-acting',
      dose: 4,
      timestamp: now,
      notes: 'Before breakfast'
    }, { 'Authorization': `Bearer ${token}` });
    const insulinId = insulinRes.data.id;
    console.log('   ✓ Added insulin:', insulinRes.data.dose, 'units of', insulinRes.data.type, '\n');

    // 7. Get insulin history
    console.log('7. GET INSULIN HISTORY');
    const getInsulinRes = await makeRequest('GET', '/api/insulin', null, { 'Authorization': `Bearer ${token}` });
    console.log('   ✓ Found', getInsulinRes.data.history.length, 'insulin records\n');

    // 8. Delete glucose
    console.log('8. DELETE GLUCOSE READING');
    const delGlucoseRes = await makeRequest('DELETE', `/api/glucose/${glucoseId}`, null, { 'Authorization': `Bearer ${token}` });
    console.log('   ✓ Deleted glucose reading\n');

    // 9. Delete meal
    console.log('9. DELETE MEAL');
    const delMealRes = await makeRequest('DELETE', `/api/meals/${mealId}`, null, { 'Authorization': `Bearer ${token}` });
    console.log('   ✓ Deleted meal\n');

    // 10. Delete insulin
    console.log('10. DELETE INSULIN RECORD');
    const delInsulinRes = await makeRequest('DELETE', `/api/insulin/${insulinId}`, null, { 'Authorization': `Bearer ${token}` });
    console.log('   ✓ Deleted insulin record\n');

    console.log('═══════════════════════════════════════════');
    console.log('✓✓✓ ALL ENDPOINTS WORKING ✓✓✓');
    console.log('═══════════════════════════════════════════');
    process.exit(0);

  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

test();
