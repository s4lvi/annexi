const lobbies = {};

// Dummy JSON for card definitions
// Dummy JSON for card definitions with associated cost
// Dummy JSON for card definitions with associated cost
const cardData = [
  {
    id: "base-city",
    name: "Base City",
    type: "city",
    reusable: true,
    effect: "Establish your capital city.",
    cost: { production: 10 },
  },
  {
    id: "city-upgrade-1",
    name: "Fortified City",
    type: "city",
    reusable: true,
    effect: "Increases defense and production of city.",
    cost: { production: 20, gold: 1 },
  },
  {
    id: "resource-structure-1",
    name: "Granary",
    type: "resource",
    reusable: true,
    effect: "Increases production by 5.",
    cost: { production: 7 },
  },
  {
    id: "defensive-structure-1",
    name: "Watchtower",
    type: "defensive",
    reusable: true,
    effect: "Increases defense by 2 in adjacent cities.",
    cost: { production: 5 },
  },
  {
    id: "army-unit-1",
    name: "Infantry",
    type: "unit",
    reusable: false,
    effect: "Basic attacking unit.",
    cost: { production: 4 },
  },
  {
    id: "effect-card-1",
    name: "Blitz",
    type: "effect",
    reusable: false,
    effect: "Temporarily doubles production.",
    cost: { production: 8 },
  },
];

function updatePlayerResources(player, socket) {
  // Build a complete resource object.
  const resourceUpdate = {
    production: player.production,
    gold: player.gold || 0,
  };
  socket.emit("resourceUpdate", resourceUpdate);
}

function validateCityPlacement(lobby, tile) {
  lobby.occupiedTiles = lobby.occupiedTiles || new Set();
  if (lobby.occupiedTiles.has(JSON.stringify(tile))) {
    return false;
  }
  return true;
}

function collectResources(lobby, io) {
  lobby.players.forEach((player) => {
    const productionFromCities = player.cities.length * 10;
    player.production += productionFromCities;
    // Emit updated resources to the specific player.
    io.to(player.socketId).emit("resourceUpdate", {
      production: player.production,
      gold: player.gold || 0,
    });
  });
}

function createPhaseTimer(lobbyId, io) {
  const phaseDuration = lobbies[lobbyId].settings.phaseDuration;
  return setInterval(() => {
    try {
      console.log("Changing phase for lobby:", lobbyId);
      lobbies[lobbyId].phase =
        lobbies[lobbyId].phase === "expand" ? "conquer" : "expand";

      if (lobbies[lobbyId].phase === "expand") {
        collectResources(lobbies[lobbyId], io);
      }

      io.to(`lobby-${lobbyId}`).emit("phaseChange", {
        phase: lobbies[lobbyId].phase,
        phaseDuration,
      });
    } catch (error) {
      console.error("Error in phase timer:", error);
    }
  }, phaseDuration);
}

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinLobby", (data) => {
      const { lobbyId, username, _id } = data;
      socket.join(`lobby-${lobbyId}`);

      if (!lobbies[lobbyId]) {
        lobbies[lobbyId] = {
          players: [],
          occupiedTiles: new Set(),
          timer: null,
          phase: "expand",
          settings: {
            phaseDuration: 300000, // 5 minutes (adjust as needed)
          },
        };
      }

      if (lobbies[lobbyId].players.some((p) => p._id === _id)) {
        console.log("Player already in lobby:", username);
        return;
      }

      // Create grouped card types for the player to start with
      const playerCards = {
        citycards: cardData.filter((card) => card.type === "city"),
        resourcestructures: cardData.filter((card) => card.type === "resource"),
        defensivestructures: cardData.filter(
          (card) => card.type === "defensive"
        ),
        units: cardData.filter((card) => card.type === "unit"),
        effects: cardData.filter((card) => card.type === "effect"),
      };

      lobbies[lobbyId].players.push({
        socketId: socket.id,
        username,
        _id,
        ready: false,
        production: 10,
        gold: 0,
        cities: [],
        // Store cards in the player object with the correct grouped structure
        cards: playerCards,
      });

      io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
        players: lobbies[lobbyId].players,
        message: `${username} joined the lobby.`,
      });
    });

    socket.on("startGame", (data) => {
      const { lobbyId, mapData } = data;
      console.log("Starting game for lobby:", lobbyId);
      if (!lobbies[lobbyId]) return;

      lobbies[lobbyId].phase = "expand";

      const groupedCards = {
        citycards: cardData.filter((card) => card.type === "city"),
        resourcestructures: cardData.filter((card) => card.type === "resource"),
        defensivestructures: cardData.filter(
          (card) => card.type === "defensive"
        ),
        units: cardData.filter((card) => card.type === "unit"),
        effects: cardData.filter((card) => card.type === "effect"),
      };

      io.to(`lobby-${lobbyId}`).emit("gameStarted", {
        mapData,
        players: lobbies[lobbyId].players,
        phase: lobbies[lobbyId].phase,
        phaseDuration: lobbies[lobbyId].settings.phaseDuration,
        cards: groupedCards,
        production: lobbies[lobbyId].players[0].production, // example
      });

      if (lobbies[lobbyId].timer) {
        clearInterval(lobbies[lobbyId].timer);
      }
      lobbies[lobbyId].timer = createPhaseTimer(lobbyId, io);
    });

    socket.on("playerReady", (data) => {
      const { lobbyId, username, _id } = data;
      if (lobbies[lobbyId]) {
        lobbies[lobbyId].players = lobbies[lobbyId].players.map((player) => {
          if (player._id === _id) {
            return { ...player, ready: true };
          }
          return player;
        });
        io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
          players: lobbies[lobbyId].players,
          message: `${username} is ready.`,
        });

        const allReady =
          lobbies[lobbyId].players.length > 0 &&
          lobbies[lobbyId].players.every((player) => player.ready);
        if (allReady) {
          console.log(
            `All players in lobby ${lobbyId} are ready. Advancing phase.`
          );
          if (lobbies[lobbyId].timer) {
            clearInterval(lobbies[lobbyId].timer);
          }
          lobbies[lobbyId].phase =
            lobbies[lobbyId].phase === "expand" ? "conquer" : "expand";
          if (lobbies[lobbyId].phase === "expand") {
            collectResources(lobbies[lobbyId], io);
          }
          io.to(`lobby-${lobbyId}`).emit("phaseChange", {
            phase: lobbies[lobbyId].phase,
            phaseDuration: lobbies[lobbyId].settings.phaseDuration,
          });
          lobbies[lobbyId].timer = createPhaseTimer(lobbyId, io);
          lobbies[lobbyId].players = lobbies[lobbyId].players.map((player) => ({
            ...player,
            ready: false,
          }));
          io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
            players: lobbies[lobbyId].players,
            message: `All players were ready. Phase moved to ${lobbies[lobbyId].phase}.`,
          });
        }
      }
    });

    socket.on("buildCity", (data) => {
      console.log("Received buildCity event with data:", data);
      const { lobbyId, tile, _id } = data;
      const lobby = lobbies[lobbyId];
      if (!lobby) return;
      const player = lobby.players.find((p) => p._id === _id);
      if (!player) return;
      if (!validateCityPlacement(lobby, tile)) {
        socket.emit("buildCityError", { message: "Invalid or occupied tile." });
        return;
      }
      const cityCost = 10;
      if (player.production < cityCost) {
        socket.emit("buildCityError", {
          message: "Not enough production resources.",
        });
        return;
      }
      player.production -= cityCost;
      const newCity = { tile, level: 1 };
      player.cities.push(newCity);
      lobby.occupiedTiles.add(JSON.stringify(tile));
      io.to(`lobby-${lobbyId}`).emit("buildCitySuccess", {
        username: player.username,
        type: "city",
        level: newCity.level,
        x: newCity.tile.x,
        y: newCity.tile.y,
        playerId: player._id,
      });
      updatePlayerResources(player, socket);
    });

    socket.on("buyCard", (data) => {
      const { lobbyId, card } = data;
      const lobby = lobbies[lobbyId];
      if (!lobby) return;
      const player = lobby.players.find((p) => p.socketId === socket.id);
      if (!player) return;
      const cardDef = cardData.find((c) => c.id === card.id);
      if (!cardDef) {
        socket.emit("cardPurchaseError", { message: "Card not found." });
        return;
      }
      const cost = cardDef.cost.production;
      if (player.production < cost) {
        socket.emit("cardPurchaseError", {
          message: "Not enough production resources.",
        });
        return;
      }
      player.production -= cost;

      // Initialize cards object if it doesn't exist
      if (!player.cards) {
        player.cards = {
          citycards: [],
          resourcestructures: [],
          defensivestructures: [],
          units: [],
          effects: [],
        };
      }

      // Add the card to the appropriate category
      const category =
        cardDef.type === "city"
          ? "citycards"
          : cardDef.type === "resource"
          ? "resourcestructures"
          : cardDef.type === "defensive"
          ? "defensivestructures"
          : cardDef.type === "unit"
          ? "units"
          : "effects";

      // Make sure the category exists as an array
      if (!player.cards[category]) {
        player.cards[category] = [];
      }

      player.cards[category].push(cardDef);

      socket.emit("cardPurchaseSuccess", {
        card: cardDef,
        message: `${cardDef.name} purchased successfully.`,
        currentCards: player.cards,
        production: player.production,
      });
      updatePlayerResources(player, socket);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      for (const lobbyId in lobbies) {
        const beforeCount = lobbies[lobbyId].players.length;
        lobbies[lobbyId].players = lobbies[lobbyId].players.filter(
          (p) => p.socketId !== socket.id
        );
        if (lobbies[lobbyId].players.length !== beforeCount) {
          io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
            players: lobbies[lobbyId].players,
            message: `A player left the lobby.`,
          });
        }
      }
    });
  });
};
