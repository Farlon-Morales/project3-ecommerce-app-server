// models/Review.model.js
const { Schema, model } = require("mongoose");

const reviewSchema = new Schema(
  {
    // ℹ️ rating is now OPTIONAL (was required). Still validated if provided.
    rating:  { type: Number, min: 1, max: 5 },

    comment: { type: String, trim: true, maxlength: 1000 },

    // ℹ️ Optional image URL attached to the review
    imageUrl:{ 
      type: String, 
      trim: true,
      validate: {
        validator: (v) => !v || /^(https?:\/\/)[^\s]+$/i.test(v),
        message: "imageUrl must be a valid http(s) URL"
      }
    },

    // ℹ️ Relations
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },

    // ℹ️ When the reviewer is an authenticated user
    //    (now OPTIONAL to allow guest reviews)
    author:  { type: Schema.Types.ObjectId, ref: "User" }, // <-- made optional

    // ℹ️ When the reviewer is a guest (non-user)
    guest: {
      name:  { type: String, trim: true, maxlength: 120 },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, // basic email format validation
      },
    },

    // ℹ️ Optional: track origin for clarity/analytics ("user" | "guest")
    origin: {
      type: String,
      enum: ["user", "guest"],
      default: "user",
    },
  },
  { timestamps: true }
);

// ℹ️ One review per user per product (only when author exists)
reviewSchema.index(
  { product: 1, author: 1 },
  {
    unique: true,
    partialFilterExpression: { author: { $exists: true } }, // allow docs without author
  }
);

// ℹ️ One review per guest email per product (only when guest.email exists)
//    This prevents duplicate guest reviews by the same email on the same product.
reviewSchema.index(
  { product: 1, "guest.email": 1 },
  {
    unique: true,
    partialFilterExpression: { "guest.email": { $exists: true } }, // allow docs without guest.email
  }
);

// ℹ️ Custom validation: require either an authenticated author OR guest info
reviewSchema.pre("validate", function (next) {
  const hasAuthor = !!this.author;
  const hasGuest  = !!(this.guest && (this.guest.name || this.guest.email));

  // auto-set origin if not provided
  if (!this.origin) this.origin = hasAuthor ? "user" : "guest";

  // enforce origin consistency if provided
  if (this.origin === "user" && !hasAuthor) this.invalidate("author", "Author is required when origin is 'user'.");
  if (this.origin === "guest" && !hasGuest)  this.invalidate("guest", "Guest name or email is required when origin is 'guest'.");

  // if origin not set or mismatched, still ensure at least one identity is present
  if (!hasAuthor && !hasGuest) {
    this.invalidate("author", "Provide an author or guest details.");
    this.invalidate("guest",  "Provide an author or guest details.");
  }

  next();
});

module.exports = model("Review", reviewSchema);