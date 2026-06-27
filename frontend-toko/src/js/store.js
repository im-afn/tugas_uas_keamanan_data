import { createStore } from "framework7";

const store = createStore({
  state: {
    token: null,
    user: null,
    isLoggedIn: false,

    dashboard: {
      hari_ini: { total_transaksi: 0, total_penjualan: 0, laba_kotor: 0 },
      piutang: { total_pelanggan: 0, total_piutang: 0 },
      stok: { total_barang: 0, stok_menipis: 0 },
      transaksi_terbaru: [],
    },

    keranjang: [],
    totalKeranjang: 0,
    hasilCari: [],
    daftarPelanggan: [],
    selectedPelanggan: null,

    hasilScan: null,
    barangScan: null,

    daftarBarang: [],
    loadingBarang: false,
    loadingEdit: false,

    hasilCariStok: [],
    selectedBarangMasuk: null,
    stokMasukItems: [],

    hasilCariOpname: [],
    selectedBarangOpname: null,

    logStok: [],
    loadingLog: false,

    loadingPelanggan: false,

    piutangData: null,
    loadingPiutang: false,

    laporanPenjualan: null,
    loadingLaporan: false,

    laporanPerBarang: null,
    loadingLaporanBarang: false,

    daftarUser: [],
    loadingUser: false,

    logAktivitas: [],
    loadingLogAktivitas: false,
  },

  getters: {
    token({ state }) {
      return state.token;
    },
    user({ state }) {
      return state.user;
    },
    isLoggedIn({ state }) {
      return state.isLoggedIn;
    },
    role({ state }) {
      return state.user ? state.user.role : null;
    },
  },

  actions: {
    setAuth({ state }, { token, user }) {
      state.token = token;
      state.user = user;
      state.isLoggedIn = true;
    },
    clearAuth({ state }) {
      state.token = null;
      state.user = null;
      state.isLoggedIn = false;
    },
  },
});

export default store;
