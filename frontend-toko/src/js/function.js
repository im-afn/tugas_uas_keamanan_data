// src/js/function.js

/**
 * Format tanggal: "Senin, 25 Juni 2026"
 */
const formatTanggal = (tanggal) => {
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const bulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const tgl = tanggal ? new Date(tanggal) : new Date();
  return `${hari[tgl.getDay()]}, ${tgl.getDate()} ${bulan[tgl.getMonth()]} ${tgl.getFullYear()}`;
};

/**
 * Format jam: "14:30:25"
 */
const formatJam = (tanggal) => {
  const tgl = tanggal ? new Date(tanggal) : new Date();
  const jam = String(tgl.getHours()).padStart(2, "0");
  const menit = String(tgl.getMinutes()).padStart(2, "0");
  const detik = String(tgl.getSeconds()).padStart(2, "0");
  return `${jam}:${menit}:${detik}`;
};

/**
 * Format tanggal dan jam lengkap
 */
const waktuSekarang = () => {
  const sekarang = new Date();
  return `${formatTanggal(sekarang)}<br/>${formatJam(sekarang)}`;
};

/**
 * Format rupiah
 */
const formatRupiah = (angka) => {
  if (angka === null || angka === undefined) return "Rp 0";
  return "Rp " + Number(angka).toLocaleString("id-ID");
};

/**
 * Format angka saja (tanpa Rp)
 */
const formatAngka = (angka) => {
  if (angka === null || angka === undefined) return "0";
  return Number(angka).toLocaleString("id-ID");
};

/**
 * Parse rupiah ke number
 */
const parseRupiah = (rupiah) => {
  if (!rupiah) return 0;
  return parseInt(rupiah.replace(/[^0-9]/g, "")) || 0;
};

/**
 * Senter (flashlight)
 */
const senter = () => {
  try {
    if (window.Flashlight) {
      window.Flashlight.toggle();
    }
  } catch (err) {
    console.log("Senter tidak tersedia");
  }
};

/**
 * Validasi email
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validasi nomor HP
 */
const isValidPhone = (phone) => {
  const re = /^[0-9]{10,13}$/;
  return re.test(phone);
};

/**
 * Potong teks
 */
const truncate = (text, length = 50) => {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
};

export {
  formatTanggal,
  formatJam,
  waktuSekarang,
  formatRupiah,
  formatAngka,
  parseRupiah,
  senter,
  isValidEmail,
  isValidPhone,
  truncate,
};
