const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a name"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Please add a description"],
  },
  price: {
    type: Number,
    required: [true, "Please add a price"],
  },
  quantity: {
    type: String, // e.g. "500kg"
    required: [true, "Please add quantity"],
  },
  category: {
    type: String,
    required: [true, "Please add a category"],
    enum: ["Vegetables", "Fruits", "Grains", "Others"],
    default: "Others",
  },
  image: {
    type: String,
    default: "no-photo.jpg",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  seller: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  averageRating: {
    type: Number,
    min: [0, "Rating must be at least 0"],
    max: [5, "Rating must can not be more than 5"],
    default: 0
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate Average Rating
ProductSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
  justOne: false,
});

module.exports = mongoose.model("Product", ProductSchema);
