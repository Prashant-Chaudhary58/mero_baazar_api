const User = require("../models/user_model");
const Otp = require("../models/otp_model");
const crypto = require("crypto");

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

// @desc    Send OTP to phone
// @route   POST /api/v1/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: "Please provide a phone number" });
    }

    // Check if user exists before sending OTP for reset
    // This allows us to use it for reset or login based on whether user exists
    let user = await User.findOne({ phone });
    if (!user) {
      const Buyer = require("../models/buyer_model");
      user = await Buyer.findOne({ phone });
    }
    if (!user) {
      const Farmer = require("../models/farmer_model");
      user = await Farmer.findOne({ phone });
    }

    if (!user) {
      return res.status(404).json({ success: false, error: "No user found with this phone number" });
    }

    // Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove existing OTPs for this phone to avoid duplicates
    await Otp.deleteMany({ phone });

    // Save strictly to OTP collection (TTL index handles expiry)
    await Otp.create({
      phone,
      otp: otpCode,
    });

    // In DEV: Log the OTP so we can test it without an SMS gateway
    console.log(`[DEV ONLY] OTP for ${phone} is: ${otpCode}`);

    res.status(200).json({
      success: true,
      message: "OTP sent to phone",
      data: { phone }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Verify OTP for Password Reset
// @route   POST /api/v1/auth/verify-otp-reset
// @access  Public
exports.verifyOtpForReset = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: "Please provide phone and OTP" });
    }

    const otpRecord = await Otp.findOne({ phone, otp });

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: "Invalid or expired OTP" });
    }

    // OTP is valid, delete it
    await Otp.deleteOne({ _id: otpRecord._id });

    // Generate a temporary reset token to allow password change
    const resetToken = crypto.randomBytes(20).toString("hex");

    // We must hash it and store it temporarily in the user's document
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update the relevant user document (User, Buyer, or Farmer)
    let user = await User.findOneAndUpdate(
        { phone },
        { resetPasswordToken, resetPasswordExpire },
        { new: true }
    );
    
    if(!user) {
        const Buyer = require("../models/buyer_model");
        user = await Buyer.findOneAndUpdate(
            { phone },
            { resetPasswordToken, resetPasswordExpire },
            { new: true }
        );
    }
    
    if(!user) {
        const Farmer = require("../models/farmer_model");
        user = await Farmer.findOneAndUpdate(
            { phone },
            { resetPasswordToken, resetPasswordExpire },
            { new: true }
        );
    }

    if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: { resetToken } // Client MUST send this token with the new password
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Reset password (Final Step)
// @route   PUT /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
    try {
        const { resetToken, password } = req.body;

        if (!resetToken || !password) {
            return res.status(400).json({ success: false, error: "Please provide a reset token and new password" });
        }

        if (password.length < 6) {
           return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
        }

        // Get hashed token
        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Find user by token and ensure it hasn't expired
        let userModel = null;
        let user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (user) {
           userModel = User;
        } else {
            const Buyer = require("../models/buyer_model");
            user = await Buyer.findOne({
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            });
            if (user) userModel = Buyer;
        }

        if (!user) {
            const Farmer = require("../models/farmer_model");
             user = await Farmer.findOne({
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            });
            if (user) userModel = Farmer;
        }

        if (!user) {
            return res.status(400).json({ success: false, error: "Invalid token or token has expired" });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        
        // This will trigger the pre("save") hook to hash the new password
        await user.save();
        
        // If we found it in Buyer or Farmer, we should probably update the main User table too
        // or vice versa depending on how they are synced currently. Let's sync back to Main `User` if modified in child
        if(userModel !== User) {
             const mainUser = await User.findById(user._id);
             if(mainUser) {
                 mainUser.password = password;
                 mainUser.resetPasswordToken = undefined;
                 mainUser.resetPasswordExpire = undefined;
                 await mainUser.save();
             }
        } else {
             // If modified in main User, try modifying in children just in case
             if(user.role === 'buyer') {
                  const Buyer = require("../models/buyer_model");
                  const bUser = await Buyer.findById(user._id);
                  if(bUser) {
                      bUser.password = password;
                      bUser.resetPasswordToken = undefined;
                      bUser.resetPasswordExpire = undefined;
                      await bUser.save();
                  }
             } else if(user.role === 'seller') {
                  const Farmer = require("../models/farmer_model");
                  const fUser = await Farmer.findById(user._id);
                  if(fUser) {
                      fUser.password = password;
                      fUser.resetPasswordToken = undefined;
                      fUser.resetPasswordExpire = undefined;
                      await fUser.save();
                  }
             }
        }

        // Send a new JWT response
        // Need to require auth controller's sendTokenResponse or duplicate logic.
        // It's defined as a const above.
        const token = user.getSignedJwtToken();

        const options = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
            httpOnly: true,
        };
        if (process.env.NODE_ENV === "production") options.secure = true;

        res.status(200).cookie("token", token, options).json({
            success: true,
            token,
            data: user,
            message: "Password updated successfully"
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
