const { Buyer, Farmer } = require("../models/user_model");
const Product = require("../models/product_model");
const asyncHandler = require("../middleware/async");
const bcrypt = require("bcryptjs");

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const buyers = await Buyer.find({});
  const farmers = await Farmer.find({});
  
  // Combine users and add type for clarity
  const allUsers = [
    ...buyers.map(u => ({ ...u.toObject(), type: 'buyer' })), 
    ...farmers.map(u => ({ ...u.toObject(), type: 'farmer' }))
  ];

  res.status(200).json({
    success: true,
    count: allUsers.length,
    data: allUsers,
  });
});

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  let user = await Buyer.findById(req.params.id);
  if (!user) {
    user = await Farmer.findById(req.params.id);
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Create user (admin)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const { fullName, phone, password, role, email, dob, address, city, district, province, altPhone } = req.body;

  const Model = role === "seller" ? Farmer : Buyer;

  // Check if user exists
  const existingUser = await Model.findOne({ phone });
  if (existingUser) {
    return res.status(400).json({ success: false, error: "User already exists with this phone" });
  }

  const userData = {
    fullName,
    phone,
    password, // Will be hashed by pre-save hook
    role: role || "buyer",
    email,
    dob,
    address,
    city,
    district,
    province,
    altPhone
  };

  if (req.file) {
    userData.image = req.file.filename;
  }

  const user = await Model.create(userData);

  res.status(201).json({
    success: true,
    data: user,
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  let user = await Buyer.findById(req.params.id);
  let Model = Buyer;
  
  if (!user) {
    user = await Farmer.findById(req.params.id);
    Model = Farmer;
  }

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  const fieldsToUpdate = { ...req.body };
  
  if (req.file) {
    fieldsToUpdate.image = req.file.filename;
  }

  // If password is being updated, it needs to be hashed. 
  // Should ideally use user.save() to trigger middleware, but findByIdAndUpdate is simpler for non-auth flows.
  // For now, removing password from direct update or hashing it manually if needed.
  // Assuming admin doesn't reset password this way or we trust the input.
  if (fieldsToUpdate.password) {
     const salt = await bcrypt.genSalt(10);
     fieldsToUpdate.password = await bcrypt.hash(fieldsToUpdate.password, salt);
  }

  const updatedUser = await Model.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  let user = await Buyer.findById(req.params.id);
  let Model = Buyer;

  if (!user) {
    user = await Farmer.findById(req.params.id);
    Model = Farmer;
  }

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  await Model.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get all pending products
// @route   GET /api/admin/products/pending
// @access  Private/Admin
exports.getPendingProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ isVerified: false }).populate("seller", "fullName phone");

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

// @desc    Verify a product
// @route   PUT /api/admin/products/:id/verify
// @access  Private/Admin
exports.verifyProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, error: "Product not found" });
  }

  product = await Product.findByIdAndUpdate(req.params.id, { isVerified: true }, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: product,
  });
});
