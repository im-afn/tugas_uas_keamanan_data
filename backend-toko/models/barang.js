// models/barang.js
const pool = require("../config/database");

const Barang = {
  // Ambil semua barang (dengan filter)
  findAll: async (filters = {}) => {
    const { search, stok_menipis } = filters;
    let query =
      "SELECT id, kode, nama, satuan, harga_modal, harga_jual, stok, stok_minimal FROM barang WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (nama LIKE ? OR kode LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (stok_menipis === "true") {
      query += " AND stok <= stok_minimal";
    }

    query += " ORDER BY nama ASC";

    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Cari barang berdasarkan ID
  findById: async (id) => {
    const [rows] = await pool.query("SELECT * FROM barang WHERE id = ?", [id]);
    return rows[0] || null;
  },

  // Cek kode unik
  isKodeExist: async (kode, excludeId = null) => {
    let query = "SELECT id FROM barang WHERE kode = ?";
    const params = [kode];
    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  // Tambah barang
  create: async (data) => {
    const { kode, nama, satuan, harga_modal, harga_jual, stok, stok_minimal } =
      data;
    const [result] = await pool.query(
      "INSERT INTO barang (kode, nama, satuan, harga_modal, harga_jual, stok, stok_minimal) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        kode,
        nama,
        satuan || "pcs",
        harga_modal || 0,
        harga_jual || 0,
        stok || 0,
        stok_minimal || 5,
      ],
    );
    return result.insertId;
  },

  // Update barang
  update: async (id, data) => {
    const { kode, nama, satuan, harga_modal, harga_jual, stok_minimal } = data;
    const [result] = await pool.query(
      "UPDATE barang SET kode = ?, nama = ?, satuan = ?, harga_modal = ?, harga_jual = ?, stok_minimal = ?, updated_at = NOW() WHERE id = ?",
      [kode, nama, satuan, harga_modal, harga_jual, stok_minimal, id],
    );
    return result.affectedRows > 0;
  },

  // Update stok (tambah)
  tambahStok: async (id, jumlah) => {
    const [result] = await pool.query(
      "UPDATE barang SET stok = stok + ?, updated_at = NOW() WHERE id = ?",
      [jumlah, id],
    );
    return result.affectedRows > 0;
  },

  // Update stok (kurangi)
  kurangiStok: async (id, jumlah) => {
    const [result] = await pool.query(
      "UPDATE barang SET stok = stok - ?, updated_at = NOW() WHERE id = ? AND stok >= ?",
      [jumlah, id, jumlah],
    );
    return result.affectedRows > 0;
  },

  // Update stok (set nilai absolut)
  setStok: async (id, stok) => {
    const [result] = await pool.query(
      "UPDATE barang SET stok = ?, updated_at = NOW() WHERE id = ?",
      [stok, id],
    );
    return result.affectedRows > 0;
  },

  // Update harga modal
  updateHargaModal: async (id, harga_modal) => {
    const [result] = await pool.query(
      "UPDATE barang SET harga_modal = ?, updated_at = NOW() WHERE id = ?",
      [harga_modal, id],
    );
    return result.affectedRows > 0;
  },

  // Hapus barang
  delete: async (id) => {
    const [result] = await pool.query("DELETE FROM barang WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },

  // Cek apakah barang punya riwayat transaksi
  hasTransaksi: async (id) => {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as count FROM transaksi_detail WHERE barang_id = ?",
      [id],
    );
    return rows[0].count > 0;
  },

  // Ambil barang dengan stok menipis
  getStokMenipis: async () => {
    const [rows] = await pool.query(
      `SELECT id, kode, nama, satuan, stok, stok_minimal,
            CASE 
                WHEN stok = 0 THEN 'habis'
                WHEN stok <= stok_minimal THEN 'menipis'
                ELSE 'aman'
            END as status_stok
            FROM barang 
            WHERE stok <= stok_minimal 
            ORDER BY stok ASC`,
    );
    return rows;
  },

  // Hitung total barang
  countAll: async () => {
    const [rows] = await pool.query("SELECT COUNT(*) as total FROM barang");
    return rows[0].total;
  },

  // Hitung total stok menipis
  countStokMenipis: async () => {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as total FROM barang WHERE stok <= stok_minimal",
    );
    return rows[0].total;
  },
};

module.exports = Barang;
