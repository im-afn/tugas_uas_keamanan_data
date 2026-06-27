// routes/pembayaran.js
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
 * GET /api/pembayaran/piutang
 * Melihat daftar piutang (bon belum lunas)
 * Akses: admin, kasir
 */
router.get("/piutang", rbacMiddleware("admin", "kasir"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
                t.id,
                t.no_transaksi,
                t.total,
                t.created_at,
                p.id as pelanggan_id,
                p.nama as pelanggan,
                p.no_hp,
                DATEDIFF(NOW(), t.created_at) as umur_hari
            FROM transaksi t
            JOIN pelanggan p ON t.pelanggan_id = p.id
            WHERE t.jenis = 'bon' AND t.status_bon = 'belum_lunas'
            ORDER BY t.created_at ASC`,
    );

    const totalPiutang = rows.reduce(
      (sum, row) => sum + parseFloat(row.total),
      0,
    );

    return sukses(
      res,
      {
        total_piutang: totalPiutang,
        total_bon: rows.length,
        detail: rows,
      },
      "Data piutang berhasil diambil",
    );
  } catch (err) {
    console.error("Get piutang error:", err);
    return error(res, "Gagal mengambil data piutang");
  }
});

/**
 * POST /api/pembayaran/lunasi/:id
 * Melunasi bon berdasarkan ID transaksi
 * Akses: admin, kasir
 */
router.post(
  "/lunasi/:id",
  rbacMiddleware("admin", "kasir"),
  async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { id } = req.params;

      // Cek transaksi
      const [transaksi] = await connection.query(
        "SELECT * FROM transaksi WHERE id = ? AND jenis = ? AND status_bon = ?",
        [id, "bon", "belum_lunas"],
      );

      if (transaksi.length === 0) {
        return error(
          res,
          "Transaksi bon tidak ditemukan atau sudah lunas",
          404,
        );
      }

      await connection.beginTransaction();

      // Update status bon
      await connection.query(
        "UPDATE transaksi SET status_bon = ?, uang_diterima = ?, uang_kembalian = ? WHERE id = ?",
        ["lunas", transaksi[0].total, 0, id],
      );

      // Catat log aktivitas
      await connection.query(
        "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
        [
          req.user.id,
          "PELUNASAN",
          "transaksi",
          `Pelunasan bon #${transaksi[0].no_transaksi} oleh ${transaksi[0].pelanggan_id ? "(pelanggan)" : ""} Rp ${transaksi[0].total}`,
          req.ip,
        ],
      );

      await connection.commit();

      return sukses(
        res,
        {
          no_transaksi: transaksi[0].no_transaksi,
          total: transaksi[0].total,
          status: "lunas",
        },
        "Pembayaran berhasil",
      );
    } catch (err) {
      await connection.rollback();
      console.error("Pelunasan error:", err);
      return error(res, "Gagal melakukan pelunasan");
    } finally {
      connection.release();
    }
  },
);

module.exports = router;
