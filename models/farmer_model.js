const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const FarmerSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, "Please add a phone number"],
    unique: true,
  },
  fullName: {
    type: String,
    required: [true, "Please add a name"],
  },
  password: {
    type: String,
    required: [true, "Please add a password"],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ["seller"],
    default: "seller",
  },
  image: {
    type: String,
    default: "no-photo.jpg",
  },
  address: String,
  city: String,
  district: String,
  province: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcrypt
FarmerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
FarmerSchema.methods.getSignedJwtToken = function () {
  // IMPORTANT: Role is 'seller' for farmers
  return jwt.sign({ id: this._id, role: 'seller' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
FarmerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Farmer", FarmerSchema, "farmers");
