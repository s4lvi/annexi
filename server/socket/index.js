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

const PHASES = {
  EXPAND: "expand", // Collect resources, build city, purchase cards
  CONQUER: "conquer", // Territory expansion, place defensive structures, queue armies, select targets
  RESOLUTION: "resolution", // Battles, territory connectivity check
};

// Add territory management to the global state
function initLobby(lobbyId) {
  return {
    players: [],
    occupiedTiles: new Set(),
    timer: null,
    phase: PHASES.EXPAND,
    pendingCities: [], // Cities built during the current expansion phase
    playerTerritories: {}, // Maps player IDs to their territories
    tileOwnership: {}, // Maps tile coordinates to player IDs
    settings: {
      phaseDuration: 300000, // 5 minutes (adjust as needed)
    },
  };
}

function updatePlayerResources(player, socket) {
  // Build a complete resource object.
  const resourceUpdate = {
    production: player.production,
    gold: player.gold || 0,
  };
  socket.emit("resourceUpdate", resourceUpdate);
}

// add check to make sure city is inside player territory, unless it is the first city in which case it can be placed on any non occupied or water or mountain tile
function validateCityPlacement(lobby, tile) {
  lobby.occupiedTiles = lobby.occupiedTiles || new Set();
  if (lobby.occupiedTiles.has(JSON.stringify(tile))) {
    return false;
  }
  return true;
}

function collectResources(lobby, io) {
  console.log(`Collecting resources for ${lobby.players.length} players`);

  try {
    lobby.players.forEach((player) => {
      // Safety check for valid player object
      if (!player || typeof player !== "object") {
        console.error("Invalid player object in collectResources:", player);
        return;
      }

      // Base production from cities (10 per city)
      const citiesCount = player.cities ? player.cities.length : 0;
      const productionFromCities = citiesCount * 10;

      // Track previous and new values for logging
      const previousProduction = player.production || 0;
      player.production = (player.production || 0) + productionFromCities;

      console.log(
        `Player ${player.username}: ${citiesCount} cities, +${productionFromCities} production (${previousProduction} → ${player.production})`
      );

      // Safety check for valid socketId
      if (!player.socketId) {
        console.error("Missing socketId for player:", player.username);
        return;
      }

      // Emit updated resources to the specific player
      try {
        io.to(player.socketId).emit("resourceUpdate", {
          production: player.production,
          gold: player.gold || 0,
        });
        console.log(
          `Resource update emitted to ${player.username} (${player.socketId})`
        );
      } catch (emitError) {
        console.error("Error emitting resource update:", emitError);
      }
    });
  } catch (error) {
    console.error("Error in collectResources:", error);
  }
}

function createPhaseTimer(lobbyId, io) {
  const phaseDuration = lobbies[lobbyId].settings.phaseDuration;
  return setInterval(() => {
    try {
      // Transition to next phase
      const currentPhase = lobbies[lobbyId].phase;
      console.log(
        `Phase timer triggered for lobby ${lobbyId}, current phase: ${currentPhase}`
      );

      if (currentPhase === PHASES.EXPAND) {
        // Transition from EXPAND to CONQUER
        console.log("Transitioning from EXPAND to CONQUER phase");
        lobbies[lobbyId].phase = PHASES.CONQUER;

        // Start territory expansion at the beginning of CONQUER phase
        startTerritoryExpansion(lobbyId, io);
      } else if (currentPhase === PHASES.CONQUER) {
        // Transition from CONQUER to RESOLUTION
        console.log("Transitioning from CONQUER to RESOLUTION phase");
        lobbies[lobbyId].phase = PHASES.RESOLUTION;

        // Handle battle resolution later
        // processBattles(lobbyId, io);
      } else if (currentPhase === PHASES.RESOLUTION) {
        // Transition from RESOLUTION to EXPAND
        console.log("Transitioning from RESOLUTION to EXPAND phase");
        lobbies[lobbyId].phase = PHASES.EXPAND;

        // Collect resources at the start of EXPAND phase
        collectResources(lobbies[lobbyId], io);

        // Reset pending cities for the new expansion phase
        lobbies[lobbyId].pendingCities = [];
      }

      // Notify clients of the phase change
      io.to(`lobby-${lobbyId}`).emit("phaseChange", {
        phase: lobbies[lobbyId].phase,
        phaseDuration,
      });
    } catch (error) {
      console.error("Error in phase timer:", error);
    }
  }, phaseDuration);
}

function startTerritoryExpansion(lobbyId, io) {
  console.log(`Starting territory expansion for lobby ${lobbyId}`);
  const lobby = lobbies[lobbyId];

  if (!lobby) {
    console.error(`No lobby found with ID ${lobbyId}`);
    return;
  }

  // Get map data from lobby
  const mapData = lobby.mapData;
  if (!mapData) {
    console.error("No map data available for territory expansion");
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "Territory expansion failed - no map data",
    });
    return;
  }

  // Initialize territory structures if needed
  lobby.playerTerritories = lobby.playerTerritories || {};
  lobby.tileOwnership = lobby.tileOwnership || {};

  // Check if we have pending cities for expansion
  if (!lobby.pendingCities || lobby.pendingCities.length === 0) {
    console.log("No pending cities for territory expansion");

    // Even if there are no new cities, we should still notify clients
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "No new territories to expand",
    });
    return;
  }

  console.log(
    `Found ${lobby.pendingCities.length} pending cities for expansion`
  );

  // Create expansion queue with all potential territory tiles
  const expansionQueue = [];

  // Add all potential tiles from all pending cities to the expansion queue
  lobby.pendingCities.forEach((city) => {
    const { x, y, playerId, radius } = city;
    console.log(
      `Adding territory for city at (${x},${y}) for player ${playerId}`
    );

    // Add all tiles within radius to expansion queue
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const tileX = x + dx;
        const tileY = y + dy;

        // Skip if outside map boundaries
        if (
          tileX < 0 ||
          tileY < 0 ||
          tileX >= mapData[0]?.length ||
          tileY >= mapData.length
        ) {
          continue;
        }

        // Check tile type - only claim valid terrain (not water or mountains)
        const tileType = mapData[tileY][tileX]?.type;
        if (tileType === "water" || tileType === "mountain") {
          continue;
        }

        // Calculate distance for circular territory
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= radius) {
          expansionQueue.push({
            x: tileX,
            y: tileY,
            playerId,
            distance, // Store exact distance for ring-based expansion
            distanceRing: Math.ceil(distance), // Round up to nearest integer for ring grouping
            cityX: x, // Store origin city for reference
            cityY: y,
          });
        }
      }
    }
  });

  console.log(
    `Created expansion queue with ${expansionQueue.length} potential tiles`
  );

  // Sort by distance ring (closest to city first)
  expansionQueue.sort((a, b) => a.distanceRing - b.distanceRing);

  // Group tiles by distance ring
  const ringGroups = {};
  expansionQueue.forEach((tile) => {
    const ring = tile.distanceRing;
    if (!ringGroups[ring]) {
      ringGroups[ring] = [];
    }
    ringGroups[ring].push(tile);
  });

  // Shuffle tiles within each ring for randomness
  Object.keys(ringGroups).forEach((ring) => {
    shuffleArray(ringGroups[ring]);
  });

  // Flatten back to a queue, but now organized by rings
  lobby.expansionQueue = [];

  // Add rings in order from inner to outer
  const rings = Object.keys(ringGroups).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );
  rings.forEach((ring) => {
    lobby.expansionQueue.push(...ringGroups[ring]);
  });

  console.log(
    `Organized expansion queue into ${rings.length} concentric rings`
  );

  // Track which ring we're currently processing
  lobby.currentExpansionRing = parseInt(rings[0]);

  // Start processing the territory expansion
  processTerritoryExpansion(lobbyId, io);
}

// Ensure the processTerritoryExpansion function is working correctly
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
    // Expansion complete
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "Territory expansion complete",
    });
    return;
  }

  // Get the current ring we're processing
  const currentRing = lobby.expansionQueue[0].distanceRing;

  // Check if we've moved to a new ring
  if (currentRing > lobby.currentExpansionRing) {
    lobby.currentExpansionRing = currentRing;
    console.log(`Moving to expansion ring ${currentRing}`);

    // Add a slight delay between rings for visual effect
    setTimeout(() => processTerritoryExpansion(lobbyId, io), 200);
    return;
  }

  // Process tiles from the current ring
  const batchSize = 5; // Adjust for desired expansion speed
  const claims = [];
  let processedCount = 0;

  // Process up to batchSize tiles, but only from the current ring
  while (
    processedCount < batchSize &&
    lobby.expansionQueue.length > 0 &&
    lobby.expansionQueue[0].distanceRing === currentRing
  ) {
    const claim = lobby.expansionQueue.shift();
    const { x, y, playerId } = claim;

    // Try to claim the territory
    const claimed = addToPlayerTerritory(lobby, playerId, x, y);

    if (claimed) {
      claims.push({ x, y, playerId });
    }

    processedCount++;
  }

  // Get counts of remaining tiles in current ring and total
  const remainingInRing = lobby.expansionQueue.filter(
    (t) => t.distanceRing === currentRing
  ).length;
  const totalRemaining = lobby.expansionQueue.length;

  // Send batch update to clients if there are claims
  if (claims.length > 0) {
    console.log(
      `Sending batch of ${claims.length} territory updates to clients (Ring ${currentRing}, ${remainingInRing} left in ring, ${totalRemaining} total)`
    );
    io.to(`lobby-${lobbyId}`).emit("territoryUpdate", {
      claims,
      currentRing,
      remainingInRing,
      remainingClaims: totalRemaining,
    });
  }

  // Continue processing if there are more claims, with a slight delay
  if (totalRemaining > 0) {
    setTimeout(() => processTerritoryExpansion(lobbyId, io), 100);
  } else {
    console.log("No more territory to process, expansion complete");
    // Expansion complete
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "Territory expansion complete",
    });

    // Clear pending cities since expansion is complete
    lobby.pendingCities = [];
  }
}

// Helper function to add territory to a player
function addToPlayerTerritory(lobby, playerId, x, y) {
  // Initialize territories structures if needed
  lobby.playerTerritories = lobby.playerTerritories || {};
  lobby.tileOwnership = lobby.tileOwnership || {};

  // Get map data to check terrain
  const mapData = lobby.mapData;
  if (mapData) {
    // Skip if outside map boundaries
    if (x < 0 || y < 0 || x >= mapData[0]?.length || y >= mapData.length) {
      return false;
    }

    // Check tile type - do not claim water or mountains
    const tileType = mapData[y][x]?.type;
    if (tileType === "water" || tileType === "mountain") {
      return false;
    }
  }

  // Create player territory array if it doesn't exist
  if (!lobby.playerTerritories[playerId]) {
    lobby.playerTerritories[playerId] = [];
  }

  const tileKey = `${x},${y}`;

  // Check if this tile is already owned
  if (
    lobby.tileOwnership[tileKey] &&
    lobby.tileOwnership[tileKey] !== playerId
  ) {
    // Tile is already owned by another player - don't change ownership
    return false;
  }

  // Claim the tile
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
      if (!lobbies[lobbyId]) {
        lobbies[lobbyId] = initLobby(lobbyId);
      }

      // Store map data in the lobby for territory expansion
      lobbies[lobbyId].mapData = mapData;
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
      if (!lobbies[lobbyId]) return;

      console.log(`Player ${username} (${_id}) is ready in lobby ${lobbyId}`);

      // Mark this player as ready
      lobbies[lobbyId].players = lobbies[lobbyId].players.map((player) => {
        if (player._id === _id) {
          return { ...player, ready: true };
        }
        return player;
      });

      // Notify all players about the ready status
      io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
        players: lobbies[lobbyId].players,
        message: `${username} is ready.`,
      });

      // Check if all players are ready
      const allReady =
        lobbies[lobbyId].players.length > 0 &&
        lobbies[lobbyId].players.every((player) => player.ready);

      if (allReady) {
        console.log(
          `All players in lobby ${lobbyId} are ready. Advancing phase.`
        );

        // Stop any existing timer
        if (lobbies[lobbyId].timer) {
          clearInterval(lobbies[lobbyId].timer);
        }

        // Get the current phase and determine the next phase
        const currentPhase = lobbies[lobbyId].phase;
        let nextPhase;

        if (currentPhase === "expand") {
          nextPhase = "conquer";

          // When moving to conquer phase, start territory expansion immediately
          lobbies[lobbyId].phase = nextPhase;
          io.to(`lobby-${lobbyId}`).emit("phaseChange", {
            phase: nextPhase,
            phaseDuration: lobbies[lobbyId].settings.phaseDuration,
            message: "Phase moved to conquer. Territory expansion starting...",
          });

          // Explicitly start territory expansion here
          startTerritoryExpansion(lobbyId, io);
        } else if (currentPhase === "conquer") {
          nextPhase = "resolution";
          lobbies[lobbyId].phase = nextPhase;
          io.to(`lobby-${lobbyId}`).emit("phaseChange", {
            phase: nextPhase,
            phaseDuration: lobbies[lobbyId].settings.phaseDuration,
            message: "Phase moved to resolution. Battle simulation starting...",
          });

          // For now, just move to the next phase automatically after a short delay
          // This simulates battle resolution
          setTimeout(() => {
            console.log(
              "Resolution phase complete, transitioning to expand phase"
            );

            // Move to expand phase after resolution
            lobbies[lobbyId].phase = "expand";

            // IMPORTANT: Force store the new phase in each player object to ensure sync
            lobbies[lobbyId].players.forEach((player) => {
              player.currentPhase = "expand";
            });

            // Make sure we have valid player references before collecting resources
            if (
              lobbies[lobbyId].players &&
              lobbies[lobbyId].players.length > 0
            ) {
              console.log(
                `About to collect resources for ${lobbies[lobbyId].players.length} players`
              );
              // Add extra debugging in collectResources function to track issues
              collectResources(lobbies[lobbyId], io);

              // Send direct resource update to each player for redundancy
              lobbies[lobbyId].players.forEach((player) => {
                console.log(
                  `Sending explicit resource update to ${player.username} with ${player.production} production`
                );
                io.to(player.socketId).emit("resourceUpdate", {
                  production: player.production,
                  gold: player.gold || 0,
                });

                // Reset cityBuilt flags
                console.log(`Sending resetCityBuilt to ${player.username}`);
                io.to(player.socketId).emit("resetCityBuilt", {
                  message:
                    "New expansion phase started. You can build a new city.",
                });
              });
            } else {
              console.error(
                "No players found in lobby when trying to collect resources"
              );
            }

            // Reset pending cities for the new expansion phase
            lobbies[lobbyId].pendingCities = [];

            // Notify about phase change
            io.to(`lobby-${lobbyId}`).emit("phaseChange", {
              phase: "expand",
              phaseDuration: lobbies[lobbyId].settings.phaseDuration,
              message:
                "New turn started! Expansion phase - collect resources and build.",
            });

            // Send an additional game state update to ensure all clients are in sync
            const groupedCards = {
              citycards: cardData.filter((card) => card.type === "city"),
              resourcestructures: cardData.filter(
                (card) => card.type === "resource"
              ),
              defensivestructures: cardData.filter(
                (card) => card.type === "defensive"
              ),
              units: cardData.filter((card) => card.type === "unit"),
              effects: cardData.filter((card) => card.type === "effect"),
            };

            io.to(`lobby-${lobbyId}`).emit("gameStateUpdate", {
              phase: "expand",
              players: lobbies[lobbyId].players,
              message: "Game state refreshed for new turn",
            });

            // Reset player ready status
            lobbies[lobbyId].players = lobbies[lobbyId].players.map(
              (player) => ({
                ...player,
                ready: false,
              })
            );

            // Notify all clients about the updated player ready status
            io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
              players: lobbies[lobbyId].players,
              message: "New turn started. Ready status reset.",
            });

            // Restart the timer for the new phase
            lobbies[lobbyId].timer = createPhaseTimer(lobbyId, io);
          }, 5000); // 5 second delay to simulate battle resolution

          // Don't set up a new timer yet, wait for the resolution to complete
          return;
        } else if (currentPhase === "resolution") {
          nextPhase = "expand";
          lobbies[lobbyId].phase = nextPhase;

          // Collect resources at the start of expand phase
          collectResources(lobbies[lobbyId], io);

          // Reset cityBuilt flags for all players
          lobbies[lobbyId].players.forEach((player) => {
            // Send a cityBuilt reset event to the player
            io.to(player.socketId).emit("resetCityBuilt", {
              message: "New expansion phase started. You can build a new city.",
            });
          });

          // Reset pending cities for the new expansion phase
          lobbies[lobbyId].pendingCities = [];

          io.to(`lobby-${lobbyId}`).emit("phaseChange", {
            phase: nextPhase,
            phaseDuration: lobbies[lobbyId].settings.phaseDuration,
            message:
              "New turn started! Expansion phase - collect resources and build.",
          });
        }

        // Reset all players' ready status
        lobbies[lobbyId].players = lobbies[lobbyId].players.map((player) => ({
          ...player,
          ready: false,
        }));

        // Notify all clients about the updated player ready status
        io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
          players: lobbies[lobbyId].players,
          message: `All players were ready. Phase moved to ${nextPhase}.`,
        });

        // Restart the timer for the new phase
        lobbies[lobbyId].timer = createPhaseTimer(lobbyId, io);
      }
    });

    socket.on("buildCity", (data) => {
      console.log("Received buildCity event with data:", data);
      const { lobbyId, tile, _id } = data;
      const lobby = lobbies[lobbyId];
      if (!lobby) return;
      const player = lobby.players.find((p) => p._id === _id);
      if (!player) return;

      // Validate city placement
      if (!validateCityPlacement(lobby, tile)) {
        socket.emit("buildCityError", { message: "Invalid or occupied tile." });
        return;
      }

      // Check if player has enough resources
      const cityCost = 10;
      if (player.production < cityCost) {
        socket.emit("buildCityError", {
          message: "Not enough production resources.",
        });
        return;
      }

      // Deduct cost and build city
      player.production -= cityCost;
      const newCity = {
        tile,
        level: 1,
        radius: 6, // Standard radius, could be modified for special cities
      };
      player.cities.push(newCity);

      // Mark the specific city tile as occupied
      lobby.occupiedTiles = lobby.occupiedTiles || new Set();
      lobby.occupiedTiles.add(JSON.stringify(tile));

      // Add to pending cities for next territory expansion
      lobby.pendingCities = lobby.pendingCities || [];
      lobby.pendingCities.push({
        x: tile.x,
        y: tile.y,
        playerId: _id,
        radius: 6, // Standard radius, could be modified for special cities
      });

      // Notify all clients about the new city
      io.to(`lobby-${lobbyId}`).emit("buildCitySuccess", {
        username: player.username,
        type: "city",
        level: newCity.level,
        x: newCity.tile.x,
        y: newCity.tile.y,
        playerId: _id,
      });
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
