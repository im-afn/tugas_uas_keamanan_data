// middleware/auth.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Token tidak ditemukan. Silakan login.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      username: decoded.username,
      nama_lengkap: decoded.nama_lengkap,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        message: "Token sudah kadaluarsa. Silakan login kembali.",
      });
    }
    return res.status(403).json({
      status: "error",
      message: "Token tidak valid",
    });
  }
};

module.exports = authMiddleware;
