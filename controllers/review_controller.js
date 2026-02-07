const Review = require("../models/review_model");
const Product = require("../models/product_model");

// @desc    Get reviews
// @route   GET /api/v1/reviews
// @route   GET /api/v1/products/:productId/reviews
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    let query;

    if (req.params.productId) {
      query = Review.find({ product: req.params.productId }).populate({
        path: 'user',
        select: 'fullName'
      });
    } else {
      query = Review.find().populate({
        path: 'user',
        select: 'fullName'
      });
    }

    const reviews = await query;

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Add review
// @route   POST /api/v1/products/:productId/reviews
// @access  Private (Buyer)
exports.addReview = async (req, res, next) => {
  try {
    req.body.product = req.params.productId;
    req.body.user = req.user.id;

    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `No product with the id of ${req.params.productId}`
      });
    }

    // Check if user already reviewed
    // This is also handled by the unique index, but good to have here
    const existingReview = await Review.findOne({ product: req.params.productId, user: req.user.id });
    if(existingReview) {
       return res.status(400).json({
        success: false,
        error: `User ${req.user.id} has already reviewed product ${req.params.productId}`
      });
    }

    const review = await Review.create(req.body);

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (err) {
    // Handle Duplicate Key Error (if race condition occurs)
    if(err.code === 11000) {
        return res.status(400).json({
            success: false,
            error: 'You have already reviewed this product'
        });
    }
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};
