// Test login and get user endpoints

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
  console.log('Phase 3A: Authentication Tests\n');

  try {
    // Test 1: Login
    console.log('1. Testing POST /api/auth/login...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (loginRes.status !== 200) {
      console.log('✗ Login failed:', loginRes.data);
      process.exit(1);
    }
    
    console.log('✓ Login successful');
    console.log('  User:', loginRes.data.user.firstName, loginRes.data.user.lastName);
    console.log('  Token:', loginRes.data.token.substring(0, 30) + '...\n');
    
    const token = loginRes.data.token;

    // Test 2: Get User (with token)
    console.log('2. Testing GET /api/user (with valid token)...');
    const getUserRes = await makeRequest('GET', '/api/user', null, {
      'Authorization': `Bearer ${token}`
    });
    
    if (getUserRes.status !== 200) {
      console.log('✗ Get user failed:', getUserRes.data);
      process.exit(1);
    }
    
    console.log('✓ Get user successful');
    console.log('  User:', getUserRes.data.user.firstName, getUserRes.data.user.lastName);
    console.log('  Email:', getUserRes.data.user.email, '\n');

    // Test 3: Get User (without token)
    console.log('3. Testing GET /api/user (without token - should fail)...');
    const noTokenRes = await makeRequest('GET', '/api/user');
    
    if (noTokenRes.status === 401) {
      console.log('✓ Correctly rejected (status 401)');
      console.log('  Error:', noTokenRes.data.error, '\n');
    } else {
      console.log('✗ Should have rejected but got status', noTokenRes.status);
      process.exit(1);
    }

    // Test 4: Wrong password
    console.log('4. Testing POST /api/auth/login (wrong password - should fail)...');
    const wrongPwRes = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    
    if (wrongPwRes.status === 401) {
      console.log('✓ Correctly rejected (status 401)');
      console.log('  Error:', wrongPwRes.data.error, '\n');
    } else {
      console.log('✗ Should have rejected but got status', wrongPwRes.status);
      process.exit(1);
    }

    console.log('═══════════════════════════════════════════');
    console.log('✓✓✓ PHASE 3A AUTHENTICATION TESTS PASSED ✓✓✓');
    console.log('═══════════════════════════════════════════');
    process.exit(0);

  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

test();
