const { User, Buyer, Farmer } = require("../models/user_model");

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

    const userRole = role || "buyer";
    const RoleModel = getModelByRole(userRole);

    // 1. Create in master User collection
    const mainUser = await User.create({
      fullName,
      phone,
      password,
      role: userRole,
    });

    // 2. Create in Role-specific collection (shadow copy)
    // We can use the same ID if we want consistency, or let Mongo generate unique ones. 
    // Usually easier to let them diverge IDs OR manually set _id. 
    // For simplicity, let's just create them. If we want them linked, we might store the same ID.
    // However, saving with exact same _id requires simpler handling. 
    // Let's just create. The auth will now rely on 'User' mostly.
    
    // To keep them in sync on updates, we'll search by unique 'phone' or '_id'.
    // NOTE: If we want to use the same _id, we need to explicitly set it.
    await RoleModel.create({
      _id: mainUser._id, // Keep IDs legitimate across collections
      fullName,
      phone,
      password,
      role: userRole,
    });

    sendTokenResponse(mainUser, 201, res);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: "Phone number already exists" });
    }
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

    // Check main Users collection
    const user = await User.findOne({ phone }).select("+password");

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
    // req.user is already populated by middleware (likely from User model now)
    const user = await User.findById(req.user.id);

    console.log("getMe User:", user); // Debugging isAdmin flag

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
    console.log("UpdateDetails req.body:", req.body);
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

    // Construct GeoJSON location if lat/lng are provided
    if (req.body.lat && req.body.lng) {
      fieldsToUpdate.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)] // [Longitude, Latitude]
      };
    }

    if (req.file) {
      fieldsToUpdate.image = req.file.filename;
    }

    // 1. Update Main User
    const user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
    }

    // 2. Update Role Shadow Copy
    // We rely on the fact that we created them with the same _id during register.
    const RoleModel = getModelByRole(user.role);
    await RoleModel.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
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
