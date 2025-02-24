// server/models/gameMatch.js
const mongoose = require("mongoose");

const gameMatchSchema = new mongoose.Schema({
  lobbyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lobby",
    required: true,
  },
  hostUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  startedAt: { type: Date, default: Date.now },
  status: { type: String, default: "ongoing" }, // could be "ongoing", "finished", etc.
});

module.exports = mongoose.model("GameMatch", gameMatchSchema);
