const express = require("express");
const { register, login, getMe, logout, updateDetails } = require("../controllers/auth_controller");

const router = express.Router();

const { protect } = require("../middleware/auth");
const upload = require("../utils/fileUpload");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/logout", logout);
router.put("/:id", protect, upload.single("image"), updateDetails);

module.exports = router;
