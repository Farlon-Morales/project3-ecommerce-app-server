// routes/review.routes.js
const router = require("express").Router();
const mongoose = require("mongoose"); // <-- added
const Review = require("../models/Review.model");
const Product = require("../models/product.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

// GET /products/:id/reviews - public
router.get("/products/:id/reviews", async (req, res, next) => {
  try {
    // early guard for invalid product id
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const reviews = await Review.find({ product: id })
      .sort({ createdAt: -1 })
      .populate("author", "name");
    res.json(reviews);
  } catch (err) { next(err); }
});

// POST /products/:id/reviews - auth; user cannot review own product
router.post("/products/:id/reviews", isAuthenticated, async (req, res, next) => {
  try {
    // early guard for invalid product id
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const { rating, comment, imageUrl } = req.body;

    // ✅ Make rating optional; require at least one meaningful field
    if (
      (rating === undefined || rating === null) &&
      (!comment || comment.trim() === "") &&
      (!imageUrl || imageUrl.trim() === "")
    ) {
      return res.status(400).json({ message: "Provide rating, comment, or imageUrl" });
    }

    // optional server-side rating bounds when provided
    if (rating !== undefined && rating !== null) {
      const num = Number(rating);
      if (!Number.isFinite(num) || num < 1 || num > 5) {
        return res.status(400).json({ message: "rating must be between 1 and 5" });
      }
    }

    const product = await Product.findById(id).select("owner");
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!product.owner) {
      // helpful message if owner not set to avoid null.toString() crash
      return res.status(400).json({ message: "Product owner not set" });
    }

    if (product.owner.toString() === req.payload._id) {
      return res.status(403).json({ message: "You cannot review your own product" });
    }

    const payload = {
      product: id,
      author: req.payload._id,
    };
    if (rating !== undefined && rating !== null) payload.rating = Number(rating);
    if (comment !== undefined) payload.comment = comment;
    if (imageUrl !== undefined) payload.imageUrl = imageUrl;

    const review = await Review.create(payload);

    res.status(201).json(review);
  } catch (err) {
    // handle duplicate: one review per user per product
    if (err.code === 11000) {
      return res.status(409).json({ message: "You already reviewed this product" });
    }
    next(err);
  }
});

// PATCH /reviews/:reviewId - auth; only author can update their review
router.patch("/reviews/:reviewId", isAuthenticated, async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    // early guard for invalid review id
    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).json({ message: "Invalid review id" });
    }

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.author.toString() !== req.payload._id) {
      return res.status(403).json({ message: "Not allowed to edit this review" });
    }

    const { rating, comment, imageUrl } = req.body;

    // ✅ Allow partial updates; validate rating only if provided
    const update = {};
    if (rating !== undefined && rating !== null) {
      const num = Number(rating);
      if (!Number.isFinite(num) || num < 1 || num > 5) {
        return res.status(400).json({ message: "rating must be between 1 and 5" });
      }
      update.rating = num;
    }
    if (comment !== undefined) update.comment = comment;
    if (imageUrl !== undefined) update.imageUrl = imageUrl;

    // if nothing to update
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No changes provided" });
    }

    const updated = await Review.findByIdAndUpdate(reviewId, update, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /reviews/:reviewId - auth; only author can delete their review
router.delete("/reviews/:reviewId", isAuthenticated, async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    // early guard for invalid review id
    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).json({ message: "Invalid review id" });
    }

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.author.toString() !== req.payload._id) {
      return res.status(403).json({ message: "Not allowed to delete this review" });
    }

    await Review.findByIdAndDelete(reviewId);
    res.json({ message: "Review deleted" });
  } catch (err) { next(err); }
});

module.exports = router;