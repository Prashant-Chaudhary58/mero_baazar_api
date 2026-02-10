const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");
const User = require("./models/user_model");

dotenv.config({ path: "./config/config.env" });

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected...");
        
        const user = await User.findOne({ fullName: "Balen shah" });
        if (user) {
            console.log("User Found:", user.fullName);
            console.log("Image Field Value:", user.image);
            console.log("Role:", user.role);
        } else {
            console.log("User 'Balen shah' not found.");
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUser();
