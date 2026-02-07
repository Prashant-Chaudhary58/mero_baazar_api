const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");

// Load env vars
dotenv.config({ path: "./config/config.env" });

const clearData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected...".cyan.bold);

        console.log("Clearing Users...".red);
        try { await mongoose.connection.collection('users').drop(); } catch (e) { console.log("users collection not found or empty") }
        
        console.log("Clearing Buyers...".red);
        try { await mongoose.connection.collection('buyers').drop(); } catch (e) { console.log("buyers collection not found or empty") }

        console.log("Clearing Farmers...".red);
        try { await mongoose.connection.collection('farmers').drop(); } catch (e) { console.log("farmers collection not found or empty") }

        console.log("Data Destroyed...".red.inverse);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

clearData();
