// server/controllers/gameMatchController.js
const GameMatch = require("../models/gameMatch");
const Lobby = require("../models/lobby");
const { generateRandomMap } = require("../utils/mapGenerator");
const gameStateManager = require("../gameStateManager");

exports.startMatch = async (req, res) => {
  const { lobbyId, hostUserId, players } = req.body; // assume these are passed from the lobby
  try {
    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ message: "Lobby not found" });
    }
    if (lobby.gameStarted) {
      return res
        .status(400)
        .json({ message: "Game has already started for this lobby." });
    }

    const mapData = generateRandomMap();
    console.log("Generated map data for lobby:", lobbyId);
    // Create the game match metadata document
    const newMatch = new GameMatch({
      lobbyId,
      hostUserId,
      players,
    });
    await newMatch.save();
    lobby.gameStarted = true;
    await lobby.save();

    // Save the volatile game state in memory
    gameStateManager.createGameState(newMatch._id, mapData);

    res.status(201).json({
      message: "Game match started",
      match: newMatch,
      mapData, // this could be sent to the host immediately, and then to other players via socket.io
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
