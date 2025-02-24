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

// Helper: dummy validation function for city placement
function validateCityPlacement(lobby, tile) {
  // Here you would add your own validation logic based on your game rules
  // For now, assume the tile is valid if it is not already occupied.
  // (Assume each lobby stores a set of occupied tiles.)
  lobby.occupiedTiles = lobby.occupiedTiles || new Set();
  if (lobby.occupiedTiles.has(JSON.stringify(tile))) {
    return false;
  }
  return true;
}

// Helper: collect production resources for each player when entering the "expand" phase.
function collectResources(lobby, io) {
  lobby.players.forEach((player) => {
    // Each city produces 10 production per turn.
    const productionFromCities = player.cities.length * 10;
    // You might also add a base production (starting at 10).
    player.production += productionFromCities;
    // Emit a resource update to the player.
    // (If you want to target a specific socket, you can use io.to(player.socketId))
    io.to(player.socketId).emit("resourceUpdate", {
      production: player.production,
      cities: player.cities,
    });
  });
}

// Function to create or restart the phase timer for a lobby.
function createPhaseTimer(lobbyId, io) {
  const phaseDuration = lobbies[lobbyId].settings.phaseDuration;
  return setInterval(() => {
    try {
      console.log("Changing phase for lobby:", lobbyId);
      // Toggle phase: if "expand", switch to "conquer", and vice-versa.
      lobbies[lobbyId].phase =
        lobbies[lobbyId].phase === "expand" ? "conquer" : "expand";

      // On entering the expand phase, collect resources.
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

      // If the lobby doesn't exist, create it with default settings.
      if (!lobbies[lobbyId]) {
        lobbies[lobbyId] = {
          players: [],
          occupiedTiles: new Set(),
          timer: null,
          phase: "expand",
          settings: {
            phaseDuration: 300000, // default to 30 seconds; changeable later
          },
        };
      }

      // Add the player to the lobby if not already present.
      if (lobbies[lobbyId].players.some((p) => p._id === _id)) {
        console.log("Player already in lobby:", username);
        return;
      }
      // Initialize player state: starting production, no cities, base cards.
      lobbies[lobbyId].players.push({
        socketId: socket.id,
        username,
        _id,
        ready: false,
        production: 10, // starting production resource
        cities: [], // list of built cities; the first city is the capital
        cards: [cardData.find((c) => c.type === "city")], // base city card
      });

      io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
        players: lobbies[lobbyId].players,
        message: `${username} joined the lobby.`,
      });
    });

    // Start game event initializes phase and sets up the phase timer.
    socket.on("startGame", (data) => {
      const { lobbyId, mapData } = data;
      console.log("Starting game for lobby:", lobbyId);
      if (!lobbies[lobbyId]) return;

      lobbies[lobbyId].phase = "expand";

      // Group cards by type.
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
      });

      // Restart the phase timer.
      if (lobbies[lobbyId].timer) {
        clearInterval(lobbies[lobbyId].timer);
      }
      lobbies[lobbyId].timer = createPhaseTimer(lobbyId, io);
    });

    // Handle player ready events.
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
          // If the new phase is "expand", update resources.
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

    // Handle city building event.
    socket.on("buildCity", (data) => {
      console.log("Received buildCity event with data:", data);
      const { lobbyId, tile, _id } = data;
      console.log("Building city on tile:", tile, "for player:", _id);
      const lobby = lobbies[lobbyId];
      if (!lobby) return;
      // Find the player attempting to build.
      const player = lobby.players.find((p) => p._id === _id);
      if (!player) return;
      console.log("Player found:", player.username);
      // Validate tile placement.
      if (!validateCityPlacement(lobby, tile)) {
        socket.emit("buildCityError", { message: "Invalid or occupied tile." });
        return;
      }
      console.log("Tile placement validated for player:", player.username);
      // Assume a fixed city cost of 10 production.
      const cityCost = 10;
      if (player.production < cityCost) {
        socket.emit("buildCityError", {
          message: "Not enough production resources.",
        });
        return;
      }
      console.log("Player has enough resources to build city.");

      // Deduct cost and add new city.
      player.production -= cityCost;
      // Add the city to the player's list (e.g., include tile info and initial level).
      const newCity = { tile, level: 1 };
      player.cities.push(newCity);
      // Mark the tile as occupied.
      lobby.occupiedTiles.add(JSON.stringify(tile));
      console.log("New city added for player:", player.username, newCity);
      // Emit success to all clients in the lobby.
      io.to(`lobby-${lobbyId}`).emit("buildCitySuccess", {
        username: player.username,
        type: newCity.type,
        leve: newCity.level,
        x: newCity.tile.x,
        y: newCity.tile.y,
      });

      // Send updated resource count to the player.
      socket.emit("resourceUpdate", { production: player.production });
    });

    // Handle card selection / purchase.
    socket.on("buyCard", (data) => {
      const { lobbyId, card } = data;
      const lobby = lobbies[lobbyId];
      if (!lobby) return;

      // Find the player.
      const player = lobby.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      // Find the card definition from our dummy data
      const cardDef = cardData.find((c) => c.id === card.id);
      if (!cardDef) {
        socket.emit("cardPurchaseError", { message: "Card not found." });
        return;
      }

      // Check if the player has enough production to buy this card.
      // (Later, you can add checks for special resources like horses, iron, etc.)
      const cost = cardDef.cost.production;
      if (player.production < cost) {
        socket.emit("cardPurchaseError", {
          message: "Not enough production resources.",
        });
        return;
      }

      // Deduct the production cost.
      player.production -= cost;

      // Add the purchased card to the player's cards.
      player.cards = player.cards || [];
      player.cards.push(cardDef);

      // Respond back with a success message and updated production count.
      socket.emit("cardPurchaseSuccess", {
        card: cardDef,
        message: `${cardDef.name} purchased successfully.`,
        currentCards: player.cards,
        production: player.production,
      });
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
