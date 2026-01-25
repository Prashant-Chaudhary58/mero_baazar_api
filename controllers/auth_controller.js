const User = require("../models/user_model");

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { fullName, phone, password, role } = req.body;
    console.log("Register request received:", req.body);

    // Create user
    const user = await User.create({
      fullName,
      phone,
      password,
      role,
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

    // Validate email & password
    if (!phone || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide phone and password" });
    }

    // Check for user
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
    // If auth middleware is working, req.user should be populated
    // If using cookie parser without middleware, we might need to verify token here.
    // Assuming middleware sets req.user.
    
    // For now, based on provided code, the middleware usage wasn't shown but likely exists.
    // Ideally we fetch again to be safe.
    const user = await User.findById(req.user.id);

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
// @route   PUT /api/v1/auth/updatedetails
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
      altPhone: req.body.altPhone
    };

    // Check if file uploaded
    if (req.file) {
      // If we want to store the full URL:
      // const url = req.protocol + '://' + req.get('host');
      // fieldsToUpdate.image = url + '/public/uploads/' + req.file.filename; 
      
      // Or just relative path if frontend builds URL:
      fieldsToUpdate.image = req.file.filename; 
    }

    const user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
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
