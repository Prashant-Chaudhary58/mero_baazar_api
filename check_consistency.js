const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");

// Load env vars
dotenv.config({ path: "./config/config.env" });

const User = require("./models/user_model");
const Farmer = require("./models/farmer_model"); // Assuming this model exists

const checkConsistency = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected".green.bold);

    const nameToSearch = "Prachanda"; // Adjust if needed
    // Find in User
    const users = await User.find({ fullName: { $regex: nameToSearch, $options: "i" } });

    console.log(`\nFound ${users.length} users with name matching "${nameToSearch}" in Users collection:`);
    for (const u of users) {
        console.log(`User ID: ${u._id}`);
        console.log(`Name: ${u.fullName}`);
        console.log(`Role: ${u.role}`);
        console.log(`Location: ${u.lat}, ${u.lng}`);
        console.log("-------------------");

        if (u.role === 'seller') {
            const farmer = await Farmer.findById(u._id);
            if (farmer) {
                console.log(`MATCHING FARMER FOUND:`);
                console.log(`Farmer ID: ${farmer._id}`);
                console.log(`Location: ${farmer.lat}, ${farmer.lng}`);
                
                if (u.lat !== farmer.lat || u.lng !== farmer.lng) {
                    console.log("!!! MISMATCH DETECTED !!!".red.bold);
                    console.log(`User Lat: ${u.lat} vs Farmer Lat: ${farmer.lat}`);
                } else {
                    console.log("Data is Consistent".green);
                }
            } else {
                 console.log("No matching farmer document found (Legacy issue?)".yellow);
            }
        }
        console.log("==================================================\n");
    }

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkConsistency();
