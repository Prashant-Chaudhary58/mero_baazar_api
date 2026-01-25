const express = require("express");
const { register, login, logout, getMe, updateDetails } = require("../controllers/auth_controller");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth"); // Assuming this exists or will need checking

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/me", protect, getMe);
router.put("/update/:id", upload.single("image"), updateDetails);

module.exports = router;
