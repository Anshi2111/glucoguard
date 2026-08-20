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
  try {
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    const token = loginRes.data.token;

    const now = new Date().toISOString();
    const addRes = await makeRequest('POST', '/api/glucose', {
      value: 120,
      unit: 'mg/dL',
      timestamp: now,
      notes: 'Test'
    }, { 'Authorization': `Bearer ${token}` });

    console.log('Add Glucose Response:', JSON.stringify(addRes.data, null, 2));

    const getRes = await makeRequest('GET', '/api/glucose', null, { 'Authorization': `Bearer ${token}` });
    console.log('\nGet Glucose Response:', JSON.stringify(getRes.data, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
