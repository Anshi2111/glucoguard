const pool = require('../config/database');

const schema = `
  CREATE TABLE IF NOT EXISTS indian_foods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    serving_size VARCHAR(100) NOT NULL,
    carbs_per_serving DECIMAL(6, 1) NOT NULL,
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_region (region),
    INDEX idx_category (category),
    FULLTEXT INDEX ft_name (name)
  );
`;

async function migrate() {
  const connection = await pool.getConnection();
  try {
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }
    console.log('✓ Indian foods table created');
  } catch (err) {
    console.error('✗ Migration 002 failed:', err.message);
  } finally {
    connection.release();
  }
}

module.exports = migrate;
