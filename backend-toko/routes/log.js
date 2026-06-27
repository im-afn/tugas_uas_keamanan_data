// routes/log.js
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
 * GET /api/log/aktivitas
 * Melihat log aktivitas
 * Akses: admin only
 */
router.get("/aktivitas", rbacMiddleware("admin"), async (req, res) => {
  try {
    const { limit, user_id } = req.query;

    let query = `
            SELECT 
                l.id,
                l.aksi,
                l.target,
                l.detail,
                l.ip_address,
                l.created_at,
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
    return sukses(res, rows, "Log aktivitas berhasil diambil");
  } catch (err) {
    console.error("Get log aktivitas error:", err);
    return error(res, "Gagal mengambil log aktivitas");
  }
});

module.exports = router;
