// server/models/user.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ownedCardSchema = new mongoose.Schema({
  cardId: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    required: true,
    default: 1,
  },
});

const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  cards: [String], // Array of card IDs
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const statsSchema = new mongoose.Schema({
  matchesPlayed: {
    type: Number,
    default: 0,
  },
  wins: {
    type: Number,
    default: 0,
  },
  losses: {
    type: Number,
    default: 0,
  },
  winRate: {
    type: Number,
    default: 0,
  },
  favoriteCards: [String], // Most used card IDs
  lastPlayed: Date,
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  currency: {
    type: Number,
    default: 500, // Starting currency
  },
  ownedCards: [ownedCardSchema],
  decks: [deckSchema],
  stats: {
    type: statsSchema,
    default: {},
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Password hashing middleware
userSchema.pre("save", async function (next) {
  try {
    // Only hash the password if it's been modified or is new
    if (!this.isModified("password")) return next();

    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // bcrypt.compare will handle the string comparison with the hashed password
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    throw error;
  }
};

// Pre-save middleware to calculate win rate
userSchema.pre("save", function (next) {
  if (this.isModified("stats.wins") || this.isModified("stats.losses")) {
    const totalMatches = this.stats.wins + this.stats.losses;
    if (totalMatches > 0) {
      this.stats.winRate = Math.round((this.stats.wins / totalMatches) * 100);
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
