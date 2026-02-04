const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");
const User = require("./models/user_model");

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

const makeAdmin = async () => {
  await connectDB();

  const phone = process.argv[2];

  if (!phone) {
      console.log("Please provide a phone number: node make_admin.js <phone>".yellow);
      process.exit(1);
  }

  try {
    const user = await User.findOne({ phone });
    if (!user) {
        console.log(`User not found with phone ${phone}`.red);
        process.exit(1);
    }

    user.role = 'admin';
    await user.save();
    console.log(`User ${user.fullName} (${user.phone}) is now an ADMIN`.green.bold);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

makeAdmin();
