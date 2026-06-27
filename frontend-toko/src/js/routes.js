import HomePage from "../pages/home.f7";
import LoginPage from "../pages/login.f7";
import BerandaPage from "../pages/beranda.f7";
import TransaksiPage from "../pages/transaksi.f7";
import ScannerPage from "../pages/scanner.f7";
import TentangPage from "../pages/tentang.f7";
import BarangPage from "../pages/barang.f7";
import BarangTambahPage from "../pages/barang_tambah.f7";
import BarangEditPage from "../pages/barang_edit.f7";
import StokMasukPage from "../pages/stok_masuk.f7";
import StokOpnamePage from "../pages/stok_opname.f7";
import StokLogPage from "../pages/stok_log.f7";
import PelangganPage from "../pages/pelanggan.f7";
import PelangganTambahPage from "../pages/pelanggan_tambah.f7";
import PiutangPage from "../pages/piutang.f7";
import LaporanPage from "../pages/laporan.f7";
import LaporanBarangPage from "../pages/laporan_barang.f7";
import UserPage from "../pages/user.f7";
import UserTambahPage from "../pages/user_tambah.f7";
import LogPage from "../pages/log.f7";
import PengaturanPage from "../pages/pengaturan.f7";

var routes = [
  {
    path: "/",
    component: HomePage,
    tabs: [
      { path: "/beranda/", id: "view-beranda", component: BerandaPage },
      { path: "/transaksi/", id: "view-transaksi", component: TransaksiPage },
      { path: "/scanner/", id: "view-scanner", component: ScannerPage },
      { path: "/tentang/", id: "view-tentang", component: TentangPage },
    ],
  },
  { path: "/login/", component: LoginPage },
  { path: "/barang/", component: BarangPage },
  { path: "/barang/tambah/", component: BarangTambahPage },
  { path: "/barang/edit/:id/", component: BarangEditPage },
  { path: "/stok/masuk/", component: StokMasukPage },
  { path: "/stok/opname/", component: StokOpnamePage },
  { path: "/stok/log/", component: StokLogPage },
  { path: "/pelanggan/", component: PelangganPage },
  { path: "/pelanggan/tambah/", component: PelangganTambahPage },
  { path: "/piutang/", component: PiutangPage },
  { path: "/laporan/", component: LaporanPage },
  { path: "/laporan/barang/", component: LaporanBarangPage },
  { path: "/user/", component: UserPage },
  { path: "/user/tambah/", component: UserTambahPage },
  { path: "/log/", component: LogPage },
  { path: "/pengaturan/", component: PengaturanPage },
];

export default routes;
