// server/socket/index.js
const lobbyManager = require("./gameLobby");
const turnManager = require("./turnManager");
const resourceTerritoryManager = require("./resourceTerritoryManager");
const cardManager = require("./cardManager");
const targetBattleManager = require("./targetBattleManager");
const structureManager = require("./structureManager");
const { registerCardCollectionHandlers } = require("./cardCollectionHandlers");

// Export a function to register all handlers using the provided io instance.
module.exports = function registerSocketHandlers(io) {
  const lobbies = {}; // Central shared game state for all lobbies

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Lobby events: join, selectColor, startGame, requestFullState
    lobbyManager.registerHandlers(socket, io, lobbies);

    // Turn and phase events: playerReady, new turn start, etc.
    turnManager.registerHandlers(socket, io, lobbies);

    // Resource and territory expansion
    resourceTerritoryManager.registerHandlers(socket, io, lobbies);

    // Card events: buyCard, deck initialization, hand dealing, etc.
    cardManager.registerHandlers(socket, io, lobbies);

    // Target and battle planning (selectTarget, etc.)
    targetBattleManager.registerHandlers(socket, io, lobbies);

    // Structure events: buildStructure, buildCity, queueArmy
    structureManager.registerHandlers(socket, io, lobbies);

    // Card collection and deck building events
    registerCardCollectionHandlers(socket, io);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      lobbyManager.handleDisconnect(socket, io, lobbies);
    });
  });
};
