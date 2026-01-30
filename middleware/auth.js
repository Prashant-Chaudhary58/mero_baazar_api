const jwt = require("jsonwebtoken");
const asyncHandler = require("./async"); // I need to create async.js or just use try/catch

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, error: "Not authorized to access this route" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log(decoded);

    const { Buyer, Farmer } = require("../models/user_model");

    // If role is in token, use specific model
    if (decoded.role) {
      const Model = decoded.role === "seller" ? Farmer : Buyer;
      req.user = await Model.findById(decoded.id);
    } else {
      // Fallback: Check both collections if role is missing (old tokens)
      let user = await Buyer.findById(decoded.id);
      if (!user) {
        user = await Farmer.findById(decoded.id);
      }
      req.user = user;
    }

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authorized to access this route" });
    }

    next();
  } catch (err) {
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
