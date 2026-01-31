const User = require("../models/user_model");

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { fullName, phone, password, role } = req.body;
    console.log("Register request received:", req.body);

    let user;

    if (role === "buyer") {
      const Buyer = require("../models/buyer_model");
      user = await Buyer.create({
        fullName,
        phone,
        password,
        role,
      });
    } else if (role === "seller") {
      const Farmer = require("../models/farmer_model");
      user = await Farmer.create({
        fullName,
        phone,
        password,
        role: "seller", // Ensure role is correctly set
      });
    } else {
      // Default to User (or Admin if needed later)
      user = await User.create({
        fullName,
        phone,
        password,
        role,
      });
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // Validate email & password
    if (!phone || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide phone and password" });
    }

    // Check for user in all collections (User, Buyer, Farmer)
    // 1. Check 'users' (Admin/Standard)
    let user = await User.findOne({ phone }).select("+password");

    // 2. Check 'buyers' if not found
    if (!user) {
      const Buyer = require("../models/buyer_model");
      user = await Buyer.findOne({ phone }).select("+password");
    }

    // 3. Check 'farmers' if not found
    if (!user) {
      const Farmer = require("../models/farmer_model");
      user = await Farmer.findOne({ phone }).select("+password");
    }

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    data: user,
  });

  exports.logout = (req, res) => {
    res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
    res.status(200).json({ success: true });
  };
};
