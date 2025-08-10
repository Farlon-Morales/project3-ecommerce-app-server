const express = require("express");
const router = express.Router();
const Product = require("../models/product.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

// GET /products - public
router.get("/", async (req, res, next) => {
  try {
    // optional populate to show who owns the product
    const products = await Product.find().sort({ createdAt: -1 }).populate("owner", "name email");
    res.json(products);
  } catch (err) { next(err); }
});

// POST /products - protected (sets owner from JWT)
router.post("/", isAuthenticated, async (req, res, next) => {
  try {
    const { title, description, price, imageUrl, category } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ message: "title, price, category are required" });
    }

    // 👇 owner comes from verified JWT
    const owner = req.payload._id;

    const payload = { title, description, price, category, owner };
    if (imageUrl) payload.thumbnail = imageUrl; // keep your UI mapping

    const newProduct = await Product.create(payload);
    res.status(201).json(newProduct);
  } catch (err) { next(err); }
});

// DELETE /products/:id - protected (only owner can delete)
router.delete("/:id", isAuthenticated, async (req, res, next) => {
  try {
    const { id } = req.params;
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

// (Optional) PUT/PATCH with same ownership check
router.patch("/:id", isAuthenticated, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.payload._id;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not allowed to edit this product" });
    }

    const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;