const { Buyer, Farmer } = require("../models/user_model");

// Helper to get model based on role
const getModelByRole = (role) => {
  return role === "seller" ? Farmer : Buyer;
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { fullName, phone, password, role } = req.body;
    console.log("Register request received:", req.body);

    const Model = getModelByRole(role);

    // Create user
    const user = await Model.create({
      fullName,
      phone,
      password,
      role: role || "buyer",
    });

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

    if (!phone || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide phone and password" });
    }

    // Check both collections
    let user = await Buyer.findOne({ phone }).select("+password");
    if (!user) {
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

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Public
exports.logout = (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ success: true });
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const Model = getModelByRole(req.user.role);
    const user = await Model.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails/:id
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      fullName: req.body.fullName,
      email: req.body.email,
      dob: req.body.dob,
      province: req.body.province,
      district: req.body.district,
      city: req.body.city,
      address: req.body.address,
      altPhone: req.body.altPhone,
    };

    if (req.file) {
      fieldsToUpdate.image = req.file.filename;
    }

    // We use the role from the token (req.user.role) to know which collection to update
    const Model = getModelByRole(req.user.role);

    const user = await Model.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
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
