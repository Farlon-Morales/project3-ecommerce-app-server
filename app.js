// ℹ️ Gets access to environment variables/settings
require("dotenv").config();

// ℹ️ Connects to the database
require("./db");

// Handles http requests (express is node js framework)
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Allow requests from your frontend during development and allow Postman
const allowedOrigins = ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ℹ️ This function is getting exported from the config folder. It runs most pieces of middleware
require("./config")(app);

// ✅ Health check route — define BEFORE routes that could override it
app.get(["/health", "/api/health"], (req, res) => {
  const s = mongoose.connection?.readyState ?? 0; // 0=disc,1=conn,2=connecting,3=disconnecting
  const healthy = s === 1; // Only consider fully connected as healthy
  const payload = {
    status: healthy ? "ok" : "degraded",
    mongoState: s,
  };

  // Include DB details only in non-production environments
  if (process.env.NODE_ENV !== "production") {
    payload.host = mongoose.connection?.host;
    payload.db = mongoose.connection?.name;
  }

  res.status(healthy ? 200 : 503).json(payload);
});

// 👇 Start handling routes here
const indexRoutes = require("./routes/index.routes");
app.use("/api", indexRoutes);

const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes);

const productRoutes = require("./routes/product.routes");
app.use("/products", productRoutes);

const reviewRoutes = require("./routes/review.routes");
// If you must mount at '/', keep health route ABOVE this
app.use("/", reviewRoutes);

// ❗ To handle errors
require("./error-handling")(app);

module.exports = app;