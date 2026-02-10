const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/user_model");
const Farmer = require("./models/farmer_model");
const Buyer = require("./models/buyer_model");

// Load env vars
dotenv.config({ path: "./config/config.env" });

const migrateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected...");

    // 1. Get all Farmers
    const farmers = await Farmer.find({}).select("+password");
    console.log(`Found ${farmers.length} farmers to migrate.`);

    for (const farmer of farmers) {
      // Check if user already exists in User collection
      let user = await User.findById(farmer._id);
      if (!user) {
        // Create matching User
        console.log(`Migrating Farmer: ${farmer.fullName} with password length: ${farmer.password ? farmer.password.length : 'MISSING'}`);
        
        await User.create({
          _id: farmer._id, // KEEP THE SAME ID
          fullName: farmer.fullName,
          phone: farmer.phone,
          password: farmer.password, // Already hashed
          role: "seller",
          address: farmer.address,
          city: farmer.city,
          district: farmer.district,
          province: farmer.province,
          lat: farmer.lat,
          lng: farmer.lng,
          image: farmer.image,
          isAdmin: farmer.isAdmin,
          createdAt: farmer.createdAt
        });
        console.log(`Migrated Farmer: ${farmer.fullName}`);
      } else {
        console.log(`User ${farmer.fullName} already exists in User collection.`);
      }
    }

    // 2. Get all Buyers
    const buyers = await Buyer.find({}).select("+password");
    console.log(`Found ${buyers.length} buyers to migrate.`);

    for (const buyer of buyers) {
      // Check if user already exists in User collection
      let user = await User.findById(buyer._id);
      if (!user) {
        // Create matching User
        console.log(`Migrating Buyer: ${buyer.fullName} with password length: ${buyer.password ? buyer.password.length : 'MISSING'}`);

        await User.create({
          _id: buyer._id, // KEEP THE SAME ID
          fullName: buyer.fullName,
          phone: buyer.phone,
          password: buyer.password, // Already hashed
          role: "buyer",
          address: buyer.address,
          city: buyer.city,
          district: buyer.district,
          province: buyer.province,
          lat: buyer.lat,
          lng: buyer.lng,
          image: buyer.image,
          isAdmin: buyer.isAdmin,
          createdAt: buyer.createdAt
        });
        console.log(`Migrated Buyer: ${buyer.fullName}`);
      } else {
         console.log(`User ${buyer.fullName} already exists in User collection.`);
      }
    }

    console.log("Migration Completed Successfully.");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

migrateUsers();
