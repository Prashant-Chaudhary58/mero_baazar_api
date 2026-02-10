const Product = require("../models/product_model");

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isVerified: true }).populate('seller', 'fullName phone address lat lng');

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
    const product = await Product.findById(req.params.id).populate('seller', 'fullName phone address lat lng');

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

    // Fix: Parse numbers/mixed types from FormData strings
    if (req.body.price) {
        req.body.price = Number(req.body.price);
    }
    // Quantity might be "500kg" (string) or number, schema allows string so it's fine, 
    // but ensure it's not "null" string
    if (req.body.quantity === 'null') {
        delete req.body.quantity;
    }

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Seller/Admin)
exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Make sure user is product owner or admin
        // Note: req.user.id is string, product.seller is ObjectId
        if (product.seller.toString() !== req.user.id && req.user.role !== 'admin' && !req.user.isAdmin) {
             return res.status(401).json({ success: false, error: 'Not authorized to delete this product' });
        }

        await product.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get logged in seller's products
// @route   GET /api/v1/products/my-products
// @access  Private (Seller)
exports.getSellerProducts = async (req, res, next) => {
    try {
        const products = await Product.find({ seller: req.user.id });

        res.status(200).json({
            success: true,
            count: products.length,
            data: products,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
