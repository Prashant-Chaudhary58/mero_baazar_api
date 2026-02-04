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
    ref: "Farmer", // Or User with role 'seller'
    required: true,
  },
  averageRating: {
    type: Number,
    min: [0, "Rating must be at least 0"],
    max: [5, "Rating can not be more than 5"],
    default: 0,
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Cascade delete reviews when a product is deleted
ProductSchema.pre('remove', async function(next) {
  await this.model('Review').deleteMany({ product: this._id });
  next();
});

// Reverse populate with virtuals
ProductSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
  justOne: false
});

module.exports = mongoose.model("Product", ProductSchema);
