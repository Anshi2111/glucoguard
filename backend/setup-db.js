// Database setup helper for MySQL
// Run: node setup-db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  console.log('Glucoguard Database Setup (MySQL)');
  console.log('==================================\n');

  // Connect to MySQL server (without specifying database)
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('1. Connecting to MySQL...');
    await connection.ping();
    console.log('   ✓ Connected\n');

    console.log('2. Creating database "glucoguard_dev"...');
    try {
      await connection.query('CREATE DATABASE IF NOT EXISTS glucoguard_dev');
      console.log('   ✓ Database created (or already exists)\n');
    } catch (err) {
      throw err;
    }

    console.log('3. Testing connection to glucoguard_dev...');
    await connection.end();

    const appConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: 'glucoguard_dev',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
    });

    const result = await appConnection.query('SELECT NOW() as time');
    console.log('   ✓ Connection successful\n');
    await appConnection.end();

    console.log('✓ Database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Start the backend server: npm start');
    console.log('2. Open frontend in browser: http://localhost:5500');
    console.log('\nThe server will run migrations automatically on startup.');
  } catch (err) {
    console.error('\n✗ Database setup failed');
    console.error('Error:', err.message);
    console.error('\nTroubleshooting:');
    console.error('- Is MySQL running?');
    console.error('- Check your .env file for correct credentials');
    console.error('- Default user is "root", password may need to be set');
    console.error('- On Windows: MySQL defaults to port 3306');
    process.exit(1);
  }
}

setupDatabase();
