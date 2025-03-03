// server/models/user.js
const mongoose = require("mongoose");

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
