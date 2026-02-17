const express = require("express");
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getPendingProducts,
  verifyProduct,
  getSystemStats
} = require("../controllers/admin_controller");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const upload = require("../utils/fileUpload");

// Protect all routes
router.use(protect);
router.use(authorize("admin"));

router
  .route("/users")
  .get(getUsers)
  .post(upload.single("image"), createUser);

router
  .route("/users/:id")
  .get(getUser)
  .put(upload.single("image"), updateUser)

  .delete(deleteUser);

router.get("/products/pending", getPendingProducts);
router.put("/products/:id/verify", verifyProduct);
router.get("/stats", getSystemStats);

module.exports = router;
