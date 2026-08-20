/**
 * CGM Device Model
 * Stores connected CGM devices and sync status
 */

const pool = require('../config/database');

class CGMDevice {
  /**
   * Create CGM device connection
   */
  static async create(userId, deviceType, authToken, deviceId) {
    try {
      const conn = await pool.getConnection();
      
      const result = await conn.query(
        `INSERT INTO cgm_devices (user_id, device_type, auth_token, device_id, is_active, last_sync, created_at)
         VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())`,
        [userId, deviceType, authToken, deviceId]
      );
      
      conn.release();
      return { id: result.insertId, userId, deviceType, isActive: true };
    } catch (err) {
      console.error('Error creating CGM device:', err.message);
      throw err;
    }
  }

  /**
   * Get CGM devices for user
   */
  static async findByUserId(userId) {
    try {
      const conn = await pool.getConnection();
      
      const result = await conn.query(
        `SELECT id, user_id, device_type, device_id, is_active, last_sync, created_at
         FROM cgm_devices
         WHERE user_id = ? AND is_active = TRUE
         ORDER BY created_at DESC`,
        [userId]
      );
      
      conn.release();
      
      return result[0].map(row => ({
        id: row.id,
        userId: row.user_id,
        deviceType: row.device_type,
        deviceId: row.device_id,
        isActive: row.is_active,
        lastSync: row.last_sync,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error('Error fetching CGM devices:', err.message);
      throw err;
    }
  }

  /**
   * Get single CGM device
   */
  static async findById(id, userId) {
    try {
      const conn = await pool.getConnection();
      
      const result = await conn.query(
        `SELECT id, user_id, device_type, device_id, auth_token, is_active, last_sync, created_at
         FROM cgm_devices
         WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      
      conn.release();
      
      if (result[0].length === 0) return null;
      
      const row = result[0][0];
      return {
        id: row.id,
        userId: row.user_id,
        deviceType: row.device_type,
        deviceId: row.device_id,
        authToken: row.auth_token,
        isActive: row.is_active,
        lastSync: row.last_sync,
        createdAt: row.created_at
      };
    } catch (err) {
      console.error('Error fetching CGM device:', err.message);
      throw err;
    }
  }

  /**
   * Update last sync time
   */
  static async updateLastSync(id, userId) {
    try {
      const conn = await pool.getConnection();
      
      await conn.query(
        `UPDATE cgm_devices
         SET last_sync = NOW()
         WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      
      conn.release();
      return true;
    } catch (err) {
      console.error('Error updating last sync:', err.message);
      throw err;
    }
  }

  /**
   * Disconnect CGM device
   */
  static async disconnect(id, userId) {
    try {
      const conn = await pool.getConnection();
      
      await conn.query(
        `UPDATE cgm_devices
         SET is_active = FALSE
         WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      
      conn.release();
      return true;
    } catch (err) {
      console.error('Error disconnecting CGM device:', err.message);
      throw err;
    }
  }

  /**
   * Delete CGM device
   */
  static async delete(id, userId) {
    try {
      const conn = await pool.getConnection();
      
      await conn.query(
        `DELETE FROM cgm_devices
         WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      
      conn.release();
      return true;
    } catch (err) {
      console.error('Error deleting CGM device:', err.message);
      throw err;
    }
  }
}

module.exports = CGMDevice;
