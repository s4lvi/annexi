// server/turnManager.js

const cardManager = require("./cardManager");
const resourceTerritoryManager = require("./resourceTerritoryManager");
const { simulateBattle } = require("./targetBattleManager");

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

  // NEW: Don't auto-advance if preventAutoAdvance flag is set
  if (lobby.preventAutoAdvance) {
    console.log("Auto-advance prevented for lobby", lobbyId);
    return;
  }

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

  // NEW: Don't auto-ready if preventAutoAdvance flag is set
  if (lobby.preventAutoAdvance) {
    console.log("Auto-ready prevented for lobby", lobbyId);
    return;
  }

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
        } else if (step === 6) {
          // Auto-ready if no battle plan.
          if (!player.battlePlan || !player.battlePlan.path) {
            player.readyForStep = true;
            autoReadyTriggered = true;
            lobby.battleSimulationsRemaining--;
            if (player.socketId) {
              io.to(player.socketId).emit("autoReady", {
                message: "No battle plan. Skipping battle setup.",
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
    if ([3, 4, 5, 6].includes(lobby.turnStep)) {
      autoReadyForStep(lobbyId, io, lobbies, lobby.turnStep);
    }

    if (lobby.turnStep === 6) {
      // DO NOT ADVANCE TURN OR START NEW TURN HERE
      console.log("Starting battle phase for lobby", lobbyId);
      const connectedPlayers = lobby.players.filter((p) => !p.disconnected);
      console.log("Connected players:", connectedPlayers.length);

      // Set up a counter to track battle simulation completions.

      connectedPlayers.forEach((p) => {
        simulateBattle(lobby, lobbyId, p, io, () => {
          lobby.battleSimulationsRemaining--;
          console.log(
            `Battle simulation complete for player ${p._id}. Remaining: ${lobby.battleSimulationsRemaining}`
          );
          if (lobby.battleSimulationsRemaining <= 0) {
            // All battle simulations have finished.
            lobby.battleFinished = true;
            // Instead of calling advanceTurn here, emit an event.
            io.to(`lobby-${lobbyId}`).emit("battlePhaseComplete", {
              message: "Battle phase complete",
            });
          }
        });
      });
      lobby.turnLock = false;
      return; // Exit immediately; do not call advanceTurn here.
    }
    lobby.turnLock = false;
  } else {
    // Final else block: turnStep is 6 or greater.
    console.log(lobby.battleFinished, lobby.battleSimulationsRemaining);
    if (lobby.battleFinished || lobby.battleSimulationsRemaining <= 0) {
      io.to(`lobby-${lobbyId}`).emit("stepCompleted", {
        turnStep: lobby.turnStep,
      });
      console.log(`Resolving battle phase for lobby ${lobbyId}`);

      if (lobby.battleUnits && lobby.battleUnits.length > 0) {
        console.log(
          `Clearing ${lobby.battleUnits.length} remaining battle units`
        );
        lobby.battleUnits = [];
      }

      lobby.players.forEach((player) => {
        player.battlePlan = null;
        player.queuedArmy = [];
      });

      lobby.turnStarted = false;
      lobby.turnStep = 0;

      const connectedPlayers = lobby.players.filter((p) => !p.disconnected);
      lobby.battleSimulationsRemaining = connectedPlayers.length;
      // Call startNewTurn ONLY in this final else block.
      startNewTurn(lobbyId, io, lobbies);
      lobby.battleFinished = false;
    }
    lobby.turnLock = false;
    return;
  }
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

  // NEW: Add a cooldown period to prevent auto-advancement
  lobby.preventAutoAdvance = true;
  console.log("Auto-advance prevention enabled for lobby", lobbyId);
  setTimeout(() => {
    lobby.preventAutoAdvance = false;
    console.log("Auto-advance prevention disabled for lobby", lobbyId);
  }, 3000); // 3-second cooldown
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
