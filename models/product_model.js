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
  seller: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", ProductSchema);
