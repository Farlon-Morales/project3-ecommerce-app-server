// models/Review.model.js
const { Schema, model } = require("mongoose");

const reviewSchema = new Schema(
  {
    // rating stays OPTIONAL (validated if provided)
    rating:  { type: Number, min: 1, max: 5 },

    comment: { type: String, trim: true, maxlength: 1000 },

    // Optional image URL attached to the review
    imageUrl:{ 
      type: String, 
      trim: true,
      validate: {
        validator: (v) => !v || /^(https?:\/\/)[^\s]+$/i.test(v),
        message: "imageUrl must be a valid http(s) URL"
      }
    },

    // Relations
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },

    // Reviewer MUST be an authenticated user now
    author:  { type: Schema.Types.ObjectId, ref: "User", required: [true, "Author is required."] },
  },
  { timestamps: true }
);

// Exactly one review per user per product
reviewSchema.index({ product: 1, author: 1 }, { unique: true });

// No guest reviews allowed anymore — remove guest/origin fields and related indexes/hooks

module.exports = model("Review", reviewSchema);