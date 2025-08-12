// ℹ️ Gets access to environment variables/settings
// https://www.npmjs.com/package/dotenv
require("dotenv").config();

// ℹ️ Connects to the database
require("./db");

// Handles http requests (express is node js framework)
// https://www.npmjs.com/package/express
const express = require("express");

// ℹ️ Package that allows cross-origin requests (frontend <-> backend communication)
const cors = require("cors"); // <== NEW

const app = express();

// ⬇️ Allow requests from your frontend during development
// Without this, browser security (CORS) will block your frontend from calling your backend
// ✅ Updated to allow credentials (cookies, auth headers) from your frontend
app.use(
  cors({
    origin: "http://localhost:5173", // React/Vite dev server origin
    credentials: true,               // <== Allow cookies/credentials
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ℹ️ This function is getting exported from the config folder. It runs most pieces of middleware
require("./config")(app);

// 👇 Start handling routes here
// ℹ️ This is your index route (e.g., GET /api)
const indexRoutes = require("./routes/index.routes");
app.use("/api", indexRoutes);

// ℹ️ Auth routes for signup, login, and verification
const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes);

// ℹ️ Product routes for listing, creating, updating products
const productRoutes = require("./routes/product.routes");
app.use("/products", productRoutes);

// ℹ️ Review routes for listing/creating/updating/deleting reviews
const reviewRoutes = require("./routes/review.routes");
app.use("/", reviewRoutes);

// ❗ To handle errors. Routes that don't exist or errors that you handle in specific routes
require("./error-handling")(app);

module.exports = app;