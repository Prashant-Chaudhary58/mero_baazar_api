const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/user_model");
const Farmer = require("./models/farmer_model");

dotenv.config({ path: "./config/config.env" });

const setAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected...");
        
        const fullName = "Balen shah";

        // Update User Collection
        const user = await User.findOneAndUpdate(
            { fullName: fullName },
            { isAdmin: true, role: 'seller' }, // Ensure role is seller if missing
            { new: true }
        );

        if (user) {
            console.log(`Updated User '${fullName}' to Admin.`);
            console.log(user);
        } else {
            console.log(`User '${fullName}' not found in USERS collection.`);
        }

        // Update Farmer Collection (Legacy Sync)
        const farmer = await Farmer.findOneAndUpdate(
            { fullName: fullName },
            { isAdmin: true },
            { new: true }
        );

         if (farmer) {
            console.log(`Updated Farmer '${fullName}' to Admin.`);
        } else {
             console.log(`Farmer '${fullName}' not found in FARMERS collection.`);
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

setAdmin();
