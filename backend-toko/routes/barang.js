// routes/barang.js
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
 * GET /api/barang
 * Mendapatkan semua barang (dengan filter search & stok menipis)
 * Akses: admin, gudang, kasir
 */
router.get("/", async (req, res) => {
  try {
    const { search, stok_menipis } = req.query;

    let query =
      "SELECT id, kode, nama, satuan, harga_modal, harga_jual, stok, stok_minimal FROM barang WHERE 1=1";
    const params = [];

    // Filter pencarian
    if (search) {
      query += " AND (nama LIKE ? OR kode LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Filter stok menipis
    if (stok_menipis === "true") {
      query += " AND stok <= stok_minimal";
    }

    query += " ORDER BY nama ASC";

    const [rows] = await pool.query(query, params);

    // Jika yang akses kasir, sembunyikan harga_modal
    if (req.user.role === "kasir") {
      const dataKasir = rows.map((item) => ({
        id: item.id,
        kode: item.kode,
        nama: item.nama,
        satuan: item.satuan,
        harga_jual: item.harga_jual,
        stok: item.stok,
        stok_minimal: item.stok_minimal,
      }));
      return sukses(res, dataKasir, "Data barang berhasil diambil");
    }

    return sukses(res, rows, "Data barang berhasil diambil");
  } catch (err) {
    console.error("Get barang error:", err);
    return error(res, "Gagal mengambil data barang");
  }
});

/**
 * GET /api/barang/:id
 * Mendapatkan detail satu barang
 * Akses: admin, gudang, kasir
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT id, kode, nama, satuan, harga_modal, harga_jual, stok, stok_minimal, created_at, updated_at FROM barang WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return error(res, "Barang tidak ditemukan", 404);
    }

    const barang = rows[0];

    // Jika kasir, sembunyikan harga_modal
    if (req.user.role === "kasir") {
      delete barang.harga_modal;
    }

    return sukses(res, barang, "Detail barang berhasil diambil");
  } catch (err) {
    console.error("Get detail barang error:", err);
    return error(res, "Gagal mengambil detail barang");
  }
});

/**
 * POST /api/barang
 * Menambah barang baru
 * Akses: admin, gudang
 */
router.post("/", rbacMiddleware("admin", "gudang"), async (req, res) => {
  try {
    const { kode, nama, satuan, harga_modal, harga_jual, stok, stok_minimal } =
      req.body;

    // Validasi input
    if (!kode || !nama) {
      return error(res, "Kode dan nama barang wajib diisi", 400);
    }

    // Cek kode unik
    const [existing] = await pool.query(
      "SELECT id FROM barang WHERE kode = ?",
      [kode],
    );
    if (existing.length > 0) {
      return error(res, "Kode barang sudah digunakan", 400);
    }

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

    // Catat log
    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "CREATE",
        "barang",
        `Menambah barang: ${nama} (${kode})`,
        req.ip,
      ],
    );

    // Catat log stok awal jika stok > 0
    if (stok && stok > 0) {
      await pool.query(
        "INSERT INTO log_stok (barang_id, user_id, jenis, jumlah, keterangan) VALUES (?, ?, ?, ?, ?)",
        [result.insertId, req.user.id, "masuk", stok, "Stok awal"],
      );
    }

    return sukses(
      res,
      { id: result.insertId },
      "Barang berhasil ditambahkan",
      201,
    );
  } catch (err) {
    console.error("Create barang error:", err);
    return error(res, "Gagal menambah barang");
  }
});

/**
 * PUT /api/barang/:id
 * Mengupdate barang
 * Akses: admin, gudang
 */
router.put("/:id", rbacMiddleware("admin", "gudang"), async (req, res) => {
  try {
    const { id } = req.params;
    const { kode, nama, satuan, harga_modal, harga_jual, stok_minimal } =
      req.body;

    // Cek barang ada
    const [existing] = await pool.query("SELECT * FROM barang WHERE id = ?", [
      id,
    ]);
    if (existing.length === 0) {
      return error(res, "Barang tidak ditemukan", 404);
    }

    // Cek kode unik (kalau diubah)
    if (kode && kode !== existing[0].kode) {
      const [cekKode] = await pool.query(
        "SELECT id FROM barang WHERE kode = ? AND id != ?",
        [kode, id],
      );
      if (cekKode.length > 0) {
        return error(res, "Kode barang sudah digunakan", 400);
      }
    }

    await pool.query(
      "UPDATE barang SET kode = ?, nama = ?, satuan = ?, harga_modal = ?, harga_jual = ?, stok_minimal = ? WHERE id = ?",
      [
        kode || existing[0].kode,
        nama || existing[0].nama,
        satuan || existing[0].satuan,
        harga_modal !== undefined ? harga_modal : existing[0].harga_modal,
        harga_jual !== undefined ? harga_jual : existing[0].harga_jual,
        stok_minimal || existing[0].stok_minimal,
        id,
      ],
    );

    // Catat log
    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "UPDATE",
        "barang",
        `Mengupdate barang: ${nama || existing[0].nama}`,
        req.ip,
      ],
    );

    return sukses(res, null, "Barang berhasil diupdate");
  } catch (err) {
    console.error("Update barang error:", err);
    return error(res, "Gagal mengupdate barang");
  }
});

/**
 * DELETE /api/barang/:id
 * Menghapus barang
 * Akses: admin only
 */
router.delete("/:id", rbacMiddleware("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query("SELECT * FROM barang WHERE id = ?", [
      id,
    ]);
    if (existing.length === 0) {
      return error(res, "Barang tidak ditemukan", 404);
    }

    // Cek apakah barang sudah ada di transaksi
    const [cekTransaksi] = await pool.query(
      "SELECT COUNT(*) as count FROM transaksi_detail WHERE barang_id = ?",
      [id],
    );
    if (cekTransaksi[0].count > 0) {
      return error(
        res,
        "Barang tidak bisa dihapus karena sudah ada di transaksi",
        400,
      );
    }

    await pool.query("DELETE FROM barang WHERE id = ?", [id]);

    // Catat log
    await pool.query(
      "INSERT INTO log_aktivitas (user_id, aksi, target, detail, ip_address) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "DELETE",
        "barang",
        `Menghapus barang: ${existing[0].nama}`,
        req.ip,
      ],
    );

    return sukses(res, null, "Barang berhasil dihapus");
  } catch (err) {
    console.error("Delete barang error:", err);
    return error(res, "Gagal menghapus barang");
  }
});

module.exports = router;
