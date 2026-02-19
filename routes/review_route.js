const express = require("express");
const {
  getReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
} = require("../controllers/review_controller");

const Review = require("../models/review_model");

// mergeParams: true allows us to access params from other routers (e.g. productId from product routes)
const router = express.Router({ mergeParams: true });

const { protect, authorize } = require("../middleware/auth");

router
  .route("/")
  .get(getReviews)
  .post(protect, authorize("buyer", "admin"), addReview);

router
  .route("/:id")
  .get(getReview)
  .put(protect, authorize("buyer", "admin"), updateReview)
  .delete(protect, authorize("buyer", "admin"), deleteReview);

module.exports = router;
