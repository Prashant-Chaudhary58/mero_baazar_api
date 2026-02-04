const express = require('express');
const {
  getReviews,
  addReview
} = require('../controllers/review_controller');

const Review = require('../models/review_model');

// mergeParams: true allows us to access productId from the parent router (productRoutes)
const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(getReviews)
  .post(protect, authorize('buyer', 'user'), addReview); // Allow 'buyer' (or 'user' if you don't differentiate strictly yet)

module.exports = router;
