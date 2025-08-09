const { Schema, model } = require("mongoose");

const productSchema = new Schema(
  {
    id: Number,
    title: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    discountPercentage: Number,
    rating: Number,
    stock: Number,
    tags: [String],
    brand: String,
    sku: String,
    weight: Number,
    dimensions: {
      width: Number,
      height: Number,
      depth: Number,
    },
    warrantyInformation: String,
    shippingInformation: String,
    availabilityStatus: String,
    reviews: [
      {
        rating: Number,
        comment: String,
        date: Date,
        reviewerName: String,
        reviewerEmail: String,
      },
    ],
    returnPolicy: String,
    minimumOrderQuantity: Number,
    meta: {
      createdAt: Date,
      updatedAt: Date,
      barcode: String,
      qrCode: String,
    },
    images: [String],
    thumbnail: String,
    category: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = model("Product", productSchema);