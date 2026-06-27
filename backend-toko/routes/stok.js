// routes/stok.js
const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const apiKeyMiddleware = require("../middleware/apiKey");
const authMiddleware = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const { sukses, error } = require("../utils/response");
const Log = require("../models/log");
const Barang = require("../models/barang");

router.use(apiKeyMiddleware);
router.use(authMiddleware);

/**
 * GET /api/stok/log
 * Melihat riwayat log stok
 * Akses: admin, gudang
 */
router.get("/log", rbacMiddleware("admin", "gudang"), async (req, res) => {
  try {
    const { barang_id, jenis, limit } = req.query;
    const rows = await Log.getStok({ barang_id, jenis, limit });
    return sukses(res, rows, "Log stok berhasil diambil");
  } catch (err) {
    console.error("Get log stok error:", err);
    return error(res, "Gagal mengambil log stok");
  }
});

/**
 * POST /api/stok/masuk
 * Input barang masuk (dari supplier)
 * Akses: admin, gudang
 */
router.post("/masuk", rbacMiddleware("admin", "gudang"), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return error(res, "Data barang masuk tidak valid", 400);
    }

    await connection.beginTransaction();

    for (const item of items) {
      const { barang_id, jumlah, harga_modal, keterangan } = item;

      if (!barang_id || !jumlah || jumlah <= 0) {
        await connection.rollback();
        return error(
          res,
          "Setiap item harus memiliki barang_id dan jumlah yang valid",
          400,
        );
      }

      // Cek barang ada
      const barang = await Barang.findById(barang_id);
      if (!barang) {
        await connection.rollback();
        return error(res, `Barang dengan ID ${barang_id} tidak ditemukan`, 404);
      }

      // Update stok
      await connection.query(
        "UPDATE barang SET stok = stok + ?, updated_at = NOW() WHERE id = ?",
        [jumlah, barang_id],
      );

      // Update harga modal jika ada
      if (harga_modal) {
        await connection.query(
          "UPDATE barang SET harga_modal = ?, updated_at = NOW() WHERE id = ?",
          [harga_modal, barang_id],
        );
      }

      // Catat log stok
      await connection.query(
        "INSERT INTO log_stok (barang_id, user_id, jenis, jumlah, keterangan) VALUES (?, ?, ?, ?, ?)",
        [
          barang_id,
          req.user.id,
          "masuk",
          jumlah,
          keterangan || "Barang masuk dari supplier",
        ],
      );
    }

    // Catat log aktivitas
    await Log.catatAktivitas({
      user_id: req.user.id,
      aksi: "BARANG_MASUK",
      target: "stok",
      detail: `Input ${items.length} item barang masuk`,
      ip_address: req.ip,
    });

    await connection.commit();

    return sukses(res, null, "Barang masuk berhasil dicatat", 201);
  } catch (err) {
    await connection.rollback();
    console.error("Barang masuk error:", err);
    return error(res, "Gagal mencatat barang masuk");
  } finally {
    connection.release();
  }
});

/**
 * POST /api/stok/opname
 * Koreksi stok (stok opname)
 * Akses: admin, gudang
 */
router.post("/opname", rbacMiddleware("admin", "gudang"), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { barang_id, stok_aktual, keterangan } = req.body;

    if (!barang_id || stok_aktual === undefined || stok_aktual === null) {
      return error(res, "Barang ID dan stok aktual wajib diisi", 400);
    }

    const barang = await Barang.findById(barang_id);
    if (!barang) {
      return error(res, "Barang tidak ditemukan", 404);
    }

    const stokLama = barang.stok;
    const selisih = stok_aktual - stokLama;

    if (selisih === 0) {
      return error(res, "Tidak ada perubahan stok", 400);
    }

    await connection.beginTransaction();

    // Update stok
    await connection.query(
      "UPDATE barang SET stok = ?, updated_at = NOW() WHERE id = ?",
      [stok_aktual, barang_id],
    );

    // Catat log stok
    await connection.query(
      "INSERT INTO log_stok (barang_id, user_id, jenis, jumlah, keterangan) VALUES (?, ?, ?, ?, ?)",
      [
        barang_id,
        req.user.id,
        "opname",
        Math.abs(selisih),
        keterangan ||
          `Stok opname: ${stokLama} -> ${stok_aktual} (selisih: ${selisih > 0 ? "+" : ""}${selisih})`,
      ],
    );

    // Catat log aktivitas
    await Log.catatAktivitas({
      user_id: req.user.id,
      aksi: "STOK_OPNAME",
      target: "stok",
      detail: `Opname ${barang.nama}: ${stokLama} -> ${stok_aktual}`,
      ip_address: req.ip,
    });

    await connection.commit();

    return sukses(
      res,
      {
        barang: barang.nama,
        stok_lama: stokLama,
        stok_baru: stok_aktual,
        selisih: selisih,
      },
      "Stok opname berhasil",
    );
  } catch (err) {
    await connection.rollback();
    console.error("Stok opname error:", err);
    return error(res, "Gagal melakukan stok opname");
  } finally {
    connection.release();
  }
});

/**
 * GET /api/stok/menipis
 * Mendapatkan daftar barang dengan stok menipis
 * Akses: semua role
 */
router.get("/menipis", async (req, res) => {
  try {
    const rows = await Barang.getStokMenipis();

    const ringkasan = {
      total_menipis: rows.length,
      habis: rows.filter((r) => r.stok === 0).length,
      menipis: rows.filter((r) => r.stok > 0).length,
      items: rows,
    };

    return sukses(res, ringkasan, "Data stok menipis berhasil diambil");
  } catch (err) {
    console.error("Get stok menipis error:", err);
    return error(res, "Gagal mengambil data stok menipis");
  }
});

module.exports = router;
