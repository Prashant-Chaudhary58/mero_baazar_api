const express = require("express");
const { 
  register, 
  login, 
  getMe, 
  logout, 
  updateDetails,
  sendOtp,
  verifyOtpForReset,
  resetPassword
} = require("../controllers/auth_controller");

const router = express.Router();

const { protect } = require("../middleware/auth");
const upload = require("../utils/fileUpload");

// OTP & Password Reset routes (Must be before /:id)
router.post("/send-otp", sendOtp);
router.post("/verify-otp-reset", verifyOtpForReset);
router.put("/reset-password", resetPassword);

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/logout", logout);
router.put("/:id", protect, upload.single("image"), updateDetails);

module.exports = router;
