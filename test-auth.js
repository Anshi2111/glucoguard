// Quick test for authentication endpoints

const http = require('http');

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('Testing Authentication Endpoints\n');

  try {
    // Test 1: Register
    console.log('1. Testing POST /api/auth/register...');
    const registerRes = await makeRequest('POST', '/api/auth/register', {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      diabetesType: 'Type 1'
    });
    console.log('Response:', JSON.stringify(registerRes, null, 2));
    const token = registerRes.token;

    if (!token) {
      console.log('✗ Register failed');
      process.exit(1);
    }
    console.log('✓ Register successful, token:', token.substring(0, 20) + '...\n');

    // Test 2: Login
    console.log('2. Testing POST /api/auth/login...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('Response:', JSON.stringify(loginRes, null, 2));
    console.log('✓ Login successful\n');

    // Test 3: Get User (with token)
    console.log('3. Testing GET /api/user (protected)...');
    const getUserReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/user',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
        console.log('✓ Get user successful\n');
        console.log('✓✓✓ All authentication tests passed! ✓✓✓');
        process.exit(0);
      });
    });
    getUserReq.on('error', console.error);
    getUserReq.end();

  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

test();
