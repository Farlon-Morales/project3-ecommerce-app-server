// routes/product.routes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");                     // <-- added
const Product = require("../models/product.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

/**
 * GET /products
 * Public — supports filters via query string.
 * ?category=Serum
 * &q=hydrating
 * &minPrice=10&maxPrice=50
 * &sort=newest|price-asc|price-desc
 */
router.get("/", async (req, res, next) => {
  try {
    const { category, q, minPrice, maxPrice, sort = "newest" } = req.query;

    const filter = {};

    // ℹ️ Category (exact match; flip to regex if you want case-insensitive)
    if (category) {
      filter.category = category;
      // or: filter.category = { $regex: `^${category}$`, $options: "i" };
    }

    // ℹ️ Text search on title/description
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    // ℹ️ Price range
    const price = {};
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!Number.isNaN(min)) price.$gte = min;
    if (!Number.isNaN(max)) price.$lte = max;
    if (Object.keys(price).length) filter.price = price;

    // ℹ️ Sort options
    const sortMap = {
      "price-asc":  { price: 1 },
      "price-desc": { price: -1 },
      "newest":     { createdAt: -1 },
    };
    const sortStage = sortMap[sort] || sortMap["newest"];

    const products = await Product.find(filter)
      .sort(sortStage)
      .populate("owner", "name email");

    res.json(products);
  } catch (err) { next(err); }
});

/**
 * GET /products/categories
 * Public — distinct category list for filters/dropdowns.
 * ⚠️ Keep this BEFORE "/:id" so it doesn't get captured as an id.
 */
router.get("/categories", async (req, res, next) => {
  try {
    const cats = await Product.distinct("category");
    cats.sort((a, b) => String(a).localeCompare(String(b)));
    res.json(cats);
  } catch (err) { next(err); }
});

/**
 * GET /products/:id
 * Public — read one
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // early guard: invalid ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findById(id).populate("owner", "name email");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) { next(err); }
});

/**
 * POST /products
 * Protected — sets owner from JWT
 */
router.post("/", isAuthenticated, async (req, res, next) => {
  try {
    const { title, description, price, imageUrl, category } = req.body;

    if (!title || price === undefined || !category) {
      return res.status(400).json({ message: "title, price, category are required" });
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: "price must be a positive number" });
    }

    // owner comes from verified JWT
    const owner = req.payload._id;

    const payload = { title, description, price: priceNum, category, owner };
    if (imageUrl) payload.thumbnail = imageUrl; // keep your UI mapping

    const newProduct = await Product.create(payload);
    res.status(201).json(newProduct);
  } catch (err) { next(err); }
});

/**
 * DELETE /products/:id
 * Protected — only owner can delete
 */
router.delete("/:id", isAuthenticated, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const userId = req.payload._id; // from JWT

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not allowed to delete this product" });
    }

    await Product.findByIdAndDelete(id);
    res.json({ message: "Product deleted" });
  } catch (err) { next(err); }
});

/**
 * PATCH /products/:id
 * Protected — only owner can edit
 */
router.patch("/:id", isAuthenticated, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const userId = req.payload._id;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not allowed to edit this product" });
    }

    // safe mapping for updates + number coercion
    const { title, description, price, imageUrl, category } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;

    if (price !== undefined) {
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: "price must be a positive number" });
      }
      update.price = priceNum;
    }

    if (imageUrl !== undefined) update.thumbnail = imageUrl;

    const updated = await Product.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;