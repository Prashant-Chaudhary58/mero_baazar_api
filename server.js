const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const colors = require("colors");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Load environment variables
dotenv.config({ path: "./config/config.env" });

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const allowedOrigins = [
  'http://localhost:3000',         // Web frontend (Next.js)
  'http://localhost:5001',         
  'http://10.0.2.2:5001',         
  'http://127.0.0.1:5001',         
  'http://172.30.111.197:5001',    //current Wi-Fi IP

];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile native apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`); // Helpful log for debugging
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,                 // Required for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


// app.use(cors());   //used for development

const path = require("path");

// Routes
const authRoutes = require("./routes/auth_route");
const productRoutes = require("./routes/product_route");

// Set static folder
app.use(express.static(path.join(__dirname, "public")));
// Explicitly serve uploads to be sure
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/admin", require("./routes/admin_route"));

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
