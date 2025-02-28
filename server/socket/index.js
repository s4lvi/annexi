// server/socket/index.js
const lobbies = {};

const baseDeckDefinition = [
  {
    id: "base-city",
    name: "Base City",
    type: "city",
    effect: "Establish your capital city.",
    cost: { production: 10 },
    count: 1,
    alwaysInInventory: true, // This card is always available
    hideFromInventory: true, // It will never show up in the inventory UI
  },
  {
    id: "city-upgrade-1",
    name: "Fortified City",
    type: "city",
    effect: "Increases defense and production of city.",
    cost: { production: 20, gold: 1 },
    count: 3,
  },
  {
    id: "defensive-structure-1",
    name: "Watchtower",
    type: "defensive",
    effect: "Shoots arrows up to 4 tiles.",
    cost: { production: 2 },
    count: 5,
  },
  {
    id: "defensive-structure-2",
    name: "Wall",
    type: "defensive",
    reusable: true,
    effect: "Blocks 1 tile.",
    cost: { production: 1 },
    count: 20,
  },
  {
    id: "defensive-structure-3",
    name: "Archer",
    type: "defensive",
    reusable: true,
    effect: "Shoots arrows up to 3 tiles.",
    cost: { production: 1 },
    count: 10,
  },
  {
    id: "army-unit-1",
    name: "Militia",
    type: "unit",
    reusable: false,
    effect: "Basic attacking unit.",
    cost: { production: 1 },
    count: 10,
  },
  {
    id: "army-unit-2",
    name: "Light Infantry",
    type: "unit",
    reusable: false,
    effect: "Basic attacking unit.",
    cost: { production: 2 },
    count: 5,
  },
];

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

const PHASES = {
  EXPAND: "expand", // Collect resources, build city, purchase cards
  CONQUER: "conquer", // Territory expansion, place defensive structures, queue armies, select targets
  RESOLUTION: "resolution", // Battles, territory connectivity check
};

// Create a mapping for easy lookup by card id:
const baseCardsMapping = {};
baseDeckDefinition.forEach((card) => {
  baseCardsMapping[card.id] = card;
});

// Returns a deck object mapping card id to count.
function initializePlayerDeck() {
  const deck = {};
  baseDeckDefinition.forEach((card) => {
    deck[card.id] = card.count;
  });
  return deck;
}

// Draw a random hand from the deck (without affecting the persistent counts for unpurchased cards)
function drawHandFromDeck(deck, handSize, cardMapping) {
  console.log("Drawing hand from deck:", deck);
  let pool = [];
  for (const cardId in deck) {
    const count = deck[cardId];
    // Add copies based on count
    for (let i = 0; i < count; i++) {
      pool.push(cardMapping[cardId]);
    }
  }
  // Shuffle pool (assume shuffleArray is defined)
  shuffleArray(pool);
  return pool.slice(0, handSize);
}

function initLobby(lobbyId) {
  return {
    players: [],
    occupiedTiles: new Set(),
    timer: null,
    pendingCities: [],
    playerTerritories: {},
    tileOwnership: {},
    settings: {
      phaseDuration: 300000, // 5 minutes
    },
    turnStarted: false, // Ensure new turn logic runs only once.
    phaseTransitionInProgress: false, // Guard for phase transition
    turnStep: 0,
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
  lobby.turnStep = 0;
  // Collect resources for each player.
  collectResources(lobby, io);
  // Reset pending cities.
  lobby.pendingCities = [];

  lobby.players.forEach((player) => {
    player.currentHand = drawHandFromDeck(player.deck, 7, baseCardsMapping);
    console.log(
      `Dealt hand for player ${player.username}:`,
      player.currentHand
    );
    if (player.socketId) {
      io.to(player.socketId).emit("handDealt", { hand: player.currentHand });
    }
  });
  console.log(`Resources collected for lobby ${lobbyId} at turn start.`);
  // Emit game state update with grouped cards from baseDeckDefinition.
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
  io.to(`lobby-${lobbyId}`).emit("gameStateUpdate", {
    turnStep: lobby.turnStep,
    players: lobby.players,
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

function updatePlayerCards(player, socket) {
  console.log("Updating player cards:", player.username, player.inventory);
  const cardsUpdate = {
    inventory: player.inventory,
  };
  socket.emit("cardsUpdate", cardsUpdate);
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

  // Track the expansion frontier for each city separately
  lobby.cityExpansionFrontiers = {};

  // Initialize city frontiers with just the city tiles
  lobby.pendingCities.forEach((city, cityIndex) => {
    const { x, y, playerId } = city;
    const cityId = `city_${cityIndex}_${playerId}`;

    // Add the city tile to territory (if not already owned)
    addToPlayerTerritory(lobby, playerId, x, y);

    // Initialize this city's expansion frontier
    lobby.cityExpansionFrontiers[cityId] = new Set([`${x},${y}`]);
  });

  // Setup the ring-by-ring expansion
  lobby.maxRings = 6; // Default expansion radius
  lobby.currentRing = 1;

  // Process first ring immediately
  processNextExpansionRing(lobby, io, lobbyId);
}

function processNextExpansionRing(lobby, io, lobbyId) {
  const currentRing = lobby.currentRing;
  console.log(`Processing ring ${currentRing} for territory expansion`);

  if (currentRing > lobby.maxRings) {
    // Expansion complete
    console.log("Territory expansion complete - all rings processed");
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "Territory expansion complete",
    });
    lobby.pendingCities = [];
    return;
  }

  const mapData = lobby.mapData;

  // Store candidates for this ring
  const ringCandidates = [];

  // Process each city's expansion separately
  Object.keys(lobby.cityExpansionFrontiers).forEach((cityId) => {
    const currentFrontier = Array.from(lobby.cityExpansionFrontiers[cityId]);
    const cityPlayerId = cityId.split("_")[2]; // Extract player ID from cityId

    // Create a new frontier for the next ring
    const nextFrontier = new Set();

    // For each tile in current frontier, find adjacent tiles
    currentFrontier.forEach((coordStr) => {
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

        const tileKey = `${newX},${newY}`;

        // Check if tile is owned by another player (not this player)
        if (
          lobby.tileOwnership[tileKey] &&
          lobby.tileOwnership[tileKey] !== cityPlayerId
        ) {
          return; // Skip if owned by someone else
        }

        // Add to the next frontier for this city
        nextFrontier.add(tileKey);

        // Add to candidates for claiming if not already owned by this player
        if (
          !lobby.tileOwnership[tileKey] ||
          lobby.tileOwnership[tileKey] !== cityPlayerId
        ) {
          ringCandidates.push({
            x: newX,
            y: newY,
            playerId: cityPlayerId,
            ring: currentRing,
          });
        }
      });
    });

    // Update the frontier for next ring
    lobby.cityExpansionFrontiers[cityId] = nextFrontier;
  });

  console.log("Found candidates for ring", currentRing, ringCandidates.length);

  // Shuffle the candidates to randomize expansion
  shuffleArray(ringCandidates);

  // Process this ring's candidates
  const claims = [];
  ringCandidates.forEach((candidate) => {
    const { x, y, playerId } = candidate;
    const claimed = addToPlayerTerritory(lobby, playerId, x, y);
    if (claimed) {
      claims.push({ x, y, playerId });
    }
  });

  console.log(`Ring ${currentRing} processed with ${claims.length} claims`);

  // Send updates to clients for this ring
  if (claims.length > 0) {
    console.log(
      `Sending batch of ${claims.length} territory updates for ring ${currentRing}`
    );
    console.log("Sending claims to lobby:", lobbyId);
    io.to(`lobby-${lobbyId}`).emit("territoryUpdate", {
      claims,
      currentRing,
      remainingInRing: 0,
      remainingClaims: lobby.maxRings - currentRing,
    });
  }

  // Increment ring and process next ring after a delay
  lobby.currentRing++;

  // Process the next ring after a delay for visual effect
  setTimeout(() => {
    processNextExpansionRing(lobby, io, lobbyId);
  }, 200);
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

  // If tile is already owned by another player, don't claim it
  if (
    lobby.tileOwnership[tileKey] &&
    lobby.tileOwnership[tileKey] !== playerId
  ) {
    return false;
  }

  // If this player already owns the tile, no need to claim again
  if (lobby.tileOwnership[tileKey] === playerId) {
    return false; // Not a new claim
  }

  // Claim the tile for this player
  lobby.tileOwnership[tileKey] = playerId;
  lobby.playerTerritories[playerId].push({ x, y });
  return true; // Successfully claimed
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getSafePlayer(player) {
  const { disconnectTimeout, ...safePlayer } = player;
  return safePlayer;
}

function getSafePlayers(players) {
  return players.map(getSafePlayer);
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

      // Check for an existing player with the same _id
      const existingPlayerIndex = lobbies[lobbyId].players.findIndex(
        (p) => p._id === _id
      );

      if (existingPlayerIndex !== -1) {
        console.log(
          `Player ${username} (${_id}) is returning to lobby ${lobbyId}`
        );
        const existingPlayer = lobbies[lobbyId].players[existingPlayerIndex];

        // If the player was marked as disconnected, cancel the removal timeout
        if (existingPlayer.disconnected) {
          clearTimeout(existingPlayer.disconnectTimeout);
          existingPlayer.disconnected = false;
        }

        // Update the player's socket ID
        existingPlayer.socketId = socket.id;

        // Send the restored state to the reconnecting player
        socket.emit("playerStateSync", {
          player: getSafePlayer(existingPlayer),
          message: "Your session has been restored.",
        });

        // Notify others in the lobby
        io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
          players: getSafePlayers(lobbies[lobbyId].players),
          message: `${username} has reconnected.`,
        });
        return;
      }

      // If no existing player was found, add them as a new player
      const takenColors = lobbies[lobbyId].players.map((p) => p.color?.value);
      const availableColor =
        PLAYER_COLORS.find((color) => !takenColors.includes(color.value)) ||
        PLAYER_COLORS[0];

      lobbies[lobbyId].players.push({
        socketId: socket.id,
        username,
        _id,
        ready: false,
        readyForStep: false,
        production: 10,
        gold: 0,
        cities: [],
        deck: initializePlayerDeck(),
        inventory: [],
        currentHand: [],
        color: availableColor,
        disconnected: false,
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

      lobbies[lobbyId].players.forEach((player) => {
        player.currentHand = drawHandFromDeck(player.deck, 7, baseCardsMapping);
        if (player.socketId) {
          io.to(player.socketId).emit("handDealt", {
            hand: player.currentHand,
          });
          console.log(
            "Dealt initial hand to player",
            player.username,
            player.currentHand
          );
        }
      });

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
        players: lobbies[lobbyId].players,
        phase: lobbies[lobbyId].phase,
        cards: groupedCards,
        production: lobbies[lobbyId].players[0].production,
      });
    });

    socket.on("selectColor", (data) => {
      const { lobbyId, _id, colorValue } = data;
      if (!lobbies[lobbyId]) return;

      // Check if color is already taken by another player
      const isColorTaken = lobbies[lobbyId].players.some(
        (p) => p._id !== _id && p.color?.value === colorValue
      );

      if (isColorTaken) {
        socket.emit("colorSelectionError", { message: "Color already taken" });
        return;
      }

      // Find the color object
      const selectedColor = PLAYER_COLORS.find((c) => c.value === colorValue);
      if (!selectedColor) return;

      // Update player's color
      lobbies[lobbyId].players = lobbies[lobbyId].players.map((player) => {
        if (player._id === _id) {
          return { ...player, color: selectedColor };
        }
        return player;
      });

      // Broadcast updated player list
      io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
        players: lobbies[lobbyId].players,
        message: `${
          lobbies[lobbyId].players.find((p) => p._id === _id)?.username
        } changed color to ${selectedColor.name}.`,
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

      // Prepare the complete game state using the new card system
      const fullState = {
        mapData: lobby.mapData,
        players: getSafePlayers(lobby.players),
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
      const lobby = lobbies[lobbyId];
      if (!lobby) return;

      // Mark the player as ready for this step.
      const player = lobby.players.find((p) => p._id === _id);
      if (!player) return;
      player.readyForStep = true;

      io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
        players: getSafePlayers(lobby.players),
        message: `${username} is ready for step ${lobby.turnStep}.`,
      });

      // Check if all players are ready for the current turnStep.
      const allReady = lobby.players.every((p) => p.readyForStep);
      if (allReady) {
        // Reset each player's ready flag.
        lobby.players.forEach((p) => (p.readyForStep = false));

        if (lobby.turnStep < 6) {
          // Advance to the next step.
          lobby.turnStep++;
          io.to(`lobby-${lobbyId}`).emit("stepCompleted", {
            turnStep: lobby.turnStep,
          });

          // At step 2, start territory expansion.
          if (lobby.turnStep === 2) {
            console.log(
              "All players ready for step 2: starting territory expansion."
            );
            startTerritoryExpansion(lobbyId, io);
          }
        } else {
          // turnStep === 6: battle phase. Emit completion and then, after a delay, reset for a new turn.
          io.to(`lobby-${lobbyId}`).emit("stepCompleted", {
            turnStep: lobby.turnStep,
          });
          console.log(
            "All players ready for step 6: battle phase. Resolving battle..."
          );
          // (Insert any battle simulation logic here if desired.)
          setTimeout(() => {
            // After battle resolution, reset the turn.
            lobby.turnStarted = false;
            lobby.turnStep = 0;
            startNewTurn(lobbyId, io);
          }, 1000);
        }
      }
    });

    socket.on("buildStructure", (data) => {
      const { lobbyId, structure, tile, _id } = data;
      const lobby = lobbies[lobbyId];
      if (!lobby) return;

      const player = lobby.players.find((p) => p._id === _id);
      if (!player) return;

      // Validate tile: similar to validateCityPlacement
      if (!validateCityPlacement(lobby, tile, _id)) {
        socket.emit("buildStructureError", {
          message:
            "Invalid tile: must be within your territory and unoccupied.",
        });
        return;
      }

      // No limit on structures: verify the player has the card in inventory
      const cardIndex = player.inventory.findIndex(
        (card) => card.id === structure.id
      );
      if (cardIndex === -1) {
        socket.emit("buildStructureError", {
          message: "Defensive structure card not in inventory.",
        });
        return;
      }

      // Deduct the card: remove it from inventory
      const [placedCard] = player.inventory.splice(cardIndex, 1);

      // Shuffle the card back into the deck: increment its count in the deck
      if (player.deck[structure.id] !== undefined) {
        player.deck[structure.id]++;
      }

      // Mark the tile as occupied (reusing your mechanism)
      lobby.occupiedTiles = lobby.occupiedTiles || new Set();
      lobby.occupiedTiles.add(JSON.stringify(tile));

      // Add the structure to the game state (you might have a structures array in the lobby)
      if (!lobby.structures) {
        lobby.structures = [];
      }
      lobby.structures.push({ ...tile, playerId: _id, structure: placedCard });

      // Emit a success event with updated state to all clients
      io.to(`lobby-${lobbyId}`).emit("buildStructureSuccess", {
        structure: placedCard,
        tile,
        playerId: _id,
        message: `${player.username} placed a ${placedCard.name}.`,
      });

      // Also, update resources or any other player info if needed.

      updatePlayerResources(player, socket);
      updatePlayerCards(player, socket); // Assuming you have a function to update player cards
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
      const { lobbyId, card, _id } = data;
      const lobby = lobbies[lobbyId];
      if (!lobby) return;
      const player = lobby.players.find((p) => p._id === _id);
      if (!player) return;

      // Verify the card exists in the player's current hand.
      const handIndex = player.currentHand.findIndex((c) => c.id === card.id);
      if (handIndex === -1) {
        socket.emit("cardPurchaseError", {
          message: "Card not available in hand.",
        });
        return;
      }

      const cardDef = baseCardsMapping[card.id];
      if (!cardDef) {
        socket.emit("cardPurchaseError", {
          message: "Card definition not found.",
        });
        return;
      }

      const cost = cardDef.cost.production;
      if (player.production < cost) {
        socket.emit("cardPurchaseError", {
          message: "Not enough production resources.",
        });
        return;
      }

      // Process the purchase: deduct cost, remove the card from the current hand, update deck count.
      player.production -= cost;
      player.currentHand.splice(handIndex, 1);

      // Permanently remove one copy from the player's deck.
      if (player.deck[card.id] > 0) {
        player.deck[card.id]--;
      }

      // Add the card to the player's inventory unless it should be hidden.
      if (!cardDef.hideFromInventory) {
        player.inventory.push(cardDef);
      }

      // Emit the updated state, including the updated hand.
      socket.emit("cardPurchaseSuccess", {
        card: cardDef,
        message: `${cardDef.name} purchased successfully.`,
        currentCards: player.inventory,
        production: player.production,
        hand: player.currentHand, // Updated hand after removal.
      });
      updatePlayerResources(player, socket);
    });

    socket.on("queueArmy", (data) => {
      const { lobbyId, _id, selectedCards } = data;
      const lobby = lobbies[lobbyId];
      if (!lobby) {
        socket.emit("queueArmyError", { message: "Lobby not found." });
        return;
      }
      const player = lobby.players.find((p) => p._id === _id);
      if (!player) {
        socket.emit("queueArmyError", { message: "Player not found." });
        return;
      }

      // Verify that the number of queued cards does not exceed the number of cities.
      const maxQueueLength = player.cities ? player.cities.length : 0;
      if (selectedCards.length > maxQueueLength) {
        socket.emit("queueArmyError", { message: "Too many units selected." });
        return;
      }

      // Remove each selected card from the player's inventory permanently.
      selectedCards.forEach((card) => {
        const index = player.inventory.findIndex(
          (invCard) => invCard.id === card.id
        );
        if (index !== -1) {
          player.inventory.splice(index, 1);
        }
      });

      // Save the queued army order for later resolution.
      player.queuedArmy = selectedCards;

      // Notify the client that the update was successful.
      socket.emit("updateCards", {
        inventory: player.inventory,
        message: "Army queued successfully.",
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      for (const lobbyId in lobbies) {
        lobbies[lobbyId].players.forEach((player) => {
          if (player.socketId === socket.id) {
            console.log(`Marking player ${player.username} as disconnected`);
            // Mark the player as disconnected and clear the current socketId
            player.socketId = null;
            player.disconnected = true;
            // Set a timeout to remove the player if they do not reconnect within 10 seconds
            player.disconnectTimeout = setTimeout(() => {
              console.log(
                `Removing player ${player.username} due to prolonged disconnection`
              );
              lobbies[lobbyId].players = lobbies[lobbyId].players.filter(
                (p) => p._id !== player._id
              );
              io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
                players: getSafePlayers(lobbies[lobbyId].players),
                message: `${player.username} has left the lobby.`,
              });
            }, 10000); // 10 seconds grace period
          }
        });
      }
    });
  });
};
