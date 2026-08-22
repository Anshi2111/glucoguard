const pool = require('../config/database');
const { toMySQLDateTime } = require('../utils/dateUtils');

class Meal {
  static async create(userId, name, estimatedCarbs, timestamp, notes, imageUrl) {
    const query = `
      INSERT INTO meals (user_id, name, estimated_carbs, timestamp, notes, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const connection = await pool.getConnection();
    try {
      const mysqlTimestamp = toMySQLDateTime(timestamp);
      const result = await connection.execute(query, [userId, name, estimatedCarbs, mysqlTimestamp, notes, imageUrl]);
      return {
        id: result[0].insertId,
        user_id: userId,
        name,
        estimated_carbs: estimatedCarbs,
        timestamp,
        notes,
        image_url: imageUrl
      };
    } finally {
      connection.release();
    }
  }

  static async findByUserId(userId, limit = 50) {
    const limitVal = Math.min(Math.max(parseInt(limit) || 50, 1), 1000);
    const query = `
      SELECT id, name, estimated_carbs, notes, image_url, timestamp, created_at
      FROM meals
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
      SELECT id, name, estimated_carbs, notes, image_url, timestamp, created_at
      FROM meals
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

  static async deleteById(id, userId) {
    const query = 'DELETE FROM meals WHERE id = ? AND user_id = ?';
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [id, userId]);
      return result[0].affectedRows > 0 ? { id } : null;
    } finally {
      connection.release();
    }
  }
}

module.exports = Meal;
