const Product = require("../models/product_model");

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
const { User } = require("../models/user_model");

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getAllProducts = async (req, res, next) => {
  try {
    let query = Product.find();

    // Geospatial Query: If lat/lng provided, filter by nearby sellers
    if (req.query.lat && req.query.lng) {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const radius = req.query.radius ? parseInt(req.query.radius) : 2000; // Default 2km

      // 1. Find Sellers near the location
      const nearbySellers = await User.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
            $maxDistance: radius,
          },
        },
      }).select("_id");

      // Extract IDs
      const sellerIds = nearbySellers.map((user) => user._id);

      // 2. Filter products by these sellers
      query = query.where("seller").in(sellerIds);
    }

    const products = await query.populate('seller', 'fullName phone address location'); // Include location in population

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
    const product = await Product.findById(req.params.id)
      .populate('seller', 'fullName phone address location')
      .populate('reviews');

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
