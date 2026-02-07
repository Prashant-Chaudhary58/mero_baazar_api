const asyncHandler = require("./async");

exports.isAdmin = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "admin" && !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Admin resources only.",
    });
  }
  next();
});
