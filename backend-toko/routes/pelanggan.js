// routes/pelanggan.js
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
 * GET /api/pelanggan
 * Mendapatkan semua pelanggan
 * Akses: admin, kasir
 */
router.get("/", rbacMiddleware("admin", "kasir"), async (req, res) => {
  try {
    const { search } = req.query;

    let query = "SELECT * FROM pelanggan WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (nama LIKE ? OR no_hp LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY nama ASC";

    const [rows] = await pool.query(query, params);

    // Tambahkan info piutang per pelanggan
    for (const pelanggan of rows) {
      const [piutang] = await pool.query(
        `SELECT 
                    COALESCE(SUM(total), 0) as total_piutang,
                    COUNT(*) as total_bon
                FROM transaksi 
                WHERE pelanggan_id = ? AND jenis = 'bon' AND status_bon = 'belum_lunas'`,
        [pelanggan.id],
      );
      pelanggan.total_piutang = piutang[0].total_piutang;
      pelanggan.total_bon_belum_lunas = piutang[0].total_bon;
    }

    return sukses(res, rows, "Data pelanggan berhasil diambil");
  } catch (err) {
    console.error("Get pelanggan error:", err);
    return error(res, "Gagal mengambil data pelanggan");
  }
});

/**
 * GET /api/pelanggan/:id
 * Detail pelanggan beserta riwayat transaksinya
 * Akses: admin, kasir
 */
router.get("/:id", rbacMiddleware("admin", "kasir"), async (req, res) => {
  try {
    const { id } = req.params;

    const [pelanggan] = await pool.query(
      "SELECT * FROM pelanggan WHERE id = ?",
      [id],
    );
    if (pelanggan.length === 0) {
      return error(res, "Pelanggan tidak ditemukan", 404);
    }

    // Riwayat transaksi bon
    const [transaksi] = await pool.query(
      `SELECT 
                id,
                no_transaksi,
                total,
                status_bon,
                created_at
            FROM transaksi 
            WHERE pelanggan_id = ? 
            ORDER BY created_at DESC`,
      [id],
    );

    // Total piutang
    const [piutang] = await pool.query(
      `SELECT 
                COALESCE(SUM(total), 0) as total_piutang,
                COUNT(*) as total_bon
            FROM transaksi 
            WHERE pelanggan_id = ? AND jenis = 'bon' AND status_bon = 'belum_lunas'`,
      [id],
    );

    return sukses(
      res,
      {
        ...pelanggan[0],
        total_piutang: piutang[0].total_piutang,
        total_bon_belum_lunas: piutang[0].total_bon,
        riwayat_transaksi: transaksi,
      },
      "Detail pelanggan berhasil diambil",
    );
  } catch (err) {
    console.error("Get detail pelanggan error:", err);
    return error(res, "Gagal mengambil detail pelanggan");
  }
});

/**
 * POST /api/pelanggan
 * Menambah pelanggan baru
 * Akses: admin, kasir
 */
router.post("/", rbacMiddleware("admin", "kasir"), async (req, res) => {
  try {
    const { nama, no_hp, alamat } = req.body;

    if (!nama) {
      return error(res, "Nama pelanggan wajib diisi", 400);
    }

    const [result] = await pool.query(
      "INSERT INTO pelanggan (nama, no_hp, alamat) VALUES (?, ?, ?)",
      [nama, no_hp || null, alamat || null],
    );

    // Catat log
    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "CREATE",
        "pelanggan",
        `Menambah pelanggan: ${nama}`,
        req.ip,
      ],
    );

    return sukses(
      res,
      { id: result.insertId },
      "Pelanggan berhasil ditambahkan",
      201,
    );
  } catch (err) {
    console.error("Create pelanggan error:", err);
    return error(res, "Gagal menambah pelanggan");
  }
});

/**
 * PUT /api/pelanggan/:id
 * Mengupdate pelanggan
 * Akses: admin, kasir
 */
router.put("/:id", rbacMiddleware("admin", "kasir"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, no_hp, alamat } = req.body;

    const [existing] = await pool.query(
      "SELECT * FROM pelanggan WHERE id = ?",
      [id],
    );
    if (existing.length === 0) {
      return error(res, "Pelanggan tidak ditemukan", 404);
    }

    await pool.query(
      "UPDATE pelanggan SET nama = ?, no_hp = ?, alamat = ? WHERE id = ?",
      [
        nama || existing[0].nama,
        no_hp !== undefined ? no_hp : existing[0].no_hp,
        alamat !== undefined ? alamat : existing[0].alamat,
        id,
      ],
    );

    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "UPDATE",
        "pelanggan",
        `Mengupdate pelanggan: ${nama || existing[0].nama}`,
        req.ip,
      ],
    );

    return sukses(res, null, "Pelanggan berhasil diupdate");
  } catch (err) {
    console.error("Update pelanggan error:", err);
    return error(res, "Gagal mengupdate pelanggan");
  }
});

/**
 * DELETE /api/pelanggan/:id
 * Menghapus pelanggan
 * Akses: admin only
 */
router.delete("/:id", rbacMiddleware("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      "SELECT * FROM pelanggan WHERE id = ?",
      [id],
    );
    if (existing.length === 0) {
      return error(res, "Pelanggan tidak ditemukan", 404);
    }

    // Cek apakah pelanggan memiliki riwayat transaksi
    const [cekTransaksi] = await pool.query(
      "SELECT COUNT(*) as count FROM transaksi WHERE pelanggan_id = ?",
      [id],
    );
    if (cekTransaksi[0].count > 0) {
      return error(
        res,
        "Pelanggan tidak bisa dihapus karena memiliki riwayat transaksi",
        400,
      );
    }

    await pool.query("DELETE FROM pelanggan WHERE id = ?", [id]);

    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "DELETE",
        "pelanggan",
        `Menghapus pelanggan: ${existing[0].nama}`,
        req.ip,
      ],
    );

    return sukses(res, null, "Pelanggan berhasil dihapus");
  } catch (err) {
    console.error("Delete pelanggan error:", err);
    return error(res, "Gagal menghapus pelanggan");
  }
});

module.exports = router;
