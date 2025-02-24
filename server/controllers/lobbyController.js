// server/controllers/lobbyController.js
const Lobby = require("../models/lobby");
const { generateRandomMap } = require("../utils/mapGenerator");

const mongoose = require("mongoose");

exports.createLobby = async (req, res) => {
  const { hostUserId, lobbyName } = req.body;
  if (!hostUserId || !lobbyName) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    // Check if hostUserId is a guest ID (starts with 'guest_')
    const finalHostId = hostUserId.startsWith("guest_")
      ? hostUserId
      : new mongoose.Types.ObjectId(hostUserId);

    const lobby = new Lobby({
      name: lobbyName,
      hostUserId: finalHostId,
      players: [finalHostId],
      gameStarted: false,
    });

    await lobby.save();
    res.status(201).json({ message: "Lobby created successfully", lobby });
  } catch (err) {
    console.error(err);
    // More specific error handling
    if (err instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

exports.listLobbies = async (req, res) => {
  try {
    const lobbies = await Lobby.find({ gameStarted: false });
    res.json({ lobbies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.startGame = async (req, res) => {
  const { lobbyId } = req.body;
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
    // Mark the lobby as having started the game
    lobby.gameStarted = true;
    // Generate a 100x100 random map
    const mapData = generateRandomMap();
    lobby.mapData = mapData;
    await lobby.save();
    console.log("Updatetd lobby:", lobby);
    res.json({ message: "Game started", lobby, mapData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getLobby = async (req, res) => {
  const { lobbyId } = req.params;
  try {
    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ message: "Lobby not found" });
    }
    res.json({ lobby });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
