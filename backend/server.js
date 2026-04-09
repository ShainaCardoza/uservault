require("dotenv").config();
const express = require("express");
const cors = require('cors'); // Add this at the top with other requires
const app = express();
app.use(cors()); // Add this line right after app = express()
const connectDB = require("./db"); // Remove /config/
const userRoutes = require("./userRoutes"); // Remove /routes/

const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────

app.use(cors({
  origin: "*", // In production, restrict to your frontend domain
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.json({
    message: "User Management System API",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      indexes: "/api/users/meta/indexes",
    },
  });
});

app.use("/api/users", userRoutes);

// ─────────────────────────────────────────────
//  ERROR HANDLER
// ─────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error("❌  Error:", err.message);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation Error", errors });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate value: ${field} already exists`,
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀  Server running on http://localhost:${PORT}`);
    console.log(`📡  API base: http://localhost:${PORT}/api/users\n`);
  });
};

start();
