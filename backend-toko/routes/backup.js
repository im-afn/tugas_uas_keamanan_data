// routes/backup.js
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
 * POST /api/backup/transaksi
 * Backup data transaksi ke server ini
 * Akses: admin only
 */
router.post("/transaksi", rbacMiddleware("admin"), async (req, res) => {
  try {
    const { nama_backup, dtx } = req.body;

    if (!dtx) {
      return error(res, "Data backup tidak ditemukan", 400);
    }

    // Decode base64
    const decoded = Buffer.from(dtx, "base64").toString("utf-8");
    const rows = decoded.split("#").filter((row) => row.trim() !== "");

    let berhasil = 0;
    let gagal = 0;

    for (const row of rows) {
      const [id, deskripsi, waktu, nominal, jenis] = row.split("|");

      try {
        // Cek apakah sudah ada (berdasarkan id lama)
        const [existing] = await pool.query(
          "SELECT id FROM transaksi WHERE no_transaksi = ?",
          [`TRX-BACKUP-${id}`],
        );

        if (existing.length === 0) {
          await pool.query(
            `INSERT INTO transaksi (no_transaksi, user_id, jenis, total, created_at) 
                        VALUES (?, ?, ?, ?, ?)`,
            [
              `TRX-BACKUP-${id}`,
              req.user.id,
              jenis || "tunai",
              parseFloat(nominal) || 0,
              waktu,
            ],
          );
          berhasil++;
        } else {
          gagal++;
        }
      } catch (err) {
        gagal++;
      }
    }

    // Catat log
    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "BACKUP",
        "transaksi",
        `Backup ${nama_backup || "tanpa nama"}: ${berhasil} berhasil, ${gagal} gagal`,
        req.ip,
      ],
    );

    return sukses(
      res,
      {
        nama_backup: nama_backup,
        berhasil: berhasil,
        gagal: gagal,
        total: rows.length,
      },
      "Backup selesai",
    );
  } catch (err) {
    console.error("Backup error:", err);
    return error(res, "Gagal melakukan backup");
  }
});

/**
 * GET /api/backup/export
 * Export semua data transaksi (untuk restore)
 * Akses: admin only
 */
router.get("/export", rbacMiddleware("admin"), async (req, res) => {
  try {
    const [transaksi] = await pool.query(
      `SELECT t.id, t.no_transaksi, t.jenis, t.total, t.status_bon, t.created_at,
            u.nama_lengkap as kasir, p.nama as pelanggan
            FROM transaksi t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN pelanggan p ON t.pelanggan_id = p.id
            ORDER BY t.id ASC`,
    );

    // Format seperti data dari frontend
    const exportData = transaksi.map((t) => ({
      id: t.id,
      no_transaksi: t.no_transaksi,
      jenis: t.jenis,
      total: t.total,
      status_bon: t.status_bon,
      waktu: t.created_at,
      kasir: t.kasir,
      pelanggan: t.pelanggan,
    }));

    return sukses(res, exportData, "Data export berhasil diambil");
  } catch (err) {
    console.error("Export error:", err);
    return error(res, "Gagal mengexport data");
  }
});

module.exports = router;
