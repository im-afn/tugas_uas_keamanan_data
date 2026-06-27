// routes/user.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const apiKeyMiddleware = require("../middleware/apiKey");
const authMiddleware = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const { sukses, error } = require("../utils/response");

router.use(apiKeyMiddleware);
router.use(authMiddleware);

/**
 * GET /api/user
 * Mendapatkan semua user (khusus admin)
 */
router.get("/", rbacMiddleware("admin"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, nama_lengkap, role, aktif, created_at FROM users ORDER BY id ASC",
    );
    return sukses(res, rows, "Data user berhasil diambil");
  } catch (err) {
    console.error("Get users error:", err);
    return error(res, "Gagal mengambil data user");
  }
});

/**
 * POST /api/user
 * Menambah user baru (khusus admin)
 */
router.post("/", rbacMiddleware("admin"), async (req, res) => {
  try {
    const { username, password, nama_lengkap, role } = req.body;

    if (!username || !password || !nama_lengkap || !role) {
      return error(
        res,
        "Semua field wajib diisi (username, password, nama_lengkap, role)",
        400,
      );
    }

    if (!["admin", "kasir", "gudang"].includes(role)) {
      return error(res, "Role tidak valid (admin/kasir/gudang)", 400);
    }

    // Cek username unik
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );
    if (existing.length > 0) {
      return error(res, "Username sudah digunakan", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, nama_lengkap, role],
    );

    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "CREATE_USER",
        "users",
        `Menambah user: ${username} (${role})`,
        req.ip,
      ],
    );

    return sukses(
      res,
      { id: result.insertId },
      "User berhasil ditambahkan",
      201,
    );
  } catch (err) {
    console.error("Create user error:", err);
    return error(res, "Gagal menambah user");
  }
});

/**
 * PUT /api/user/:id
 * Update user (khusus admin)
 */
router.put("/:id", rbacMiddleware("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, nama_lengkap, role, aktif } = req.body;

    const [existing] = await pool.query("SELECT * FROM users WHERE id = ?", [
      id,
    ]);
    if (existing.length === 0) {
      return error(res, "User tidak ditemukan", 404);
    }

    // Cek username unik kalau diubah
    if (username && username !== existing[0].username) {
      const [cekUsername] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [username, id],
      );
      if (cekUsername.length > 0) {
        return error(res, "Username sudah digunakan", 400);
      }
    }

    await pool.query(
      "UPDATE users SET username = ?, nama_lengkap = ?, role = ?, aktif = ? WHERE id = ?",
      [
        username || existing[0].username,
        nama_lengkap || existing[0].nama_lengkap,
        role || existing[0].role,
        aktif !== undefined ? aktif : existing[0].aktif,
        id,
      ],
    );

    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, "UPDATE_USER", "users", `Mengupdate user ID ${id}`, req.ip],
    );

    return sukses(res, null, "User berhasil diupdate");
  } catch (err) {
    console.error("Update user error:", err);
    return error(res, "Gagal mengupdate user");
  }
});

/**
 * PUT /api/user/password/ubah
 * Ganti password sendiri (semua role)
 */
router.put("/password/ubah", async (req, res) => {
  try {
    const { password_lama, password_baru } = req.body;

    if (!password_lama || !password_baru) {
      return error(res, "Password lama dan baru wajib diisi", 400);
    }

    if (password_baru.length < 6) {
      return error(res, "Password baru minimal 6 karakter", 400);
    }

    // Cek password lama
    const [user] = await pool.query("SELECT password FROM users WHERE id = ?", [
      req.user.id,
    ]);
    const valid = await bcrypt.compare(password_lama, user[0].password);
    if (!valid) {
      return error(res, "Password lama salah", 400);
    }

    const hashedPassword = await bcrypt.hash(password_baru, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      req.user.id,
    ]);

    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, "UBAH_PASSWORD", "users", "Mengubah password", req.ip],
    );

    return sukses(res, null, "Password berhasil diubah");
  } catch (err) {
    console.error("Ubah password error:", err);
    return error(res, "Gagal mengubah password");
  }
});

module.exports = router;
