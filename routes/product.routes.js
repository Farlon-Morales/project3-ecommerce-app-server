const express = require("express");
const router = express.Router();
const Product = require("../models/product.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

// GET /products - public
router.get("/", async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) { next(err); }
});

// POST /products - protected
router.post("/", isAuthenticated, async (req, res, next) => {
  try {
    const { title, description, price, imageUrl, category } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ message: "title, price, category are required" });
    }

    const payload = { title, description, price, category };
    if (imageUrl) payload.thumbnail = imageUrl; // for your current UI

    const newProduct = await Product.create(payload);
    res.status(201).json(newProduct);
  } catch (err) { next(err); }
});

module.exports = router;