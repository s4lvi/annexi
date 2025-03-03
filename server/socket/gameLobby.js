// server/gameLobby.js

const PLAYER_COLORS = [
  { name: "Red", value: 0xed6a5a, hexString: "#ed6a5a" },
  { name: "Teal", value: 0x5ca4a9, hexString: "#5ca4a9" },
  { name: "Yellow", value: 0xe6af2e, hexString: "#e6af2e" },
  { name: "Purple", value: 0x9370db, hexString: "#9370db" },
  { name: "Pink", value: 0xcf7cc1, hexString: "#cf7cc1" },
  { name: "Brown", value: 0x4f3406, hexString: "#4f3406" },
  { name: "Gray", value: 0x808080, hexString: "#808080" },
  { name: "Navy", value: 0x3d405b, hexString: "#3d405b" },
  { name: "Sage", value: 0x81b29a, hexString: "#81b29a" },
  { name: "Orange", value: 0xf4845f, hexString: "#f4845f" },
  { name: "Slate", value: 0x706677, hexString: "#706677" },
  { name: "Olive", value: 0x8d8741, hexString: "#8d8741" },
  { name: "Coral", value: 0x7b9c91, hexString: "#7b9c91" },
  { name: "Mint", value: 0xc7e9b0, hexString: "#c7e9b0" },
  { name: "Lavender", value: 0xe6e6fa, hexString: "#E6E6FA" },
];

function initLobby(lobbyId) {
  return {
    players: [],
    occupiedTiles: new Set(),
    turnStarted: false,
    turnLock: false, // safeguard against duplicate turn starts
    turnStep: 0,
    pendingCities: [],
    playerTerritories: {},
    tileOwnership: {},
    mapData: null,
    phase: null,
    structures: [],
    battleUnits: [],
  };
}

function registerHandlers(socket, io, lobbies) {
  socket.on("joinLobby", (data) => {
    const { lobbyId, username, _id } = data;
    socket.join(`lobby-${lobbyId}`);
    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = initLobby(lobbyId);
    }
    const lobby = lobbies[lobbyId];

    // Check if the player is reconnecting
    const existingPlayer = lobby.players.find((p) => p._id === _id);
    if (existingPlayer) {
      console.log(`Player ${username} is rejoining lobby ${lobbyId}`);
      if (existingPlayer.disconnectTimeout)
        clearTimeout(existingPlayer.disconnectTimeout);
      existingPlayer.socketId = socket.id;
      existingPlayer.disconnected = false;
      socket.emit("playerStateSync", {
        player: getSafePlayer(existingPlayer),
        message: "Session restored",
      });
      io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
        players: lobby.players.map(getSafePlayer),
        message: `${username} reconnected.`,
      });
      return;
    }

    // New player join
    const takenColors = lobby.players.map((p) => p.color?.value);
    const availableColor =
      PLAYER_COLORS.find((c) => !takenColors.includes(c.value)) ||
      PLAYER_COLORS[0];
    const newPlayer = {
      socketId: socket.id,
      username,
      _id,
      readyForStep: false,
      production: 10,
      gold: 0,
      cities: [],
      deck: {}, // will be set by the card manager on startGame
      inventory: [],
      currentHand: [],
      color: availableColor,
      disconnected: false,
    };
    lobby.players.push(newPlayer);
    io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
      players: lobby.players.map(getSafePlayer),
      message: `${username} joined the lobby.`,
    });
  });

  socket.on("selectColor", (data) => {
    const { lobbyId, _id, colorValue } = data;
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    const isColorTaken = lobby.players.some(
      (p) => p._id !== _id && p.color?.value === colorValue
    );
    if (isColorTaken) {
      socket.emit("colorSelectionError", { message: "Color already taken" });
      return;
    }

    const selectedColor = PLAYER_COLORS.find((c) => c.value === colorValue);
    if (!selectedColor) return;

    lobby.players = lobby.players.map((player) => {
      if (player._id === _id) {
        return { ...player, color: selectedColor };
      }
      return player;
    });

    io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
      players: lobby.players,
      message: `${
        lobby.players.find((p) => p._id === _id)?.username
      } changed color to ${selectedColor.name}.`,
    });
  });

  socket.on("startGame", (data) => {
    const { lobbyId, mapData } = data;
    console.log("Starting game for lobby:", lobbyId);
    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = initLobby(lobbyId);
    }
    const lobby = lobbies[lobbyId];
    lobby.mapData = mapData;
    lobby.phase = "EXPAND";

    // Initialize player decks and deal hands.
    const cardManager = require("./cardManager");
    lobby.players.forEach((player) => {
      if (!player.deck || Object.keys(player.deck).length === 0) {
        player.deck = cardManager.initializePlayerDeck();
      }
      player.currentHand = cardManager.drawHandFromDeck(player.deck, 7);
      if (player.socketId) {
        io.to(player.socketId).emit("handDealt", { hand: player.currentHand });
        console.log(
          "Dealt initial hand to player",
          player.username,
          player.currentHand
        );
      }
    });

    // Group cards for client display (using baseDeckDefinition from cardManager)
    const { baseDeckDefinition } = require("./cardManager");
    const groupedCards = {
      citycards: baseDeckDefinition.filter((card) => card.type === "city"),
      resourcestructures: baseDeckDefinition.filter(
        (card) => card.type === "resource"
      ),
      defensivestructures: baseDeckDefinition.filter(
        (card) => card.type === "defensive"
      ),
      units: baseDeckDefinition.filter((card) => card.type === "unit"),
      effects: baseDeckDefinition.filter((card) => card.type === "effect"),
    };

    io.to(`lobby-${lobbyId}`).emit("gameStarted", {
      mapData,
      players: lobby.players,
      phase: lobby.phase,
      cards: groupedCards,
      production: lobby.players[0]?.production,
    });
  });

  // Request full game state (state synchronization)
  socket.on("requestFullState", (data) => {
    const { lobbyId, _id } = data;
    console.log(`Player ${_id} requested full state for lobby ${lobbyId}`);
    const lobby = lobbies[lobbyId];
    if (!lobby) {
      console.error(`Lobby ${lobbyId} not found for full state request`);
      return;
    }
    const player = lobby.players.find((p) => p._id === _id);
    if (!player) {
      console.error(`Player ${_id} not found in lobby ${lobbyId}`);
      return;
    }
    const fullState = {
      mapData: lobby.mapData,
      players: lobby.players.map(getSafePlayer),
      turnStep: lobby.turnStep,
      cards: {
        deck: player.deck,
        inventory: player.inventory,
        currentHand: player.currentHand,
      },
      territories: lobby.playerTerritories || {},
      cities: [],
      production: player.production,
      gold: player.gold || 0,
    };
    lobby.players.forEach((p) => {
      if (p.cities && Array.isArray(p.cities)) {
        p.cities.forEach((city) => {
          fullState.cities.push({
            x: city.tile.x,
            y: city.tile.y,
            type: "city",
            level: city.level || 1,
            playerId: p._id,
          });
        });
      }
    });
    socket.emit("fullStateUpdate", fullState);
  });
}

function handleDisconnect(socket, io, lobbies) {
  Object.keys(lobbies).forEach((lobbyId) => {
    const lobby = lobbies[lobbyId];
    lobby.players.forEach((player) => {
      if (player.socketId === socket.id) {
        console.log(`Marking player ${player.username} as disconnected`);
        player.socketId = null;
        player.disconnected = true;
        player.disconnectTimeout = setTimeout(() => {
          lobby.players = lobby.players.filter((p) => p._id !== player._id);
          io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
            players: lobby.players.map(getSafePlayer),
            message: `${player.username} has left the lobby.`,
          });
        }, 10000);
      }
    });
  });
}

function getSafePlayer(player) {
  const { disconnectTimeout, ...safePlayer } = player;
  return safePlayer;
}

module.exports = {
  registerHandlers,
  handleDisconnect,
  initLobby,
};
