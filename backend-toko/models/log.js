// models/log.js
const pool = require("../config/database");

const Log = {
  // Catat log aktivitas
  catatAktivitas: async (data) => {
    const { user_id, aksi, target, detail, ip_address } = data;
    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [user_id, aksi, target, detail || null, ip_address || null],
    );
  },

  // Ambil log aktivitas
  getAktivitas: async (filters = {}) => {
    const { limit, user_id } = filters;
    let query = `
            SELECT l.id, l.aksi, l.target, l.detail, l.ip_address, l.created_at,
                   u.nama_lengkap as oleh
            FROM log_aktivitas l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE 1=1
        `;
    const params = [];

    if (user_id) {
      query += " AND l.user_id = ?";
      params.push(user_id);
    }

    query += " ORDER BY l.created_at DESC";

    if (limit) {
      query += " LIMIT ?";
      params.push(parseInt(limit));
    }

    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Catat log stok
  catatStok: async (data) => {
    const { barang_id, user_id, jenis, jumlah, keterangan } = data;
    await pool.query(
      "INSERT INTO log_stok (barang_id, user_id, jenis, jumlah, keterangan) VALUES (?, ?, ?, ?, ?)",
      [barang_id, user_id, jenis, jumlah, keterangan || null],
    );
  },

  // Ambil log stok
  getStok: async (filters = {}) => {
    const { barang_id, jenis, limit } = filters;
    let query = `
            SELECT ls.id, ls.barang_id, b.nama as nama_barang, ls.jenis, ls.jumlah, 
                   ls.keterangan, u.nama_lengkap as oleh, ls.created_at
            FROM log_stok ls
            LEFT JOIN barang b ON ls.barang_id = b.id
            LEFT JOIN users u ON ls.user_id = u.id
            WHERE 1=1
        `;
    const params = [];

    if (barang_id) {
      query += " AND ls.barang_id = ?";
      params.push(barang_id);
    }
    if (jenis) {
      query += " AND ls.jenis = ?";
      params.push(jenis);
    }

    query += " ORDER BY ls.created_at DESC";

    if (limit) {
      query += " LIMIT ?";
      params.push(parseInt(limit));
    }

    const [rows] = await pool.query(query, params);
    return rows;
  },
};

module.exports = Log;
