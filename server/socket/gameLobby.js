// server/gameLobby.js
const mongoose = require("mongoose");
const cardManager = require("./cardManager");
const { getDefaultDeck } = require("../controllers/deckService");
const { getCardsByIds } = require("../controllers/cardService");

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
    battleSimulationsRemaining: 0,
    battleFinished: false,
  };
}

// Get player's default deck or create a fallback deck
async function getPlayerDeck(userId) {
  try {
    // Try to get the player's default deck
    const defaultDeck = await getDefaultDeck(userId);

    if (defaultDeck && defaultDeck.cards && defaultDeck.cards.length > 0) {
      console.log(`Using player's default deck: ${defaultDeck.name}`);
      // Convert the player's deck to the game format
      const gameReadyDeck = await cardManager.initializePlayerDeckFromUserDeck({
        cards: await getCardsByIds(defaultDeck.cards),
      });

      return {
        deck: gameReadyDeck,
        deckId: defaultDeck._id,
        deckName: defaultDeck.name,
      };
    }
  } catch (error) {
    console.error(`Error getting default deck for user ${userId}:`, error);
  }

  // Fallback to standard deck if no user deck is available or on error
  console.log(`Using fallback standard deck for player ${userId}`);
  return {
    deck: cardManager.initializePlayerDeck(),
    deckId: null,
    deckName: "Standard Deck",
  };
}

async function registerHandlers(socket, io, lobbies) {
  socket.on("joinLobby", async (data) => {
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

    // Get player's default deck or fallback
    const playerDeckInfo = await getPlayerDeck(_id);

    const newPlayer = {
      socketId: socket.id,
      username,
      _id,
      readyForStep: false,
      production: 10,
      gold: 0,
      cities: [],
      deck: playerDeckInfo.deck,
      deckId: playerDeckInfo.deckId,
      deckName: playerDeckInfo.deckName,
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
    const { lobbyId, mapData, matchId } = data;
    console.log("Starting game for lobby:", lobbyId);
    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = initLobby(lobbyId);
    }
    const lobby = lobbies[lobbyId];
    lobby.mapData = mapData;
    lobby.phase = "EXPAND";
    lobby.matchId = matchId;

    // Deal initial hands to players
    lobby.players.forEach((player) => {
      // If player doesn't have a deck (unlikely with our new system, but as a fallback)
      if (!player.deck || Object.keys(player.deck).length === 0) {
        console.log(`Player ${player.username} has no deck, using fallback`);
        player.deck = cardManager.initializePlayerDeck();
      }

      // Deal initial hand
      player.currentHand = cardManager.drawHandFromDeck(player.deck, 7);

      if (player.socketId) {
        io.to(player.socketId).emit("handDealt", {
          hand: player.currentHand,
          deckName: player.deckName || "Game Deck",
        });
        console.log(
          "Dealt initial hand to player",
          player.username,
          player.currentHand
        );
      }
    });

    // Prepare grouped cards for client display
    // First combine all unique cards from player decks for this match
    const allUsedCards = new Set();
    lobby.players.forEach((player) => {
      Object.keys(player.deck).forEach((cardId) => allUsedCards.add(cardId));
    });

    // Then fetch card details and group them
    const { baseCardsMapping } = require("./cardManager");
    const groupedCards = {
      citycards: [],
      resourcestructures: [],
      defensivestructures: [],
      units: [],
      effects: [],
    };

    // Group all cards used in this match
    [...allUsedCards].forEach((cardId) => {
      const card = baseCardsMapping[cardId];
      if (card) {
        switch (card.type) {
          case "city":
            groupedCards.citycards.push(card);
            break;
          case "resource":
            groupedCards.resourcestructures.push(card);
            break;
          case "defensive":
            groupedCards.defensivestructures.push(card);
            break;
          case "unit":
            groupedCards.units.push(card);
            break;
          case "effect":
            groupedCards.effects.push(card);
            break;
        }
      }
    });

    io.to(`lobby-${lobbyId}`).emit("gameStarted", {
      mapData,
      matchId,
      players: lobby.players.map(getSafePlayer),
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
      matchId: lobby.matchId,
      players: lobby.players.map(getSafePlayer),
      turnStep: lobby.turnStep,
      cards: {
        deck: player.deck,
        deckName: player.deckName,
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

  // Handle deck viewing - let players see their deck during the game
  socket.on("viewDeck", (data) => {
    const { lobbyId, _id } = data;
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    const player = lobby.players.find((p) => p._id === _id);
    if (!player) return;

    // Convert deck object to array of cards with counts
    const deckCards = [];
    for (const [cardId, count] of Object.entries(player.deck)) {
      const cardInfo = cardManager.baseCardsMapping[cardId];
      if (cardInfo && count > 0) {
        deckCards.push({
          ...cardInfo,
          remainingCount: count,
        });
      }
    }

    // Sort by type and name
    deckCards.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.name.localeCompare(b.name);
    });

    socket.emit("deckDetails", {
      deckName: player.deckName || "Game Deck",
      cards: deckCards,
      cardsRemaining: deckCards.reduce(
        (sum, card) => sum + card.remainingCount,
        0
      ),
    });
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
