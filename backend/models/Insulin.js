const pool = require('../config/database');
const { toMySQLDateTime } = require('../utils/dateUtils');

class Insulin {
  static async create(userId, type, dose, timestamp, notes) {
    const query = `
      INSERT INTO insulin_logs (user_id, type, dose, timestamp, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    const connection = await pool.getConnection();
    try {
      const mysqlTimestamp = toMySQLDateTime(timestamp);
      const result = await connection.execute(query, [userId, type, dose, mysqlTimestamp, notes]);
      return {
        id: result[0].insertId,
        user_id: userId,
        type,
        dose,
        timestamp,
        notes
      };
    } finally {
      connection.release();
    }
  }

  static async findByUserId(userId, limit = 50) {
    const limitVal = Math.min(Math.max(parseInt(limit) || 50, 1), 1000);
    const query = `
      SELECT id, type, dose, notes, timestamp, created_at
      FROM insulin_logs
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ${limitVal}
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [userId]);
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findByUserIdAndDateRange(userId, startDate, endDate) {
    const query = `
      SELECT id, type, dose, notes, timestamp, created_at
      FROM insulin_logs
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
    const nVal = Math.min(Math.max(parseInt(n) || 5, 1), 1000);
    const query = `
      SELECT type, dose, timestamp
      FROM insulin_logs
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ${nVal}
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [userId]);
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async deleteById(id, userId) {
    const query = 'DELETE FROM insulin_logs WHERE id = ? AND user_id = ?';
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [id, userId]);
      return result[0].affectedRows > 0 ? { id } : null;
    } finally {
      connection.release();
    }
  }
}

module.exports = Insulin;
