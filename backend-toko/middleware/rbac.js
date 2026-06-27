// middleware/rbac.js

const rbacMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "User tidak terautentikasi",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Anda tidak memiliki izin untuk mengakses fitur ini",
      });
    }

    next();
  };
};

module.exports = rbacMiddleware;
