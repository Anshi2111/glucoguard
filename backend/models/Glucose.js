const pool = require('../config/database');
const { toMySQLDateTime } = require('../utils/dateUtils');

class Glucose {
  static async create(userId, value, unit, timestamp, notes) {
    const query = `
      INSERT INTO glucose_readings (user_id, value, unit, timestamp, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    const connection = await pool.getConnection();
    try {
      const mysqlTimestamp = toMySQLDateTime(timestamp);
      const result = await connection.execute(query, [userId, value, unit, mysqlTimestamp, notes]);
      return {
        id: result[0].insertId,
        user_id: userId,
        value,
        unit,
        timestamp,
        notes
      };
    } finally {
      connection.release();
    }
  }

  static async findByUserId(userId, limit = 50) {
    const query = `
      SELECT id, value, unit, notes, timestamp, created_at
      FROM glucose_readings
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [userId, limit]);
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findByUserIdAndDateRange(userId, startDate, endDate) {
    const query = `
      SELECT id, value, unit, notes, timestamp, created_at
      FROM glucose_readings
      WHERE user_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
    `;
    const connection = await pool.getConnection();
    try {
      const startDateTime = toMySQLDateTime(startDate);
      const endDateTime = toMySQLDateTime(endDate);
      const result = await connection.execute(query, [userId, startDateTime, endDateTime]);
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findLastN(userId, n = 5) {
    const query = `
      SELECT value, timestamp
      FROM glucose_readings
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [userId, n]);
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async deleteById(id, userId) {
    const query = 'DELETE FROM glucose_readings WHERE id = ? AND user_id = ?';
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [id, userId]);
      return result[0].affectedRows > 0 ? { id } : null;
    } finally {
      connection.release();
    }
  }
}

module.exports = Glucose;
