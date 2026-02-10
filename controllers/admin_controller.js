const User = require("../models/user_model");
const Product = require("../models/product_model");
const bcrypt = require("bcryptjs"); // Ensure bcryptjs is installed or reused from user_model logic if possible, but better to use model methods
const fs = require("fs");
const path = require("path");

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Admin
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Create user
// @route   POST /api/admin/users
// @access  Admin
exports.createUser = async (req, res) => {
  try {
    const { fullName, phone, password, role, address, city, district, province } = req.body;

    // Check if user exists
    let user = await User.findOne({ phone });
    if (user) {
        return res.status(400).json({ success: false, error: "User already exists with that phone number" });
    }

    let image = "no-photo.jpg";
    if (req.file) {
      image = req.file.filename;
    }

    // Create user
    user = await User.create({
      fullName,
      phone,
      password, // user_model pre-save will hash this
      role,
      image,
      address,
      city,
      district,
      province
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Admin
exports.updateUser = async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const fieldsToUpdate = { ...req.body };

    // Handle Image Update
    if (req.file) {
        // Optional: Delete old image if it's not default
        if (user.image && user.image !== "no-photo.jpg") {
            const oldImagePath = path.join(__dirname, "../public/uploads", user.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        fieldsToUpdate.image = req.file.filename;
    }

    // If password is being updated, it needs to be hashed if we used findByIdAndUpdate directly, 
    // BUT User.pre('save') only works on .save(). 
    // If using findByIdAndUpdate, middleware is skipped unless configured.
    // However, simplest way for password update here is:
    if (fieldsToUpdate.password) {
        const salt = await bcrypt.genSalt(10);
        fieldsToUpdate.password = await bcrypt.hash(fieldsToUpdate.password, salt);
    }

    user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Optional: Delete image file
    if (user.image && user.image !== "no-photo.jpg") {
        const imagePath = path.join(__dirname, "../public/uploads", user.image);
        if (fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
            } catch (err) {
                console.error("Failed to delete image file:", err);
            }
        }
    }

    await user.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all pending products
// @route   GET /api/admin/products/pending
// @access  Admin
exports.getPendingProducts = async (req, res) => {
    try {
        const products = await Product.find({ isVerified: false }).populate("seller", "fullName phone");
        res.status(200).json({ success: true, count: products.length, data: products });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Verify a product
// @route   PUT /api/admin/products/:id/verify
// @access  Admin
exports.verifyProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        product.isVerified = true;
        await product.save();

        res.status(200).json({ success: true, data: product });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get system stats
// @route   GET /api/admin/stats
// @access  Admin
exports.getSystemStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const pendingProducts = await Product.countDocuments({ isVerified: false });
        
        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                pendingProducts
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
