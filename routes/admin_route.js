const express = require("express");
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/admin_controller");

const router = express.Router();

const { protect } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin_middleware");
const upload = require("../middleware/upload");

router.use(protect);
router.use(isAdmin);

router
  .route("/users")
  .get(getUsers)
  .post(upload.single("image"), createUser);

router
  .route("/users/:id")
  .get(getUser)
  .put(upload.single("image"), updateUser)
  .delete(deleteUser);

module.exports = router;
