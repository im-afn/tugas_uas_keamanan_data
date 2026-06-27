// routes/transaksi.js
const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const apiKeyMiddleware = require("../middleware/apiKey");
const authMiddleware = require("../middleware/auth");
const rbacMiddleware = require("../middleware/rbac");
const { sukses, error } = require("../utils/response");
const Transaksi = require("../models/transaksi");
const Barang = require("../models/barang");
const Log = require("../models/log");

router.use(apiKeyMiddleware);
router.use(authMiddleware);

/**
 * POST /api/transaksi
 * Membuat transaksi baru (penjualan)
 * Akses: admin, kasir
 */
router.post("/", rbacMiddleware("admin", "kasir"), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { jenis, items, pelanggan_id, uang_diterima } = req.body;

    // Validasi
    if (!jenis || !["tunai", "bon"].includes(jenis)) {
      return error(res, "Jenis transaksi tidak valid (tunai/bon)", 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return error(res, "Item transaksi tidak boleh kosong", 400);
    }

    if (jenis === "bon" && !pelanggan_id) {
      return error(res, "Transaksi bon harus menyertakan pelanggan_id", 400);
    }

    await connection.beginTransaction();

    // Generate nomor transaksi
    const noTransaksi = await Transaksi.generateNoTransaksi();

    let total = 0;
    const detailTransaksi = [];

    // Validasi setiap item dan hitung total
    for (const item of items) {
      const { barang_id, jumlah, harga_satuan } = item;

      if (!barang_id || !jumlah || jumlah <= 0 || !harga_satuan) {
        await connection.rollback();
        return error(
          res,
          "Setiap item harus memiliki barang_id, jumlah, dan harga_satuan yang valid",
          400,
        );
      }

      // Cek barang dan stok
      const barang = await Barang.findById(barang_id);
      if (!barang) {
        await connection.rollback();
        return error(res, `Barang dengan ID ${barang_id} tidak ditemukan`, 404);
      }

      if (barang.stok < jumlah) {
        await connection.rollback();
        return error(
          res,
          `Stok ${barang.nama} tidak mencukupi. Tersedia: ${barang.stok}`,
          400,
        );
      }

      const subtotal = jumlah * harga_satuan;
      total += subtotal;

      detailTransaksi.push({
        barang_id,
        nama_barang: barang.nama,
        jumlah,
        harga_satuan,
        subtotal,
      });
    }

    // Untuk tunai, validasi uang diterima
    let uangKembalian = 0;
    if (jenis === "tunai") {
      if (!uang_diterima || uang_diterima < total) {
        await connection.rollback();
        return error(
          res,
          `Uang diterima tidak mencukupi. Total: Rp ${total.toLocaleString("id-ID")}`,
          400,
        );
      }
      uangKembalian = uang_diterima - total;
    }

    // Simpan header transaksi
    const transaksiId = await Transaksi.create({
      no_transaksi: noTransaksi,
      user_id: req.user.id,
      pelanggan_id: jenis === "bon" ? pelanggan_id : null,
      jenis: jenis,
      total: total,
      uang_diterima: jenis === "tunai" ? uang_diterima : 0,
      uang_kembalian: jenis === "tunai" ? uangKembalian : 0,
      status_bon: jenis === "bon" ? "belum_lunas" : null,
    });

    // Simpan detail dan update stok
    for (const item of detailTransaksi) {
      await Transaksi.createDetail({
        transaksi_id: transaksiId,
        barang_id: item.barang_id,
        jumlah: item.jumlah,
        harga_satuan: item.harga_satuan,
        subtotal: item.subtotal,
      });

      // Kurangi stok
      await connection.query(
        "UPDATE barang SET stok = stok - ?, updated_at = NOW() WHERE id = ?",
        [item.jumlah, item.barang_id],
      );

      // Catat log stok
      await connection.query(
        "INSERT INTO log_stok (barang_id, user_id, jenis, jumlah, keterangan) VALUES (?, ?, ?, ?, ?)",
        [
          item.barang_id,
          req.user.id,
          "keluar",
          item.jumlah,
          `Penjualan #${noTransaksi}`,
        ],
      );
    }

    // Catat log aktivitas
    await Log.catatAktivitas({
      user_id: req.user.id,
      aksi: "TRANSAKSI",
      target: "transaksi",
      detail: `Transaksi ${jenis} #${noTransaksi} total Rp ${total}`,
      ip_address: req.ip,
    });

    await connection.commit();

    return sukses(
      res,
      {
        id: transaksiId,
        no_transaksi: noTransaksi,
        jenis: jenis,
        total: total,
        uang_diterima: jenis === "tunai" ? uang_diterima : null,
        uang_kembalian: jenis === "tunai" ? uangKembalian : null,
        status_bon: jenis === "bon" ? "belum_lunas" : null,
        items: detailTransaksi,
      },
      "Transaksi berhasil",
      201,
    );
  } catch (err) {
    await connection.rollback();
    console.error("Transaksi error:", err);
    return error(res, "Gagal membuat transaksi");
  } finally {
    connection.release();
  }
});

/**
 * GET /api/transaksi
 * Melihat daftar transaksi
 * Akses: admin, kasir
 */
router.get("/", rbacMiddleware("admin", "kasir"), async (req, res) => {
  try {
    const { tgl, jenis, user_id, limit } = req.query;
    const rows = await Transaksi.findAll({ tgl, jenis, user_id, limit });
    return sukses(res, rows, "Data transaksi berhasil diambil");
  } catch (err) {
    console.error("Get transaksi error:", err);
    return error(res, "Gagal mengambil data transaksi");
  }
});

/**
 * GET /api/transaksi/:id
 * Detail transaksi beserta item-nya
 * Akses: admin, kasir
 */
router.get("/:id", rbacMiddleware("admin", "kasir"), async (req, res) => {
  try {
    const { id } = req.params;

    const transaksi = await Transaksi.findById(id);
    if (!transaksi) {
      return error(res, "Transaksi tidak ditemukan", 404);
    }

    const items = await Transaksi.getDetail(id);

    const result = {
      ...transaksi,
      items: items,
    };

    return sukses(res, result, "Detail transaksi berhasil diambil");
  } catch (err) {
    console.error("Get detail transaksi error:", err);
    return error(res, "Gagal mengambil detail transaksi");
  }
});

module.exports = router;
