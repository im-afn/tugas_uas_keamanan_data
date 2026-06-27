// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Test route
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "API Toko Sembako berjalan",
    versi: "1.0.0",
  });
});

// Routes
// index.js - bagian routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/barang", require("./routes/barang"));
app.use("/api/stok", require("./routes/stok"));
app.use("/api/transaksi", require("./routes/transaksi"));
app.use("/api/laporan", require("./routes/laporan"));
app.use("/api/pelanggan", require("./routes/pelanggan"));
app.use("/api/log", require("./routes/log"));
app.use("/api/pembayaran", require("./routes/pembayaran")); // ← baru
app.use("/api/user", require("./routes/user")); // ← baru
app.use("/api/backup", require("./routes/backup")); // ← baru

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route tidak ditemukan",
  });
});

// Error handling global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Terjadi kesalahan pada server",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`📋 Mode: ${process.env.NODE_ENV || "development"}`);
});
