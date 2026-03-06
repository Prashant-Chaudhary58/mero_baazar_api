const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, "Please add a phone number"],
  },
  otp: {
    type: String,
    required: [true, "Please add an OTP"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // 5 minutes (in seconds)
  },
});

module.exports = mongoose.model("Otp", OtpSchema);
