// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const apiKeyMiddleware = require("../middleware/apiKey");
const authMiddleware = require("../middleware/auth");
const { sukses, error } = require("../utils/response");

router.use(apiKeyMiddleware);

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return error(res, "Username dan password wajib diisi", 400);
    }

    const [rows] = await pool.query(
      "SELECT id, username, password, nama_lengkap, role, aktif FROM users WHERE username = ?",
      [username],
    );

    if (rows.length === 0) {
      return error(res, "Username atau password salah", 401);
    }

    const user = rows[0];

    if (!user.aktif) {
      return error(res, "Akun tidak aktif. Hubungi pemilik.", 403);
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return error(res, "Username atau password salah", 401);
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
    );

    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [user.id, "LOGIN", "users", `User ${user.username} login`, req.ip],
    );

    return sukses(
      res,
      {
        token: token,
        user: {
          id: user.id,
          username: user.username,
          nama_lengkap: user.nama_lengkap,
          role: user.role,
        },
      },
      "Login berhasil",
    );
  } catch (err) {
    console.error("Login error:", err);
    return error(res, "Gagal melakukan login");
  }
});

/**
 * GET /api/auth/me
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, nama_lengkap, role FROM users WHERE id = ?",
      [req.user.id],
    );

    if (rows.length === 0) {
      return error(res, "User tidak ditemukan", 404);
    }

    return sukses(res, rows[0], "Data user berhasil diambil");
  } catch (err) {
    console.error("Get user error:", err);
    return error(res, "Gagal mengambil data user");
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "LOGOUT",
        "users",
        `User ${req.user.username} logout`,
        req.ip,
      ],
    );

    return sukses(res, null, "Logout berhasil");
  } catch (err) {
    console.error("Logout error:", err);
    return error(res, "Gagal melakukan logout");
  }
});

module.exports = router;
