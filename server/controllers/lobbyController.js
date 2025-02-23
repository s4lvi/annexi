// server/controllers/lobbyController.js
const Lobby = require("../models/lobby");
const { generateHexGrid } = require("../utils/mapGenerator");

let lobbies = []; // In-memory lobby storage

exports.createLobby = (req, res) => {
  const { hostUserId, lobbyName } = req.body;
  if (!hostUserId || !lobbyName) {
    return res.status(400).json({ message: "Missing parameters" });
  }
  const lobby = new Lobby(lobbyName, hostUserId);
  lobbies.push(lobby);
  res.status(201).json({ message: "Lobby created successfully", lobby });
};

exports.listLobbies = (req, res) => {
  res.json({ lobbies });
};

exports.startGame = (req, res) => {
  const { lobbyId, mapRadius } = req.body;
  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby) {
    return res.status(404).json({ message: "Lobby not found" });
  }
  // Generate a random hex grid map (using a default radius if not provided)
  const mapData = generateHexGrid(mapRadius || 3);
  lobby.mapData = mapData;
  // In a full implementation, you might broadcast via Socket.IO here.
  res.json({ message: "Game started", lobby, mapData });
};
