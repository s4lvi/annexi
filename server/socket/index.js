const lobbies = {};

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
  // {
  //   id: "resource-structure-1",
  //   name: "Granary",
  //   type: "resource",
  //   reusable: true,
  //   effect: "Increases production by 5.",
  //   cost: { production: 7 },
  // },
  {
    id: "defensive-structure-1",
    name: "Watchtower",
    type: "defensive",
    reusable: true,
    effect: "Shoots arrows up to 4 tiles.",
    cost: { production: 2 },
  },
  {
    id: "defensive-structure-2",
    name: "Wall",
    type: "defensive",
    reusable: true,
    effect: "Blocks 1 tile.",
    cost: { production: 1 },
  },
  {
    id: "defensive-structure-3",
    name: "Archer",
    type: "defensive",
    reusable: true,
    effect: "Shoots arrows up to 3 tiles.",
    cost: { production: 1 },
  },
  {
    id: "army-unit-1",
    name: "Militia",
    type: "unit",
    reusable: false,
    effect: "Basic attacking unit.",
    cost: { production: 1 },
  },
  {
    id: "army-unit-2",
    name: "Light Infantry",
    type: "unit",
    reusable: false,
    effect: "Basic attacking unit.",
    cost: { production: 2 },
  },
  // {
  //   id: "effect-card-1",
  //   name: "Blitz",
  //   type: "effect",
  //   reusable: false,
  //   effect: "Temporarily doubles production.",
  //   cost: { production: 8 },
  // },
];

const PHASES = {
  EXPAND: "expand", // Collect resources, build city, purchase cards
  CONQUER: "conquer", // Territory expansion, place defensive structures, queue armies, select targets
  RESOLUTION: "resolution", // Battles, territory connectivity check
};

function initLobby(lobbyId) {
  return {
    players: [],
    occupiedTiles: new Set(),
    timer: null,
    phase: PHASES.EXPAND,
    pendingCities: [],
    playerTerritories: {},
    tileOwnership: {},
    settings: {
      phaseDuration: 300000, // 5 minutes
    },
    turnStarted: false, // Ensure new turn logic runs only once.
    phaseTransitionInProgress: false, // NEW: guard for phase transition
  };
}

// Centralized function to start a new turn.
function startNewTurn(lobbyId, io) {
  const lobby = lobbies[lobbyId];
  if (lobby.turnStarted) {
    console.log(`Turn for lobby ${lobbyId} already started.`);
    return;
  }
  lobby.turnStarted = true;
  // Collect resources for each player.
  collectResources(lobby, io);
  // Reset pending cities.
  lobby.pendingCities = [];
  // Emit phaseChange for expand phase.
  io.to(`lobby-${lobbyId}`).emit("phaseChange", {
    phase: PHASES.EXPAND,
    message: "New turn started! Resources collected.",
    waiting: false,
  });
  console.log(`Resources collected for lobby ${lobbyId} at turn start.`);
  // Emit game state update including available cards.
  const groupedCards = {
    citycards: cardData.filter((card) => card.type === "city"),
    resourcestructures: cardData.filter((card) => card.type === "resource"),
    defensivestructures: cardData.filter((card) => card.type === "defensive"),
    units: cardData.filter((card) => card.type === "unit"),
    effects: cardData.filter((card) => card.type === "effect"),
  };
  io.to(`lobby-${lobbyId}`).emit("gameStateUpdate", {
    phase: PHASES.EXPAND,
    players: lobby.players,
    cards: groupedCards,
    message: "Game state refreshed for new turn",
  });
}

function updatePlayerResources(player, socket) {
  const resourceUpdate = {
    production: player.production,
    gold: player.gold || 0,
  };
  socket.emit("resourceUpdate", resourceUpdate);
}

function validateCityPlacement(lobby, tile, playerId) {
  // Ensure we have a set for occupied tiles
  lobby.occupiedTiles = lobby.occupiedTiles || new Set();

  // Check if the tile is already occupied
  if (lobby.occupiedTiles.has(JSON.stringify(tile))) {
    return false;
  }

  // Get the player
  const player = lobby.players.find((p) => p._id === playerId);
  if (!player) return false;

  // If this is the player's first city, they can place anywhere
  if (!player.cities || player.cities.length === 0) {
    return true;
  }

  // Otherwise, check if the tile is within the player's territory
  const tileKey = `${tile.x},${tile.y}`;
  return lobby.tileOwnership && lobby.tileOwnership[tileKey] === playerId;
}

function computePlayerProduction(player) {
  if (!player.cities || player.cities.length === 0) return 0;
  let total = 0;
  const cities = player.cities;
  cities.forEach((city, i) => {
    let base = i === 0 ? 10 : 1;
    let bonus = 0;
    cities.forEach((otherCity, j) => {
      if (i === j) return;
      const dx = city.tile.x - otherCity.tile.x;
      const dy = city.tile.y - otherCity.tile.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 3) {
        bonus += 0.3;
      } else if (distance <= 5) {
        bonus += 0.1;
      }
    });
    total += base + bonus;
  });
  return Math.floor(total);
}

function collectResources(lobby, io) {
  console.log(`Collecting resources for ${lobby.players.length} players`);
  lobby.players.forEach((player) => {
    if (!player || typeof player !== "object") {
      console.error("Invalid player object in collectResources:", player);
      return;
    }
    const productionFromCities = computePlayerProduction(player);
    const previousProduction = player.production || 0;
    player.production = previousProduction + productionFromCities;
    console.log(
      `Player ${player.username}: production from cities = ${productionFromCities} (Total: ${previousProduction} -> ${player.production})`
    );
    if (player.socketId) {
      io.to(player.socketId).emit("resourceUpdate", {
        production: player.production,
        gold: player.gold || 0,
      });
    } else {
      console.error("Missing socketId for player:", player.username);
    }
  });
}

// Centralized phase-advancement logic.
// Uses a flag to ensure only one advance is processed.
function advancePhase(lobbyId, io) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  // If a phase transition is already in progress, do nothing.
  if (lobby.phaseTransitionInProgress) {
    console.log(`Phase transition already in progress in lobby ${lobbyId}`);
    return;
  }
  lobby.phaseTransitionInProgress = true;

  switch (lobby.phase) {
    case PHASES.EXPAND:
      lobby.phase = PHASES.CONQUER;
      io.to(`lobby-${lobbyId}`).emit("phaseChange", {
        phase: PHASES.CONQUER,
        message: "Phase moved to conquer. Territory expansion starting...",
        waiting: false,
      });
      startTerritoryExpansion(lobbyId, io);
      break;
    case PHASES.CONQUER:
      lobby.phase = PHASES.RESOLUTION;
      io.to(`lobby-${lobbyId}`).emit("phaseChange", {
        phase: PHASES.RESOLUTION,
        message: "Phase moved to resolution. Battle simulation starting...",
        waiting: true,
        waitDuration: 5000,
      });
      // Delay for battle resolution.
      setTimeout(() => {
        lobby.phase = PHASES.EXPAND;
        lobby.turnStarted = false;
        lobby.players.forEach((player) => {
          player.currentPhase = PHASES.EXPAND;
        });
        startNewTurn(lobbyId, io);
        io.to(`lobby-${lobbyId}`).emit("phaseChange", {
          phase: PHASES.EXPAND,
          message:
            "New turn started! Expansion phase - collect resources and build.",
          waiting: false,
        });
        lobby.pendingCities = [];
        lobby.players = lobby.players.map((player) => ({
          ...player,
          ready: false,
        }));
        io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
          players: lobby.players,
          message: "New turn started. Ready status reset.",
        });
      }, 5000);
      break;
    case PHASES.RESOLUTION:
      // This branch is handled in the CONQUER delay.
      break;
    default:
      break;
  }

  // Reset all players' ready status for non-waiting phases.
  if (lobby.phase !== PHASES.RESOLUTION) {
    lobby.players = lobby.players.map((player) => ({
      ...player,
      ready: false,
    }));
    io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
      players: lobby.players,
      message: `Phase advanced to ${lobby.phase}.`,
    });
  }

  // Phase transition finished.
  lobby.phaseTransitionInProgress = false;
}

function startTerritoryExpansion(lobbyId, io) {
  console.log(`Starting territory expansion for lobby ${lobbyId}`);
  const lobby = lobbies[lobbyId];
  if (!lobby) {
    console.error(`No lobby found with ID ${lobbyId}`);
    return;
  }

  const mapData = lobby.mapData;
  if (!mapData) {
    console.error("No map data available for territory expansion");
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "Territory expansion failed - no map data",
    });
    return;
  }

  lobby.playerTerritories = lobby.playerTerritories || {};
  lobby.tileOwnership = lobby.tileOwnership || {};

  if (!lobby.pendingCities || lobby.pendingCities.length === 0) {
    console.log("No pending cities for territory expansion");
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "No new territories to expand",
    });
    return;
  }

  console.log(
    `Found ${lobby.pendingCities.length} pending cities for expansion`
  );

  // Initialize an object to keep track of expanded territories by radius
  lobby.expandedTerritories = {};

  // First, add all city tiles to the initial territories
  lobby.pendingCities.forEach((city) => {
    const { x, y, playerId } = city;
    addToPlayerTerritory(lobby, playerId, x, y);

    if (!lobby.expandedTerritories[playerId]) {
      lobby.expandedTerritories[playerId] = new Set();
    }
    lobby.expandedTerritories[playerId].add(`${x},${y}`);
  });

  // Create expansion queue by rings
  processExpansionByRings(lobby, io, lobbyId);
}

function processExpansionByRings(lobby, io, lobbyId) {
  const mapData = lobby.mapData;
  const maxRings = 6; // Default expansion radius

  // Process each ring one at a time
  for (let currentRing = 1; currentRing <= maxRings; currentRing++) {
    console.log(`Processing ring ${currentRing} for territory expansion`);

    // Store candidates for this ring
    const ringCandidates = [];

    // Check each player's current territories for expansion
    Object.keys(lobby.playerTerritories || {}).forEach((playerId) => {
      // Get the current expansion frontier (territories from previous ring)
      const currentTerritories = Array.from(
        lobby.expandedTerritories[playerId] || new Set()
      );

      if (!currentTerritories.length) return;

      // For each current territory, find valid adjacent tiles
      currentTerritories.forEach((coordStr) => {
        const [x, y] = coordStr.split(",").map(Number);

        // Check the 6 adjacent hexes
        const adjacentOffsets = getHexAdjacencyOffsets(x);

        adjacentOffsets.forEach(([dx, dy]) => {
          const newX = x + dx;
          const newY = y + dy;

          // Skip if out of bounds
          if (
            newX < 0 ||
            newY < 0 ||
            newX >= mapData[0]?.length ||
            newY >= mapData.length
          )
            return;

          // Skip if water or mountain
          const tileType = mapData[newY][newX]?.type;
          if (tileType === "water" || tileType === "mountain") return;

          // Skip if already owned
          const tileKey = `${newX},${newY}`;
          if (lobby.tileOwnership[tileKey]) return;

          // Add to candidates for this ring
          ringCandidates.push({
            x: newX,
            y: newY,
            playerId,
            ring: currentRing,
          });
        });
      });
    });

    // Shuffle the candidates to randomize expansion
    shuffleArray(ringCandidates);

    // Process this ring's candidates
    const claims = [];
    ringCandidates.forEach((candidate) => {
      const { x, y, playerId } = candidate;
      const claimed = addToPlayerTerritory(lobby, playerId, x, y);

      if (claimed) {
        claims.push({ x, y, playerId });

        // Add to expanded territories for next ring
        if (!lobby.expandedTerritories[playerId]) {
          lobby.expandedTerritories[playerId] = new Set();
        }
        lobby.expandedTerritories[playerId].add(`${x},${y}`);
      }
    });

    // Send updates to clients for this ring
    if (claims.length > 0) {
      console.log(
        `Sending batch of ${claims.length} territory updates for ring ${currentRing}`
      );
      io.to(`lobby-${lobbyId}`).emit("territoryUpdate", {
        claims,
        currentRing,
        remainingInRing: 0,
        remainingClaims: maxRings - currentRing,
      });

      // Add a delay between rings for visual effect
      setTimeout(() => {}, 300);
    }
  }

  // Expansion complete
  console.log("Territory expansion complete");
  io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
    message: "Territory expansion complete",
  });
  lobby.pendingCities = [];
}

// Helper function to get adjacent hex coordinates
function getHexAdjacencyOffsets(x) {
  // Hex grid offset pattern depends on whether x is even or odd
  if (x % 2 === 0) {
    return [
      [0, -1], // North
      [1, -1], // Northeast
      [1, 0], // Southeast
      [0, 1], // South
      [-1, 0], // Southwest
      [-1, -1], // Northwest
    ];
  } else {
    return [
      [0, -1], // North
      [1, 0], // Northeast
      [1, 1], // Southeast
      [0, 1], // South
      [-1, 1], // Southwest
      [-1, 0], // Northwest
    ];
  }
}

function processTerritoryExpansion(lobbyId, io) {
  const lobby = lobbies[lobbyId];
  if (!lobby) {
    console.error(
      `No lobby found with ID ${lobbyId} in processTerritoryExpansion`
    );
    return;
  }
  if (!lobby.expansionQueue || lobby.expansionQueue.length === 0) {
    console.log("Territory expansion complete, no more tiles to process");
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "Territory expansion complete",
    });
    return;
  }
  const currentRing = lobby.expansionQueue[0].distanceRing;
  if (currentRing > lobby.currentExpansionRing) {
    lobby.currentExpansionRing = currentRing;
    console.log(`Moving to expansion ring ${currentRing}`);
    setTimeout(() => processTerritoryExpansion(lobbyId, io), 200);
    return;
  }
  const batchSize = 5;
  const claims = [];
  let processedCount = 0;
  while (
    processedCount < batchSize &&
    lobby.expansionQueue.length > 0 &&
    lobby.expansionQueue[0].distanceRing === currentRing
  ) {
    const claim = lobby.expansionQueue.shift();
    const { x, y, playerId } = claim;
    const claimed = addToPlayerTerritory(lobby, playerId, x, y);
    if (claimed) {
      claims.push({ x, y, playerId });
    }
    processedCount++;
  }
  const remainingInRing = lobby.expansionQueue.filter(
    (t) => t.distanceRing === currentRing
  ).length;
  const totalRemaining = lobby.expansionQueue.length;
  if (claims.length > 0) {
    console.log(
      `Sending batch of ${claims.length} territory updates to clients (Ring ${currentRing}, ${remainingInRing} left, ${totalRemaining} total)`
    );
    io.to(`lobby-${lobbyId}`).emit("territoryUpdate", {
      claims,
      currentRing,
      remainingInRing,
      remainingClaims: totalRemaining,
    });
  }
  if (totalRemaining > 0) {
    setTimeout(() => processTerritoryExpansion(lobbyId, io), 100);
  } else {
    console.log("No more territory to process, expansion complete");
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "Territory expansion complete",
    });
    lobby.pendingCities = [];
  }
}

function addToPlayerTerritory(lobby, playerId, x, y) {
  lobby.playerTerritories = lobby.playerTerritories || {};
  lobby.tileOwnership = lobby.tileOwnership || {};
  const mapData = lobby.mapData;
  if (mapData) {
    if (x < 0 || y < 0 || x >= mapData[0]?.length || y >= mapData.length)
      return false;
    const tileType = mapData[y][x]?.type;
    if (tileType === "water" || tileType === "mountain") return false;
  }
  if (!lobby.playerTerritories[playerId]) {
    lobby.playerTerritories[playerId] = [];
  }
  const tileKey = `${x},${y}`;
  if (
    lobby.tileOwnership[tileKey] &&
    lobby.tileOwnership[tileKey] !== playerId
  ) {
    return false;
  }
  lobby.tileOwnership[tileKey] = playerId;
  lobby.playerTerritories[playerId].push({ x, y });
  return true;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinLobby", (data) => {
      const { lobbyId, username, _id } = data;
      socket.join(`lobby-${lobbyId}`);
      if (!lobbies[lobbyId]) {
        lobbies[lobbyId] = initLobby(lobbyId);
      }
      if (lobbies[lobbyId].players.some((p) => p._id === _id)) {
        console.log("Player already in lobby:", username);
        return;
      }
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
      if (!lobbies[lobbyId]) {
        lobbies[lobbyId] = initLobby(lobbyId);
      }
      lobbies[lobbyId].mapData = mapData;
      lobbies[lobbyId].phase = PHASES.EXPAND;
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
        cards: groupedCards,
        production: lobbies[lobbyId].players[0].production,
      });
    });

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

      // Prepare the complete game state
      const fullState = {
        mapData: lobby.mapData,
        players: lobby.players,
        phase: lobby.phase,
        cards: player.cards || {
          citycards: cardData.filter((card) => card.type === "city"),
          resourcestructures: cardData.filter(
            (card) => card.type === "resource"
          ),
          defensivestructures: cardData.filter(
            (card) => card.type === "defensive"
          ),
          units: cardData.filter((card) => card.type === "unit"),
          effects: cardData.filter((card) => card.type === "effect"),
        },
        territories: lobby.playerTerritories || {},
        cities: [],
        production: player.production,
        gold: player.gold || 0,
      };

      // Collect all cities
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

    socket.on("playerReady", (data) => {
      const { lobbyId, username, _id } = data;
      if (!lobbies[lobbyId]) return;

      console.log(`Player ${username} (${_id}) is ready in lobby ${lobbyId}`);

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

        // Immediately set phaseTransitionInProgress to false if it's stuck
        setTimeout(() => {
          if (lobbies[lobbyId] && lobbies[lobbyId].phaseTransitionInProgress) {
            console.log(`Forcing phase transition reset for lobby ${lobbyId}`);
            lobbies[lobbyId].phaseTransitionInProgress = false;
          }

          // Check the conditions again and advance if needed
          if (!lobbies[lobbyId].phaseTransitionInProgress) {
            advancePhase(lobbyId, io);
          }
        }, 500);

        // Try to advance immediately
        if (!lobbies[lobbyId].phaseTransitionInProgress) {
          advancePhase(lobbyId, io);
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

      if (!validateCityPlacement(lobby, tile, _id)) {
        socket.emit("buildCityError", {
          message:
            player.cities && player.cities.length > 0
              ? "Cities must be placed within your territory."
              : "Invalid or occupied tile.",
        });
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
      const newCity = {
        tile,
        level: 1,
        radius: 6,
      };

      player.cities = player.cities || [];
      player.cities.push(newCity);
      lobby.occupiedTiles = lobby.occupiedTiles || new Set();
      lobby.occupiedTiles.add(JSON.stringify(tile));
      lobby.pendingCities = lobby.pendingCities || [];
      lobby.pendingCities.push({
        x: tile.x,
        y: tile.y,
        playerId: _id,
        radius: 6,
      });

      io.to(`lobby-${lobbyId}`).emit("buildCitySuccess", {
        username: player.username,
        type: "city",
        level: newCity.level,
        x: newCity.tile.x,
        y: newCity.tile.y,
        playerId: _id,
      });

      // Also send resource update
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
      if (!player.cards) {
        player.cards = {
          citycards: [],
          resourcestructures: [],
          defensivestructures: [],
          units: [],
          effects: [],
        };
      }
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
