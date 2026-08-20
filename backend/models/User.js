const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(email, passwordHash, firstName, lastName, diabetesType) {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, diabetes_type)
      VALUES (?, ?, ?, ?, ?)
    `;
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [email, passwordHash, firstName, lastName, diabetesType]);
      const id = result[0].insertId;
      return {
        id,
        email,
        first_name: firstName,
        last_name: lastName,
        diabetes_type: diabetesType
      };
    } finally {
      connection.release();
    }
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [email]);
      return result[0][0];
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const query = 'SELECT id, email, first_name, last_name, diabetes_type, created_at FROM users WHERE id = ?';
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(query, [id]);
      return result[0][0];
    } finally {
      connection.release();
    }
  }

  static async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

module.exports = User;
