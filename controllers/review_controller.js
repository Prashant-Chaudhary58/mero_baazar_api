const Review = require("../models/review_model");
const Product = require("../models/product_model");

// @desc    Get reviews
// @route   GET /api/v1/reviews
// @route   GET /api/v1/products/:productId/reviews
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    if (req.params.productId) {
      const reviews = await Review.find({ product: req.params.productId }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: reviews.length,
        data: reviews,
      });
    } else {
      const reviews = await Review.find().populate({
        path: "product",
        select: "name description",
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: reviews.length,
        data: reviews,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get single review
// @route   GET /api/v1/reviews/:id
// @access  Public
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id).populate({
      path: "product",
      select: "name description",
    });

    if (!review) {
      return res.status(404).json({ success: false, error: "No review found with that ID" });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Add review
// @route   POST /api/v1/products/:productId/reviews
// @access  Private
exports.addReview = async (req, res, next) => {
  try {
    req.body.product = req.params.productId;
    req.body.user = req.user.id;

    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ success: false, error: "No product found with that ID" });
    }

    // Check if user is the product owner
    if (product.seller.toString() === req.user.id) {
       return res.status(400).json({ success: false, error: "You cannot review your own product" });
    }

    // Check if review already exists
    let review = await Review.findOne({ product: req.params.productId, user: req.user.id });

    if (review) {
        // Update existing review
        review.title = req.body.title;
        review.text = req.body.text;
        review.rating = req.body.rating;
        review.createdAt = Date.now();
        await review.save(); // Triggers post-save middleware for avg rating

        return res.status(200).json({
            success: true,
            data: review,
        });
    }

    // Create new review
    review = await Review.create(req.body);

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, error: "No review found with that ID" });
    }

    // Make sure review belongs to user or user is admin
    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({ success: false, error: "Not authorized to update review" });
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Manually trigger average rating update since findByIdAndUpdate doesn't trigger save middleware
    // We can call the static method directly
    await Review.getAverageRating(review.product);

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, error: "No review found with that ID" });
    }

    // Make sure review belongs to user or user is admin
    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({ success: false, error: "Not authorized to delete review" });
    }

    await review.deleteOne();
    
    // Manually trigger average rating update since deleteOne might not trigger remove middleware in all mongoose versions/configurations
    // best practice is to explicitely call it if needed, but the pre('remove') hook on document should work if called on the document instance.
    // However, deleteOne on document is recent. To be safe, let's call it.
    await Review.getAverageRating(review.product);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
