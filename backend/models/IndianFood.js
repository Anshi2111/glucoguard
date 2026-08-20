const pool = require('../config/database');

class IndianFood {
  static async findAll(limit) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 100, 1000));
    const query = `
      SELECT id, name, region, category, serving_size, carbs_per_serving, source
      FROM indian_foods
      LIMIT ${safeLimit}
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.query(query);
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const query = `
      SELECT id, name, region, category, serving_size, carbs_per_serving, source
      FROM indian_foods
      WHERE id = ?
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [parseInt(id)]);
      return result[0][0];
    } finally {
      connection.release();
    }
  }

  static async search(searchTerm, limit) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const safeTerm = `%${String(searchTerm).replace(/[%_]/g, '\\$&')}%`;
    const query = `
      SELECT id, name, region, category, serving_size, carbs_per_serving, source
      FROM indian_foods
      WHERE name LIKE ? OR category LIKE ?
      LIMIT ${safeLimit}
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [safeTerm, safeTerm]);
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findByRegion(region, limit) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const query = `
      SELECT id, name, region, category, serving_size, carbs_per_serving, source
      FROM indian_foods
      WHERE region = ?
      LIMIT ${safeLimit}
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [String(region)]);
      return result[0];
    } finally {
      connection.release();
    }
  }

  static async findByCategory(category, limit) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const query = `
      SELECT id, name, region, category, serving_size, carbs_per_serving, source
      FROM indian_foods
      WHERE category = ?
      LIMIT ${safeLimit}
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [String(category)]);
      return result[0];
    } finally {
      connection.release();
    }
  }
}

module.exports = IndianFood;
