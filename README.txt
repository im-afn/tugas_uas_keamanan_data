================================================================================
                    LAPORAN KEAMANAN APLIKASI BERKAHPOS
                          Versi 1.0.0
================================================================================

A. ARSITEKTUR SISTEM
================================================================================

Aplikasi BerkahPOS terdiri dari 3 komponen utama:

  1. Frontend    : Framework7 + Capacitor (Android APK)
  2. Backend     : Node.js + Express (REST API)
  3. Database    : MySQL/MariaDB

Alur komunikasi:
  [APK Android] <--> [REST API Node.js] <--> [Database MySQL]
       |                    |
  HTTPS + JWT         Validasi + RBAC


B. LAPISAN KEAMANAN (DEFENSE IN DEPTH)
================================================================================

1. KEAMANAN TRANSPORT (HTTPS)
   - Semua komunikasi antara APK dan server menggunakan HTTPS
   - Mencegah sniffing dan man-in-the-middle (MITM) attack
   - API Key ditanam di header setiap request

2. OTENTIKASI (AUTHENTICATION)
   - JSON Web Token (JWT) untuk session management
   - Token memiliki masa expired (24 jam)
   - Password di-hash menggunakan bcrypt (10 salt rounds)
   - Token disimpan di localStorage (dev) / Capacitor Preferences (production)
   - SEMUA user default memiliki password yang SAMA: "password123"
   - Peringatan keamanan: Password default WAJIB diganti setelah instalasi

3. OTORISASI (AUTHORIZATION)
   - Role-Based Access Control (RBAC) dengan 3 peran:
     a. Admin   : Akses penuh ke semua fitur
     b. Kasir   : Hanya transaksi penjualan & pelanggan
     c. Gudang  : Hanya manajemen stok & barang
   - Pengecekan role dilakukan di SERVER (bukan di frontend)
   - Setiap route memiliki middleware RBAC

4. KEAMANAN API
   - API Key wajib di setiap request (X-API-Key header)
   - Rate Limiting untuk mencegah brute force
   - Input validation menggunakan library Joi
   - SQL Injection dicegah dengan parameterized queries

5. KEAMANAN APLIKASI ANDROID
   - Aplikasi hanya berjalan di Android (tidak iOS)
   - Capacitor menyediakan secure storage untuk token
   - Certificate pinning bisa ditambahkan untuk mencegah MITM

6. AUDIT TRAIL
   - Setiap aksi penting dicatat di log_aktivitas
   - Login, logout, transaksi, hapus data tercatat
   - Log mencatat: siapa, aksi apa, target, kapan, IP address
   - Log hanya bisa dibaca oleh Admin, tidak bisa diedit/dihapus


C. KEAMANAN LOGIN
================================================================================

1. MEKANISME LOGIN
   - User memasukkan username dan password di aplikasi Android
   - Password dikirim via HTTPS ke server (POST /api/auth/login)
   - Server memverifikasi password dengan bcrypt.compare()
   - Jika valid, server mengembalikan JWT token
   - Token disimpan di localStorage/Capacitor Preferences
   - Token dikirim di header Authorization untuk setiap request berikutnya

2. KEBIJAKAN PASSWORD DEFAULT
   - SEMUA user default menggunakan password yang SAMA: "password123"
   - Ini adalah RESIKO KEAMANAN TINGGI
   - WAJIB diubah setelah instalasi pertama
   - Admin dapat mengubah password via menu Pengaturan > Ubah Password
   - Admin dapat menambah/menonaktifkan user via menu Manajemen User

3. PENCEGAHAN SERANGAN LOGIN
   - Rate limiting mencegah brute force (5 percobaan per menit)
   - Password di-hash sehingga tidak terbaca di database
   - Tidak ada pesan spesifik "username tidak ditemukan" (hindari enumeration)
   - Session expired setelah 24 jam (JWT expired)
   - Login tercatat di audit trail (log_aktivitas)

4. PASSWORD REQUIREMENTS
   - Password minimal 6 karakter
   - Disimpan dengan bcrypt (10 salt rounds)
   - Tidak ada batasan karakter khusus (untuk memudahkan karyawan)
   - Fitur ubah password tersedia untuk semua user


D. DATABASE & DATA
================================================================================

  1. Password user di-hash (bcrypt), tidak disimpan plaintext
  2. Database terpisah dari aplikasi
  3. Backup dan restore data tersedia
  4. Foreign key constraints menjaga integritas data
  5. Transaksi database menggunakan BEGIN/COMMIT/ROLLBACK


E. PENCEGAHAN SERANGAN UMUM
================================================================================

  Serangan             | Status | Keterangan
  ---------------------|--------|----------------------------------
  SQL Injection        | AMAN   | Parameterized queries
  XSS                  | AMAN   | Framework7 auto-escape
  CSRF                 | AMAN   | JWT token di header
  Brute Force          | AMAN   | Rate limiting + bcrypt
  Man-in-the-Middle    | AMAN   | HTTPS + API Key
  Session Hijacking    | AMAN   | JWT expired + HTTPS
  Privilege Escalation | AMAN   | RBAC di server-side
  Data Tampering       | AMAN   | Validasi input + audit trail
  Password Spraying    | AMAN   | Rate limiting per IP


F. USER DEFAULT
================================================================================

  Username  | Password      | Role   | Nama
  ----------|---------------|--------|--------------
  admin     | password123   | admin  | Pemilik Toko
  kasir1    | password123   | kasir  | Budi
  gudang1   | password123   | gudang | Anton

  ⚠ PERINGATAN KEAMANAN:
  - Semua user memiliki password yang SAMA
  - Password default HARUS diganti setelah instalasi pertama
  - Gunakan password yang berbeda untuk setiap user
  - Jangan bagikan password antar karyawan
  - Nonaktifkan user yang sudah tidak bekerja


G. REKOMENDASI PRODUCTION
================================================================================

  1. Ganti JWT_SECRET dengan string acak panjang (minimal 32 karakter)
  2. Ganti API_KEY dengan string unik
  3. Ganti password default SEMUA user dengan password berbeda
  4. Aktifkan HTTPS dengan SSL certificate yang valid
  5. Gunakan environment variable untuk semua secret
  6. Jangan commit file .env ke repository
  7. Batasi akses database hanya dari IP server
  8. Rutin backup database (fitur backup sudah tersedia)
  9. Update dependencies secara berkala (npm audit)
  10. Gunakan Capacitor Preferences (bukan localStorage) untuk production
  11. Tambahkan fitur force-change password untuk first login
  12. Terapkan password complexity minimal (panjang, huruf+angka)


H. KESIMPULAN
================================================================================

Aplikasi BerkahPOS telah mengimplementasikan keamanan berlapis
(Defense in Depth) mulai dari transport layer, authentication,
authorization, input validation, hingga audit trail.

CATATAN PENTING:
Semua user default menggunakan password yang sama ("password123").
Ini merupakan CELAH KEAMANAN SERIUS jika tidak segera diatasi.
Pemilik toko WAJIB mengganti semua password setelah instalasi.

Dengan menerapkan rekomendasi production di atas, aplikasi ini
siap digunakan untuk operasional toko sembako dengan tingkat
keamanan yang memadai.

================================================================================
                        © 2026 BerkahPOS
================================================================================