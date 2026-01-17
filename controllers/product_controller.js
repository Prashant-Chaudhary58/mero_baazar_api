const Product = require("../models/product_model");

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find().populate('seller', 'fullName phone address');

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('seller', 'fullName phone address');

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private (Seller)
exports.createProduct = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.seller = req.user.id;

    // Handle file upload
    if(req.file){
        req.body.image = req.file.filename;
    }

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
