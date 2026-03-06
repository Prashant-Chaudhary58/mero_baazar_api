const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Load environment variables (mostly handled by jest/test setup now)
dotenv.config({ path: "./config/config.env" });

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(cors({
  origin: 'http://localhost:3000',     
  credentials: true,                   
}));

// Routes
const authRoutes = require("./routes/auth_route");
const productRoutes = require("./routes/product_route");
const userRoutes = require("./routes/user_route");
const reviewRoutes = require("./routes/review_route");
const chatRoutes = require("./routes/chat_route");
const adminRoutes = require("./routes/admin_route");

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/chats", chatRoutes);
app.use("/api/admin", adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  // Silence console error logs in test mode to keep terminal output clean
  if (process.env.NODE_ENV !== "test") {
      console.error(err);
  }
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || err || "Server Error",
  });
});

module.exports = app;
