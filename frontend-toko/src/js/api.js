const API_KEY = "smb-2024-7x8a9b2c-secret-key";
const BASE_URL = "https://tokosembako.mboto.my.id/api";

const getToken = async () => {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
};

const setToken = async (token) => {
  localStorage.setItem("token", token);
};

const setUser = async (user) => {
  localStorage.setItem("user", JSON.stringify(user));
};

const getUser = async () => {
  try {
    const value = localStorage.getItem("user");
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const clearAuth = async () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const apiRequest = async (
  endpoint,
  method = "GET",
  data = null,
  useAuth = true,
) => {
  const url = `${BASE_URL}/${endpoint}`;
  const headers = { "Content-Type": "application/json", "x-api-key": API_KEY };

  if (useAuth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (data && method !== "GET") options.body = JSON.stringify(data);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  options.signal = controller.signal;

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Gagal terhubung ke server");
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError")
      throw new Error("Koneksi timeout. Coba lagi.");
    throw err;
  }
};

const auth = {
  login: (username, password) =>
    apiRequest("auth/login", "POST", { username, password }, false),
  me: () => apiRequest("auth/me", "GET"),
  logout: () => apiRequest("auth/logout", "POST"),
};

const barang = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`barang${query ? "?" + query : ""}`, "GET");
  },
  getById: (id) => apiRequest(`barang/${id}`, "GET"),
  create: (data) => apiRequest("barang", "POST", data),
  update: (id, data) => apiRequest(`barang/${id}`, "PUT", data),
  delete: (id) => apiRequest(`barang/${id}`, "DELETE"),
};

const stok = {
  getLog: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`stok/log${query ? "?" + query : ""}`, "GET");
  },
  masuk: (data) => apiRequest("stok/masuk", "POST", data),
  opname: (data) => apiRequest("stok/opname", "POST", data),
  getMenipis: () => apiRequest("stok/menipis", "GET"),
};

const transaksi = {
  create: (data) => apiRequest("transaksi", "POST", data),
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`transaksi${query ? "?" + query : ""}`, "GET");
  },
  getById: (id) => apiRequest(`transaksi/${id}`, "GET"),
};

const pelanggan = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`pelanggan${query ? "?" + query : ""}`, "GET");
  },
  getById: (id) => apiRequest(`pelanggan/${id}`, "GET"),
  create: (data) => apiRequest("pelanggan", "POST", data),
  update: (id, data) => apiRequest(`pelanggan/${id}`, "PUT", data),
  delete: (id) => apiRequest(`pelanggan/${id}`, "DELETE"),
};

const pembayaran = {
  getPiutang: () => apiRequest("pembayaran/piutang", "GET"),
  lunasi: (id) => apiRequest(`pembayaran/lunasi/${id}`, "POST"),
};

const laporan = {
  getDashboard: () => apiRequest("laporan/dashboard", "GET"),
  getPenjualan: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`laporan/penjualan${query ? "?" + query : ""}`, "GET");
  },
  getPerBarang: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(
      `laporan/penjualan-per-barang${query ? "?" + query : ""}`,
      "GET",
    );
  },
};

const user = {
  getAll: () => apiRequest("user", "GET"),
  create: (data) => apiRequest("user", "POST", data),
  update: (id, data) => apiRequest(`user/${id}`, "PUT", data),
  ubahPassword: (data) => apiRequest("user/password/ubah", "PUT", data),
};

const log = {
  getAktivitas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`log/aktivitas${query ? "?" + query : ""}`, "GET");
  },
};

const backup = {
  transaksi: (data) => apiRequest("backup/transaksi", "POST", data),
  export: () => apiRequest("backup/export", "GET"),
};

export {
  getToken,
  setToken,
  setUser,
  getUser,
  clearAuth,
  auth,
  barang,
  stok,
  transaksi,
  pelanggan,
  pembayaran,
  laporan,
  user,
  log,
  backup,
};
