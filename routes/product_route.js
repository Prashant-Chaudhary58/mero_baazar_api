const express = require("express");
const {
  getAllProducts,
  getProduct,
  createProduct,
} = require("../controllers/product_controller");

const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router
  .route("/")
  .get(getAllProducts)
  .post(protect, authorize("seller"), upload.single("image"), createProduct);

router.route("/:id").get(getProduct);

module.exports = router;
