// server/models/gameMatch.js
const mongoose = require("mongoose");

const playerDeckSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    ref: "User",
    required: true,
  },
  deckId: mongoose.Schema.Types.ObjectId,
  deckName: String,
  cards: [String], // Array of card IDs used in this match
  performance: {
    cardsPlayed: [String],
    resourcesGenerated: { type: Number, default: 0 },
    unitsDeployed: { type: Number, default: 0 },
    structuresBuilt: { type: Number, default: 0 },
    damageDealt: { type: Number, default: 0 },
  },
});

const gameMatchSchema = new mongoose.Schema({
  lobbyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lobby",
    required: true,
  },
  hostUserId: {
    type: mongoose.Schema.Types.Mixed,
    ref: "User",
    required: true,
  },
  players: [
    {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
    },
  ],
  playerDecks: [playerDeckSchema],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  winnerId: {
    type: mongoose.Schema.Types.Mixed,
    ref: "User",
  },
  status: {
    type: String,
    default: "ongoing",
    enum: ["ongoing", "completed", "abandoned"],
  },
  turns: { type: Number, default: 0 },
  mapConfiguration: mongoose.Schema.Types.Mixed,
  matchStats: {
    duration: Number, // in seconds
    totalCardsPlayed: { type: Number, default: 0 },
    totalResourcesGenerated: { type: Number, default: 0 },
    totalUnitsDeployed: { type: Number, default: 0 },
    totalStructuresBuilt: { type: Number, default: 0 },
    totalDamageDealt: { type: Number, default: 0 },
  },
});

// Calculate match duration when ended
gameMatchSchema.pre("save", function (next) {
  if (this.status === "completed" && this.endedAt && this.startedAt) {
    this.matchStats.duration = Math.floor(
      (this.endedAt - this.startedAt) / 1000
    );
  }
  next();
});

module.exports = mongoose.model("GameMatch", gameMatchSchema);
