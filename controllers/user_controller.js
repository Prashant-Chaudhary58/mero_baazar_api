const User = require("../models/user_model");
const Buyer = require("../models/buyer_model");
const Farmer = require("../models/farmer_model");

// @desc    Update user details (including image)
// @route   PUT /api/v1/users/:id
// @access  Private
exports.updateUserDetails = async (req, res, next) => {
  try {
    let user = req.user; // protect middleware sets this

    if (!user) {
         return res.status(401).json({ success: false, error: "Not authorized" });
    }
    
    // Optional: Ensure the user is updating their own profile
    if (req.params.id !== user._id.toString()) {
         return res.status(401).json({ success: false, error: "Not authorized to update this user" });
    }

    const fields = ['fullName', 'email', 'dob', 'province', 'district', 'city', 'address', 'altPhone'];
    
    fields.forEach(field => {
        if (req.body[field] !== undefined) {
             user[field] = req.body[field];
        }
    });

    // If file is uploaded, update image field
    if (req.file) {
      user.image = req.file.filename;
    }

    // Save the document (works for User, Buyer, and Farmer models)
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};
