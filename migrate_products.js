const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/product_model");

// Load env vars
dotenv.config({ path: "./config/config.env" });

const migrateProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected...");

    // Update all products to have isVerified: false (so Admin can verify them)
    // Also ensure they have default ratings if missing
    const result = await Product.updateMany(
      {},
      { 
        $set: { 
          isVerified: false, 
          averageRating: 0, 
          numOfReviews: 0 
        } 
      }
    );

    console.log(`Updated ${result.modifiedCount} products.`);
    console.log("All products are now SENT TO ADMIN for verification.");
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

migrateProducts();
