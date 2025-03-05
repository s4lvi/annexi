// server/scripts/seed.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { seedCards } = require("./seedDatabase");

// Load environment variables
dotenv.config();

async function runSeeder() {
  try {
    console.log("Starting database seeding...");

    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/strategy-game",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log("MongoDB connected");

    // Run card seed
    const cardResult = await seedCards();
    console.log(cardResult.message);

    // Disconnect when done
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
    console.log("Seeding complete!");

    return { success: true };
  } catch (error) {
    console.error("Error in seed script:", error);

    // Ensure we disconnect even on error
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error("Error disconnecting from MongoDB:", disconnectError);
    }

    return { success: false, error: error.message };
  }
}

// Run the seeder if this script is executed directly
if (require.main === module) {
  runSeeder()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Unhandled error:", error);
      process.exit(1);
    });
}

module.exports = runSeeder;
