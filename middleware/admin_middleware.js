const asyncHandler = require("./async");

exports.isAdmin = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied. Admin resources only.",
    });
  }
  next();
});
