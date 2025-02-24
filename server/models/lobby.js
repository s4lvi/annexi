// server/models/lobby.js
const mongoose = require("mongoose");

const lobbySchema = new mongoose.Schema({
  name: { type: String, required: true },
  hostUserId: {
    type: mongoose.Schema.Types.Mixed,
    ref: "User",
    required: true,
  },
  players: [{ type: mongoose.Schema.Types.Mixed, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  mapData: { type: Array, default: [] },
  gameStarted: { type: Boolean, default: false }, // New field
});

module.exports = mongoose.model("Lobby", lobbySchema);
