const express = require("express");
const {
  getAllProducts,
  getProduct,
  createProduct,
  getSellerProducts,
  deleteProduct,
  updateProduct,
} = require("../controllers/product_controller");

const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/my-products", protect, authorize("seller"), getSellerProducts);

router
  .route("/")
  .get(getAllProducts)
  .post(protect, authorize("seller"), upload.single("image"), createProduct);

router
  .route("/:id")
  .get(getProduct)
  .put(protect, authorize("seller", "admin"), upload.single("image"), updateProduct)
  .delete(protect, authorize("seller", "admin"), deleteProduct);

module.exports = router;
