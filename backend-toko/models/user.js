// models/user.js
const pool = require("../config/database");

const User = {
  // Cari user berdasarkan username
  findByUsername: async (username) => {
    const [rows] = await pool.query(
      "SELECT id, username, password, nama_lengkap, role, aktif FROM users WHERE username = ?",
      [username],
    );
    return rows[0] || null;
  },

  // Cari user berdasarkan ID
  findById: async (id) => {
    const [rows] = await pool.query(
      "SELECT id, username, nama_lengkap, role, aktif FROM users WHERE id = ?",
      [id],
    );
    return rows[0] || null;
  },

  // Ambil semua user
  findAll: async () => {
    const [rows] = await pool.query(
      "SELECT id, username, nama_lengkap, role, aktif, created_at FROM users ORDER BY id ASC",
    );
    return rows;
  },

  // Tambah user
  create: async (data) => {
    const { username, password, nama_lengkap, role } = data;
    const [result] = await pool.query(
      "INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)",
      [username, password, nama_lengkap, role],
    );
    return result.insertId;
  },

  // Update user
  update: async (id, data) => {
    const { username, nama_lengkap, role, aktif } = data;
    const [result] = await pool.query(
      "UPDATE users SET username = ?, nama_lengkap = ?, role = ?, aktif = ? WHERE id = ?",
      [username, nama_lengkap, role, aktif, id],
    );
    return result.affectedRows > 0;
  },

  // Update password
  updatePassword: async (id, hashedPassword) => {
    const [result] = await pool.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, id],
    );
    return result.affectedRows > 0;
  },

  // Cek username sudah ada
  isUsernameExist: async (username, excludeId = null) => {
    let query = "SELECT id FROM users WHERE username = ?";
    const params = [username];
    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },
};

module.exports = User;
