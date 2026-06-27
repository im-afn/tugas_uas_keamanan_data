// routes/laporan.js
const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const apiKeyMiddleware = require("../middleware/apiKey");
const authMiddleware = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const { sukses, error } = require("../utils/response");

router.use(apiKeyMiddleware);
router.use(authMiddleware);

/**
 * GET /api/laporan/dashboard
 * Ringkasan dashboard untuk pemilik
 * Akses: admin only
 */
router.get("/dashboard", rbacMiddleware("admin"), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Ringkasan penjualan hari ini
    const [penjualan] = await pool.query(
      `SELECT 
                COUNT(*) as total_transaksi,
                COALESCE(SUM(total), 0) as total_penjualan
            FROM transaksi 
            WHERE DATE(created_at) = ?`,
      [today],
    );

    // Total penjualan tunai hari ini
    const [tunai] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as total_tunai
            FROM transaksi 
            WHERE DATE(created_at) = ? AND jenis = 'tunai'`,
      [today],
    );

    // Total penjualan bon hari ini
    const [bon] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as total_bon
            FROM transaksi 
            WHERE DATE(created_at) = ? AND jenis = 'bon'`,
      [today],
    );

    // Piutang belum lunas
    const [piutang] = await pool.query(
      `SELECT 
                COUNT(DISTINCT pelanggan_id) as total_pelanggan,
                COALESCE(SUM(total), 0) as total_piutang
            FROM transaksi 
            WHERE jenis = 'bon' AND status_bon = 'belum_lunas'`,
    );

    // Stok menipis
    const [stokMenipis] = await pool.query(
      "SELECT COUNT(*) as total FROM barang WHERE stok <= stok_minimal",
    );

    // Total barang
    const [totalBarang] = await pool.query(
      "SELECT COUNT(*) as total FROM barang",
    );

    // Laba kotor hari ini (estimasi)
    const [laba] = await pool.query(
      `SELECT 
                COALESCE(SUM((td.harga_satuan - b.harga_modal) * td.jumlah), 0) as laba_kotor
            FROM transaksi_detail td
            JOIN transaksi t ON td.transaksi_id = t.id
            JOIN barang b ON td.barang_id = b.id
            WHERE DATE(t.created_at) = ?`,
      [today],
    );

    // Transaksi terbaru
    const [transaksiTerbaru] = await pool.query(
      `SELECT 
                t.id,
                t.no_transaksi,
                t.jenis,
                t.total,
                t.created_at,
                u.nama_lengkap as kasir
            FROM transaksi t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
            LIMIT 10`,
    );

    const dashboard = {
      hari_ini: {
        tanggal: today,
        total_transaksi: penjualan[0].total_transaksi,
        total_penjualan: penjualan[0].total_penjualan,
        tunai: tunai[0].total_tunai,
        bon: bon[0].total_bon,
        laba_kotor: laba[0].laba_kotor,
      },
      piutang: {
        total_pelanggan: piutang[0].total_pelanggan,
        total_piutang: piutang[0].total_piutang,
      },
      stok: {
        total_barang: totalBarang[0].total,
        stok_menipis: stokMenipis[0].total,
      },
      transaksi_terbaru: transaksiTerbaru,
    };

    return sukses(res, dashboard, "Dashboard berhasil diambil");
  } catch (err) {
    console.error("Dashboard error:", err);
    return error(res, "Gagal mengambil data dashboard");
  }
});

/**
 * GET /api/laporan/penjualan
 * Laporan penjualan detail (dengan filter tanggal)
 * Akses: admin only
 */
router.get("/penjualan", rbacMiddleware("admin"), async (req, res) => {
  try {
    const { dari, sampai } = req.query;

    let query = `
            SELECT 
                t.id,
                t.no_transaksi,
                t.jenis,
                t.total,
                t.uang_diterima,
                t.uang_kembalian,
                t.status_bon,
                t.created_at,
                u.nama_lengkap as kasir,
                p.nama as pelanggan
            FROM transaksi t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN pelanggan p ON t.pelanggan_id = p.id
            WHERE 1=1
        `;
    const params = [];

    if (dari) {
      query += " AND DATE(t.created_at) >= ?";
      params.push(dari);
    }
    if (sampai) {
      query += " AND DATE(t.created_at) <= ?";
      params.push(sampai);
    }

    query += " ORDER BY t.created_at DESC";

    const [rows] = await pool.query(query, params);

    // Ringkasan
    const totalPenjualan = rows.reduce(
      (sum, row) => sum + parseFloat(row.total),
      0,
    );
    const totalTransaksi = rows.length;

    return sukses(
      res,
      {
        ringkasan: {
          total_transaksi: totalTransaksi,
          total_penjualan: totalPenjualan,
        },
        detail: rows,
      },
      "Laporan penjualan berhasil diambil",
    );
  } catch (err) {
    console.error("Laporan penjualan error:", err);
    return error(res, "Gagal mengambil laporan penjualan");
  }
});

/**
 * GET /api/laporan/penjualan-per-barang
 * Laporan penjualan dikelompokkan per barang
 * Akses: admin only
 */
router.get(
  "/penjualan-per-barang",
  rbacMiddleware("admin"),
  async (req, res) => {
    try {
      const { dari, sampai } = req.query;

      let query = `
            SELECT 
                b.nama as nama_barang,
                b.satuan,
                SUM(td.jumlah) as total_qty,
                SUM(td.subtotal) as total_penjualan,
                COUNT(DISTINCT t.id) as total_transaksi
            FROM transaksi_detail td
            JOIN transaksi t ON td.transaksi_id = t.id
            JOIN barang b ON td.barang_id = b.id
            WHERE 1=1
        `;
      const params = [];

      if (dari) {
        query += " AND DATE(t.created_at) >= ?";
        params.push(dari);
      }
      if (sampai) {
        query += " AND DATE(t.created_at) <= ?";
        params.push(sampai);
      }

      query += " GROUP BY b.id ORDER BY total_penjualan DESC";

      const [rows] = await pool.query(query, params);

      return sukses(res, rows, "Laporan penjualan per barang berhasil diambil");
    } catch (err) {
      console.error("Laporan per barang error:", err);
      return error(res, "Gagal mengambil laporan per barang");
    }
  },
);

module.exports = router;
