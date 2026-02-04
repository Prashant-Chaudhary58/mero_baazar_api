const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
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
    enum: ["buyer", "seller", "admin"],
    default: "buyer",
  },
  image: {
    type: String,
    default: "no-photo.jpg",
  },
  email: String,
  dob: String,
  address: String,
  city: String,
  district: String,
  province: String,
  altPhone: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: {
      type: String, 
      enum: ['Point'], 
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0] // [longitude, latitude]
    }
  }
});

// Create geospatial index for radius queries
UserSchema.index({ location: "2dsphere" });

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create separate models for different collections
const User = mongoose.model("User", UserSchema, "users");
const Buyer = mongoose.model("Buyer", UserSchema, "buyers");
const Farmer = mongoose.model("Farmer", UserSchema, "farmers");

module.exports = { User, Buyer, Farmer };
