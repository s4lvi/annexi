// server/scripts/seedDatabase.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Card = require("./models/card");
const cardSeedData = require("./cardSeedData");

// Load environment variables
dotenv.config();

// Define the starter deck composition
const starterDeck = [
  "capital-city",
  "base-city",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-1",
  "defensive-structure-2",
  "defensive-structure-2",
  "defensive-structure-2",
  "defensive-structure-2",
  "defensive-structure-2",
  "defensive-structure-2",
  "defensive-structure-3",
  "defensive-structure-3",
  "defensive-structure-3",
  "defensive-structure-3",
  "defensive-structure-3",
  "defensive-structure-3",
  "defensive-structure-3",
  "defensive-structure-3",
  "defensive-structure-3",
  "army-unit-1",
  "army-unit-1",
  "army-unit-1",
  "army-unit-1",
  "army-unit-1",
  "army-unit-1",
  "army-unit-1",
  "army-unit-1",
  "army-unit-1",
  "army-unit-1",
  "army-unit-2",
  "army-unit-2",
  "army-unit-2",
  "army-unit-2",
  "army-unit-2",
  "army-unit-2",
];

// Function to seed the card repository
async function seedCards() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/strategy-game",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log("MongoDB connected for seeding");

    // Clear existing cards
    await Card.deleteMany({});
    console.log("Cleared existing cards");

    // Insert new cards
    const insertedCards = await Card.insertMany(cardSeedData);
    console.log(`Seeded ${insertedCards.length} cards to the database`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("MongoDB disconnected");

    return {
      success: true,
      message: "Card repository seeded successfully",
      count: insertedCards.length,
    };
  } catch (error) {
    console.error("Error seeding card repository:", error);
    // Make sure to disconnect even if there's an error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    return {
      success: false,
      message: "Failed to seed card repository",
      error: error.message,
    };
  }
}

// Function to get the basic cards every user should have
function getStarterCards() {
  // Filter card seed data to include only basic cards
  return cardSeedData.filter((card) => card.isBasic);
}

// Export functions for use in other parts of the application
module.exports = {
  seedCards,
  getStarterCards,
  starterDeck,
};

// Run seeding if this script is executed directly
if (require.main === module) {
  seedCards()
    .then((result) => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Unhandled error in seed script:", err);
      process.exit(1);
    });
}
