const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/user_model');
const dotenv = require('dotenv');

dotenv.config({ path: './config/config.env' });

const testFetch = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ fullName: "Balen shah" });
    
    if (!user) {
      console.log("User not found");
      process.exit();
    }

    const imageFilename = user.image;
    console.log(`User Image Filename: ${imageFilename}`);
    
    // Test fetch from localhost
    const url = `http://localhost:5001/uploads/users/${imageFilename}`;
    console.log(`Testing URL: ${url}`);
    
    try {
      const res = await axios.get(url);
      console.log(`Fetch Result: ${res.status} ${res.statusText}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);
      console.log("SUCCESS: Image is accessible via localhost.");
    } catch (fetchErr) {
      console.error(`FETCH ERROR: ${fetchErr.message}`);
      if (fetchErr.response) {
        console.error(`Status: ${fetchErr.response.status}`);
      }
    }

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

testFetch();
