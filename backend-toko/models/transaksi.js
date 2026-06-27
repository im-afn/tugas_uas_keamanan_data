// models/transaksi.js
const pool = require("../config/database");

const Transaksi = {
  // Generate nomor transaksi
  generateNoTransaksi: async () => {
    const today = new Date();
    const tgl = today.toISOString().slice(0, 10).replace(/-/g, "");
    const [counter] = await pool.query(
      "SELECT COUNT(*) as count FROM transaksi WHERE DATE(created_at) = CURDATE()",
    );
    const noUrut = String(counter[0].count + 1).padStart(4, "0");
    return `TRX-${tgl}-${noUrut}`;
  },

  // Buat transaksi baru (header)
  create: async (data) => {
    const {
      no_transaksi,
      user_id,
      pelanggan_id,
      jenis,
      total,
      uang_diterima,
      uang_kembalian,
      status_bon,
    } = data;
    const [result] = await pool.query(
      `INSERT INTO transaksi (no_transaksi, user_id, pelanggan_id, jenis, total, uang_diterima, uang_kembalian, status_bon) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        no_transaksi,
        user_id,
        pelanggan_id || null,
        jenis,
        total,
        uang_diterima || 0,
        uang_kembalian || 0,
        status_bon || null,
      ],
    );
    return result.insertId;
  },

  // Tambah detail transaksi
  createDetail: async (data) => {
    const { transaksi_id, barang_id, jumlah, harga_satuan, subtotal } = data;
    const [result] = await pool.query(
      "INSERT INTO transaksi_detail (transaksi_id, barang_id, jumlah, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?)",
      [transaksi_id, barang_id, jumlah, harga_satuan, subtotal],
    );
    return result.insertId;
  },

  // Cari transaksi berdasarkan ID
  findById: async (id) => {
    const [rows] = await pool.query(
      `SELECT t.*, u.nama_lengkap as kasir, p.nama as pelanggan
            FROM transaksi t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN pelanggan p ON t.pelanggan_id = p.id
            WHERE t.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  // Ambil detail transaksi
  getDetail: async (transaksi_id) => {
    const [rows] = await pool.query(
      `SELECT td.*, b.nama as nama_barang, b.kode as kode_barang
            FROM transaksi_detail td
            LEFT JOIN barang b ON td.barang_id = b.id
            WHERE td.transaksi_id = ?`,
      [transaksi_id],
    );
    return rows;
  },

  // Ambil semua transaksi (dengan filter)
  findAll: async (filters = {}) => {
    const { tgl, jenis, user_id, limit } = filters;
    let query = `
            SELECT t.id, t.no_transaksi, t.jenis, t.total, t.uang_diterima, 
                   t.uang_kembalian, t.status_bon, t.created_at,
                   u.nama_lengkap as kasir, p.nama as pelanggan
            FROM transaksi t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN pelanggan p ON t.pelanggan_id = p.id
            WHERE 1=1
        `;
    const params = [];

    if (tgl) {
      query += " AND DATE(t.created_at) = ?";
      params.push(tgl);
    }
    if (jenis) {
      query += " AND t.jenis = ?";
      params.push(jenis);
    }
    if (user_id) {
      query += " AND t.user_id = ?";
      params.push(user_id);
    }

    query += " ORDER BY t.created_at DESC";

    if (limit) {
      query += " LIMIT ?";
      params.push(parseInt(limit));
    }

    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Lunasi bon
  lunasi: async (id) => {
    const [transaksi] = await pool.query(
      "SELECT * FROM transaksi WHERE id = ?",
      [id],
    );
    if (transaksi.length === 0) return false;

    const [result] = await pool.query(
      "UPDATE transaksi SET status_bon = ?, uang_diterima = ?, uang_kembalian = ? WHERE id = ?",
      ["lunas", transaksi[0].total, 0, id],
    );
    return result.affectedRows > 0;
  },

  // Ambil daftar piutang
  getPiutang: async () => {
    const [rows] = await pool.query(
      `SELECT t.id, t.no_transaksi, t.total, t.created_at,
                    p.id as pelanggan_id, p.nama as pelanggan, p.no_hp,
                    DATEDIFF(NOW(), t.created_at) as umur_hari
            FROM transaksi t
            JOIN pelanggan p ON t.pelanggan_id = p.id
            WHERE t.jenis = 'bon' AND t.status_bon = 'belum_lunas'
            ORDER BY t.created_at ASC`,
    );
    return rows;
  },
};

module.exports = Transaksi;
