// utils/response.js

const sukses = (res, data, message = "Berhasil", statusCode = 200) => {
  return res.status(statusCode).json({
    status: "sukses",
    message: message,
    data: data,
  });
};

const error = (res, message = "Terjadi kesalahan", statusCode = 500) => {
  return res.status(statusCode).json({
    status: "error",
    message: message,
  });
};

const paginasi = (
  res,
  data,
  total,
  halaman,
  perHalaman,
  message = "Berhasil",
) => {
  return res.status(200).json({
    status: "sukses",
    message: message,
    data: data,
    paginasi: {
      total: total,
      halaman: halaman,
      per_halaman: perHalaman,
      total_halaman: Math.ceil(total / perHalaman),
    },
  });
};

module.exports = { sukses, error, paginasi };
