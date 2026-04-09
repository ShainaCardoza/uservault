const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options ensure stable connections
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`  MongoDB Connected: ${conn.connection.host}`);
    console.log(`  Database: ${conn.connection.name}`);

    // Log when connection is lost
    mongoose.connection.on("disconnected", () => {
      console.warn("  MongoDB disconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("  MongoDB connection error:", err);
    });

    return conn;
  } catch (error) {
    console.error("  MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
