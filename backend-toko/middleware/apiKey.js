// middleware/apiKey.js

const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({
      status: "error",
      message: "API Key tidak ditemukan",
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      status: "error",
      message: "API Key tidak valid",
    });
  }

  next();
};

module.exports = apiKeyMiddleware;
