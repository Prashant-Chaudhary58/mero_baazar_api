const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");
const User = require("./models/user_model");

// Load env vars
dotenv.config({ path: "./config/config.env" });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
  } catch (err) {
    console.log(`Error: ${err.message}`.red);
    process.exit(1);
  }
};

const checkUsers = async () => {
  await connectDB();

  try {
    const users = await User.find({});
    console.log("\n--- USERS IN DATABASE ---");
    users.forEach(user => {
        console.log(`ID: ${user._id}`);
        console.log(`Name: ${user.fullName}`);
        console.log(`Phone: ${user.phone}`);
        console.log(`Role: ${user.role}`);
        console.log(`Image: ${user.image}`);
        console.log("-------------------------");
    });
    console.log(`Total Users: ${users.length}`);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkUsers();
