// server/turnManager.js

const cardManager = require("./cardManager");
const resourceTerritoryManager = require("./resourceTerritoryManager");

// Listen for player readiness events.
function registerHandlers(socket, io, lobbies) {
  socket.on("playerReady", (data) => {
    const { lobbyId, username, _id } = data;
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    const player = lobby.players.find((p) => p._id === _id);
    if (!player) return;
    player.readyForStep = true;
    io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
      players: lobby.players.filter((p) => !p.disconnected),
      message: `${username} is ready for step ${lobby.turnStep}.`,
    });
    checkAllReady(lobbyId, io, lobbies);
  });
}

// Check if every connected player is ready; if so, advance the turn.
function checkAllReady(lobbyId, io, lobbies) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;
  const connectedPlayers = lobby.players.filter((p) => !p.disconnected);
  const allReady = connectedPlayers.every((p) => p.readyForStep);
  if (allReady) {
    // Clear ready flags before advancing.
    connectedPlayers.forEach((p) => (p.readyForStep = false));
    advanceTurn(lobbyId, io, lobbies);
  }
}

// Auto-ready logic for steps 3 (structure), 4 (army queue), and 5 (target selection).
function autoReadyForStep(lobbyId, io, lobbies, step) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;
  setTimeout(() => {
    let autoReadyTriggered = false;
    const connectedPlayers = lobby.players.filter((p) => !p.disconnected);
    connectedPlayers.forEach((player) => {
      if (!player.readyForStep) {
        if (step === 3) {
          // Auto-ready if no defensive (structure) cards.
          const hasStructureCards =
            player.inventory &&
            player.inventory.some((card) => card.type === "defensive");
          if (!hasStructureCards) {
            player.readyForStep = true;
            autoReadyTriggered = true;
            if (player.socketId) {
              io.to(player.socketId).emit("autoReady", {
                message: "No structure cards. Skipping structure placement.",
              });
            }
          }
        } else if (step === 4) {
          // Auto-ready if no unit cards.
          const hasUnitCards =
            player.inventory &&
            player.inventory.some((card) => card.type === "unit");
          if (!hasUnitCards) {
            player.readyForStep = true;
            autoReadyTriggered = true;
            if (player.socketId) {
              io.to(player.socketId).emit("autoReady", {
                message: "No unit cards. Skipping army queue.",
              });
            }
          }
        } else if (step === 5) {
          // Auto-ready if no queued army.
          if (!player.queuedArmy || player.queuedArmy.length === 0) {
            player.readyForStep = true;
            autoReadyTriggered = true;
            if (player.socketId) {
              io.to(player.socketId).emit("autoReady", {
                message: "No army queued. Skipping target selection.",
              });
            }
          }
        }
      }
    });
    const allReady = connectedPlayers.every((p) => p.readyForStep);
    if (autoReadyTriggered && allReady) {
      connectedPlayers.forEach((p) => (p.readyForStep = false));
      advanceTurn(lobbyId, io, lobbies);
    }
  }, 500); // Delay before auto-ready check (adjust if needed)
}

// Advance the turn to the next step.
function advanceTurn(lobbyId, io, lobbies) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;
  if (lobby.turnLock) {
    console.log("Turn already advancing for lobby", lobbyId);
    return;
  }
  lobby.turnLock = true;
  if (lobby.turnStep < 6) {
    lobby.turnStep++;
    io.to(`lobby-${lobbyId}`).emit("stepCompleted", {
      turnStep: lobby.turnStep,
    });
    console.log(`Advanced turn to step ${lobby.turnStep} in lobby ${lobbyId}`);

    if (lobby.turnStep === 2) {
      resourceTerritoryManager.startTerritoryExpansion(lobbyId, io, lobbies);
    }
    if ([3, 4, 5].includes(lobby.turnStep)) {
      autoReadyForStep(lobbyId, io, lobbies, lobby.turnStep);
    }
  } else {
    // At step 6 (Battle phase), resolve battle and reset turn unconditionally.
    io.to(`lobby-${lobbyId}`).emit("stepCompleted", {
      turnStep: lobby.turnStep,
    });
    console.log(`Resolving battle phase for lobby ${lobbyId}`);
    setTimeout(() => {
      lobby.turnStarted = false;
      lobby.turnStep = 0;
      startNewTurn(lobbyId, io, lobbies);
      lobby.turnLock = false;
    }, 1000);
    return;
  }
  lobby.turnLock = false;
}

// Start a new turn: reset ready flags, collect resources, and deal new hands.
function startNewTurn(lobbyId, io, lobbies) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;
  if (lobby.turnStarted) {
    console.log(`Turn already started for lobby ${lobbyId}`);
    return;
  }
  lobby.turnStarted = true;
  lobby.turnStep = 0;
  console.log(`Starting new turn for lobby ${lobbyId}`);
  // Reset ready flags for all players.
  lobby.players.forEach((player) => {
    if (player) {
      player.readyForStep = false;
    }
  });
  // Collect resources.
  lobby.players.forEach((player) => {
    if (player && !player.disconnected) {
      const productionFromCities = computePlayerProduction(player);
      const previousProduction = player.production;
      player.production += productionFromCities;
      console.log(
        `Player ${player.username}: production from cities = ${productionFromCities} (Total: ${previousProduction} -> ${player.production})`
      );
      if (player.socketId) {
        io.to(player.socketId).emit("resourceUpdate", {
          production: player.production,
          gold: player.gold,
        });
      }
    }
  });
  io.to(`lobby-${lobbyId}`).emit("gameStateUpdate", {
    turnStep: lobby.turnStep,
    players: lobby.players,
    message: "New turn started. Resources collected.",
  });
  // Deal new hands.
  lobby.players.forEach((player) => {
    if (!player.disconnected) {
      player.currentHand = cardManager.drawHandFromDeck(player.deck, 7);
      if (player.socketId) {
        io.to(player.socketId).emit("handDealt", { hand: player.currentHand });
      }
    }
  });
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
      if (distance <= 3) bonus += 0.3;
      else if (distance <= 5) bonus += 0.1;
    });
    total += base + bonus;
  });
  return Math.floor(total);
}

module.exports = {
  registerHandlers,
  startNewTurn,
};
