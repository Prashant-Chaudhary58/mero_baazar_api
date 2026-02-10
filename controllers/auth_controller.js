const User = require("../models/user_model");

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const {
      fullName,
      phone,
      password,
      role,
      address,
      city,
      district,
      province,
      lat,
      lng,
      email,
      dob,
      altPhone,
    } = req.body;
    console.log("Register request received:", req.body);

    // 1. Always create in User collection (Central Registry)
    const user = await User.create({
      fullName,
      phone,
      password,
      role,
      address,
      city,
      district,
      province,
      lat,
      lng,
      email,
      dob,
      altPhone,
    });

    // 2. Also create in specific collection (Legacy Support)
    if (role === "buyer") {
      const Buyer = require("../models/buyer_model");
      await Buyer.create({
        _id: user.id, // Keep IDs synced if possible, or just let it generate new
        fullName,
        phone,
        password,
        role,
        address,
        city,
        district,
        province,
        lat,
        lng,
      });
    } else if (role === "seller") {
      const Farmer = require("../models/farmer_model");
      await Farmer.create({
        _id: user.id, // Sync ID for easier linking
        fullName,
        phone,
        password,
        role: "seller",
        address,
        city,
        district,
        province,
        lat,
        lng,
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
};

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ success: true });
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    // If user not found in User, try others since req.user is already set by protect middleware
    // But actually protect middleware sets req.user to the full user object.
    // So we can just return req.user
    res.status(200).json({
      success: true,
      data: req.user,
    });
  }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/:id
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      fullName: req.body.fullName,
      address: req.body.address,
      city: req.body.city,
      district: req.body.district,
      province: req.body.province,
      email: req.body.email,
      dob: req.body.dob,
      altPhone: req.body.altPhone,
      lat: req.body.lat,
      lng: req.body.lng,
    };

    if (req.file) {
      fieldsToUpdate.image = req.file.filename;
    }

    // 1. Always update User collection
    const user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // 2. Also update specific collection (Legacy Support)
    if (user.role === "buyer") {
      const Buyer = require("../models/buyer_model");
      await Buyer.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
        new: true,
        runValidators: true,
      });
    } else if (user.role === "seller") {
      const Farmer = require("../models/farmer_model");
      await Farmer.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
        new: true,
        runValidators: true,
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
