/**
 * Migration 003: CGM Device Integration
 * Creates tables for storing CGM device connections and sync history
 */

const pool = require('../config/database');

async function migrate() {
  try {
    const conn = await pool.getConnection();

    // Check if table exists
    const tables = await conn.query("SHOW TABLES LIKE 'cgm_devices'");
    
    if (tables[0].length === 0) {
      console.log('Creating cgm_devices table...');
      
      await conn.query(`
        CREATE TABLE cgm_devices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          device_type VARCHAR(50) NOT NULL COMMENT 'dexcom, freestyle_libre, medtronic, tandem',
          device_id VARCHAR(255) NOT NULL COMMENT 'External device ID from CGM provider',
          auth_token TEXT NOT NULL COMMENT 'OAuth token for CGM API',
          is_active BOOLEAN DEFAULT TRUE,
          last_sync DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_device (user_id, is_active)
        )
      `);
      
      console.log('✓ cgm_devices table created');
    }

    // Check if cgm_sync_history table exists
    const syncTables = await conn.query("SHOW TABLES LIKE 'cgm_sync_history'");
    
    if (syncTables[0].length === 0) {
      console.log('Creating cgm_sync_history table...');
      
      await conn.query(`
        CREATE TABLE cgm_sync_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cgm_device_id INT NOT NULL,
          sync_timestamp DATETIME NOT NULL,
          data_points_synced INT DEFAULT 0,
          sync_status VARCHAR(50) DEFAULT 'success' COMMENT 'success, failed, partial',
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cgm_device_id) REFERENCES cgm_devices(id) ON DELETE CASCADE,
          INDEX idx_device_sync (cgm_device_id, sync_timestamp)
        )
      `);
      
      console.log('✓ cgm_sync_history table created');
    }

    conn.release();
    console.log('✓ CGM migration complete');
  } catch (err) {
    console.error('Migration error:', err.message);
    throw err;
  }
}

module.exports = migrate;
