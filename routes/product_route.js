const express = require("express");
const {
  getAllProducts,
  getProduct,
  createProduct,
} = require("../controllers/product_controller");

const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Include other resource routers
const reviewRouter = require('./review_route');

const router = express.Router();

// Re-route into other resource routers
router.use('/:productId/reviews', reviewRouter);

router
  .route("/")
  .get(getAllProducts)
  .post(protect, authorize("seller"), upload.single("image"), createProduct);

router.route("/:id").get(getProduct);

module.exports = router;
