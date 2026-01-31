const jwt = require("jsonwebtoken");
const asyncHandler = require("./async"); // I need to create async.js or just use try/catch
const User = require("../models/user_model");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, error: "Not authorized to access this route" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    // Check user based on role in token, or fallback to checking all
    if (decoded.role === "buyer") {
      const Buyer = require("../models/buyer_model");
      req.user = await Buyer.findById(decoded.id);
    } else if (decoded.role === "seller") {
      const Farmer = require("../models/farmer_model");
      req.user = await Farmer.findById(decoded.id);
    } else {
      // Default or Admin
      req.user = await User.findById(decoded.id);
      
      // Fallback: If not found in User, try others (for old tokens without role)
      if (!req.user) {
         const Buyer = require("../models/buyer_model");
         req.user = await Buyer.findById(decoded.id);
      }
      if (!req.user) {
         const Farmer = require("../models/farmer_model");
         req.user = await Farmer.findById(decoded.id);
      }
    }

    if (!req.user) {
        return res.status(401).json({ success: false, error: "User not found" });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ success: false, error: "Not authorized to access this route" });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
