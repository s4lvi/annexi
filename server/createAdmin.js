// server/scripts/createAdmin.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

dotenv.config();

// Dynamically determine the root directory
const rootDir = path.resolve(__dirname, "..");

// Import models directly using full path to avoid potential circular dependencies
const userModelPath = path.join(rootDir, "models", "user.js");
const User = require("./models/user");

async function createAdminUser() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/strategy-game",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log("MongoDB connected");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ isAdmin: true });
    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.username);
      await mongoose.disconnect();
      console.log("MongoDB disconnected");
      return { success: true, message: "Admin user already exists" };
    }

    // Create a new admin user with a secure password
    const adminPassword = "admin123"; // Change this to a secure password in production
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = new User({
      username: "admin",
      email: "admin@annexi.io",
      password: hashedPassword,
      isAdmin: true,
      currency: 9999, // Give admin plenty of currency for testing
    });

    await adminUser.save();
    console.log("Admin user created successfully:", adminUser.username);

    // Initialize profile separately to avoid circular dependencies
    // This is a simplified version of user initialization
    adminUser.ownedCards = [];
    adminUser.decks = [
      {
        name: "Admin Deck",
        description: "Admin starter deck",
        cards: [],
        isDefault: true,
      },
    ];
    await adminUser.save();

    console.log("Admin user profile initialized");

    await mongoose.disconnect();
    console.log("MongoDB disconnected");
    return { success: true, message: "Admin user created successfully" };
  } catch (error) {
    console.error("Error creating admin user:", error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("MongoDB disconnected after error");
    }
    return { success: false, error: error.message };
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  createAdminUser()
    .then((result) => {
      console.log(result.message || "Operation completed");
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Unhandled error:", error);
      process.exit(1);
    });
}

module.exports = createAdminUser;
