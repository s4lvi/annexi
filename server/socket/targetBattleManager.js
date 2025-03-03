// server/targetBattleManager.js
const { baseCardsMapping } = require("./cardManager");

// Helper: Returns hex grid adjacency offsets based on x coordinate.
function getHexAdjacencyOffsets(x) {
  return x % 2 === 0
    ? [
        [0, -1], // North
        [1, -1], // Northeast
        [1, 0], // Southeast
        [0, 1], // South
        [-1, 0], // Southwest
        [-1, -1], // Northwest
      ]
    : [
        [0, -1], // North
        [1, 0], // Northeast
        [1, 1], // Southeast
        [0, 1], // South
        [-1, 1], // Southwest
        [-1, 0], // Northwest
      ];
}

function findPathBetweenCities(lobby, sourceCity, targetCity, playerId) {
  const mapData = lobby.mapData;
  if (!mapData || !sourceCity || !targetCity) {
    console.error("Missing data for pathfinding");
    return null;
  }

  // A* search node.
  class Node {
    constructor(x, y, cost = 0, parent = null) {
      this.x = x;
      this.y = y;
      this.cost = cost;
      this.parent = parent;
      this.key = `${x},${y}`;
      const dx = Math.abs(this.x - targetCity.x);
      const dy = Math.abs(this.y - targetCity.y);
      this.heuristic = dx + dy;
      this.f = this.cost + this.heuristic;
    }
  }

  function getMovementCost(x, y) {
    if (x < 0 || y < 0 || x >= mapData[0].length || y >= mapData.length) {
      return Infinity;
    }
    const tile = mapData[y][x];
    if (tile.type === "water" || tile.type === "mountain") {
      return Infinity;
    }
    const structure = lobby.structures
      ? lobby.structures.find((s) => s.x === x && s.y === y)
      : null;
    if (structure) {
      if (structure.playerId === playerId) return 1;
      switch (structure.structure.name) {
        case "Wall":
          return 10;
        case "Watchtower":
          return 5;
        case "Archer":
          return 3;
        default:
          return 2;
      }
    }
    const tileKey = `${x},${y}`;
    const tileOwner = lobby.tileOwnership[tileKey];
    if (tileOwner && tileOwner !== playerId) return 2;
    return 1;
  }

  function getNeighbors(node) {
    const { x, y } = node;
    const offsets = getHexAdjacencyOffsets(x);
    return offsets
      .map(([dx, dy]) => {
        const newX = x + dx;
        const newY = y + dy;
        const cost = getMovementCost(newX, newY);
        if (cost === Infinity) return null;
        return new Node(newX, newY, node.cost + cost, node);
      })
      .filter((neighbor) => neighbor !== null);
  }

  function reconstructPath(endNode) {
    const path = [];
    let current = endNode;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }

  function findPath() {
    const startNode = new Node(sourceCity.x, sourceCity.y);
    const targetKey = `${targetCity.x},${targetCity.y}`;
    const openSet = [startNode];
    const closedSet = new Set();
    const nodeMap = { [startNode.key]: startNode };

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      if (current.key === targetKey) {
        return reconstructPath(current);
      }
      closedSet.add(current.key);
      const neighbors = getNeighbors(current);
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor.key)) continue;
        const existing = nodeMap[neighbor.key];
        if (!existing) {
          openSet.push(neighbor);
          nodeMap[neighbor.key] = neighbor;
        } else if (neighbor.cost < existing.cost) {
          existing.cost = neighbor.cost;
          existing.f = neighbor.cost + existing.heuristic;
          existing.parent = neighbor.parent;
        }
      }
    }
    return null;
  }

  return findPath();
}

// Simulate battle for a player's battle plan.
function simulateBattle(lobby, lobbyId, player, io) {
  console.log("Starting battle simulation for player", player._id);
  const battlePlan = player.battlePlan;
  if (!battlePlan || !battlePlan.path) {
    console.error("No battle plan or path defined for player", player._id);
    return;
  }

  // Get queued army cards.
  const queuedArmy = battlePlan.queuedArmy || [];
  if (queuedArmy.length === 0) {
    console.log("No units queued for player", player._id);
    return; // Optionally, auto-ready the player here.
  }

  // Create a battle unit for each queued army card.
  queuedArmy.forEach((unitCard, index) => {
    const battleUnit = {
      unitId: `${player._id}-${Date.now()}-${Math.random()}`, // Unique identifier.
      playerId: player._id,
      health: unitCard.health || 100,
      position: { x: battlePlan.path[0].x, y: battlePlan.path[0].y },
      cardId: unitCard.id,
      speed: unitCard.speed || 0.1,
      attackInterval: unitCard.attackInterval || 1000,
      attackDamage: unitCard.attackDamage || 15,
      attackCooldown: 0,
      path: battlePlan.path,
      currentIndex: 0,
      cityDamage: unitCard.cityDamage || 20,
      isAttacking: false,
    };
    console.log(
      `Adding battle unit [${index}] for card ${unitCard.id}:`,
      battleUnit
    );
    if (!lobby.battleUnits) lobby.battleUnits = [];
    lobby.battleUnits.push(battleUnit);
  });

  const tickInterval = 100; // Simulation tick in ms.
  const simulationInterval = setInterval(() => {
    console.log("=== Simulation tick for lobby", lobbyId, "===");
    // Iterate over a shallow copy of battle units.
    lobby.battleUnits.slice().forEach((unit) => {
      console.log(
        `Updating unit ${unit.unitId}: currentIndex=${unit.currentIndex}, health=${unit.health}`
      );

      // Check for blocking enemy structure on the next tile.
      let blockingStructure = null;
      const nextIndex = unit.currentIndex + 1;
      if (nextIndex < unit.path.length) {
        const nextTile = unit.path[nextIndex];
        if (lobby.structures) {
          blockingStructure = lobby.structures.find((structure) => {
            return (
              structure.x === nextTile.x &&
              structure.y === nextTile.y &&
              structure.playerId !== unit.playerId &&
              structure.structure.name === "Wall"
            );
          });
        }
        if (blockingStructure) {
          console.log(
            `Unit ${unit.unitId} found blocking structure ${blockingStructure.id} at tile (${nextTile.x}, ${nextTile.y})`
          );
        } else {
          console.log(
            `Unit ${unit.unitId} has no blocker at next tile (${nextTile.x}, ${nextTile.y})`
          );
        }
      } else {
        console.log(`Unit ${unit.unitId} is at the final tile.`);
      }

      if (blockingStructure) {
        // Unit stops and attacks the blocking structure.
        unit.isAttacking = true;
        if (unit.attackCooldown <= 0) {
          console.log(
            `Unit ${unit.unitId} attacks structure ${blockingStructure.id} for ${unit.attackDamage} damage.`
          );
          blockingStructure.health -= unit.attackDamage;
          io.to(`lobby-${lobbyId}`).emit("unitAttackedStructure", {
            unitId: unit.unitId,
            structureId: blockingStructure.id,
            damage: unit.attackDamage,
            structureHealth: blockingStructure.health,
          });
          unit.attackCooldown = unit.attackInterval;
        } else {
          console.log(
            `Unit ${unit.unitId} attack cooldown: ${unit.attackCooldown} ms remaining.`
          );
        }
        unit.attackCooldown -= tickInterval;
        if (blockingStructure.health <= 0) {
          console.log(
            `Structure ${blockingStructure.id} destroyed by unit ${unit.unitId}.`
          );
          lobby.structures = lobby.structures.filter(
            (s) => s.id !== blockingStructure.id
          );
          io.to(`lobby-${lobbyId}`).emit("structureDestroyed", {
            structureId: blockingStructure.id,
          });
          unit.isAttacking = false;
        }
      } else {
        // No blocker: unit resumes movement.
        if (unit.isAttacking) {
          console.log(
            `Unit ${unit.unitId} stops attacking and resumes movement.`
          );
        }
        unit.isAttacking = false;
        if (Math.random() < unit.speed) {
          unit.currentIndex++;
          if (unit.currentIndex >= unit.path.length) {
            unit.currentIndex = unit.path.length - 1;
          }
          const newTile = unit.path[unit.currentIndex];
          unit.position = { x: newTile.x, y: newTile.y };
          console.log(
            `Unit ${unit.unitId} moved to tile index ${unit.currentIndex} at position (${newTile.x}, ${newTile.y}).`
          );
        }
      }

      // Process defensive structures (e.g., Watchtowers) attacking the unit.
      if (lobby.structures) {
        lobby.structures.forEach((structure) => {
          if (structure.structure.type === "defensive") {
            const stats = baseCardsMapping[structure.structure.id] || {};
            const range = stats.attackRange || 0;
            const damage = stats.attackDamage || 0;
            const interval = stats.attackInterval || 1000;
            if (structure.attackCooldown === undefined) {
              structure.attackCooldown = 0;
            }
            const dx = structure.x - unit.position.x;
            const dy = structure.y - unit.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= range) {
              if (structure.attackCooldown <= 0) {
                console.log(
                  `Defensive structure ${structure.id} fires at unit ${unit.unitId} for ${damage} damage.`
                );
                unit.health -= damage;
                io.to(`lobby-${lobbyId}`).emit("towerFired", {
                  towerId: structure.id,
                  damage,
                  unitId: unit.unitId,
                  unitHealth: unit.health,
                });
                structure.attackCooldown = interval;
              } else {
                console.log(
                  `Structure ${structure.id} cooldown: ${structure.attackCooldown} ms remaining.`
                );
              }
            }
            structure.attackCooldown -= tickInterval;
            if (structure.attackCooldown < 0) structure.attackCooldown = 0;
          }
        });
      }
    });

    // Remove defeated units.
    const numBefore = lobby.battleUnits.length;
    lobby.battleUnits = lobby.battleUnits.filter((unit) => unit.health > 0);
    const numAfter = lobby.battleUnits.length;
    if (numBefore !== numAfter) {
      console.log(`Removed ${numBefore - numAfter} defeated unit(s).`);
    }

    // Check for units that have reached the target.
    const reachedTarget = lobby.battleUnits.filter(
      (unit) => unit.currentIndex >= unit.path.length - 1
    );
    reachedTarget.forEach((unit) => {
      console.log(`Unit ${unit.unitId} reached the target city.`);
      io.to(`lobby-${lobbyId}`).emit("battleResult", {
        unitId: unit.unitId,
        result: "success",
        message: "Unit reached target city",
        cityDamage: unit.cityDamage,
        playerId: unit.playerId,
      });
      lobby.battleUnits = lobby.battleUnits.filter(
        (u) => u.unitId !== unit.unitId
      );
    });

    // Emit aggregated update.
    console.log("Emitting battle update to lobby", lobbyId);
    io.to(`lobby-${lobbyId}`).emit("battleUpdate", {
      battleUnits: lobby.battleUnits,
    });

    if (lobby.battleUnits.length === 0) {
      console.log("No active battle units remain. Stopping simulation loop.");
      io.to(`lobby-${lobbyId}`).emit("battleFinished", {
        message: "Battle phase complete.",
      });
      clearInterval(simulationInterval);
    }
  }, tickInterval);
}

function handleSelectTarget(socket, io, lobbies, data) {
  console.log("handleSelectTarget started");
  const { lobbyId, sourceCity, targetCity, _id } = data;
  const lobby = lobbies[lobbyId];
  if (!lobby) {
    socket.emit("targetSelectionError", { message: "Lobby not found." });
    return;
  }
  const player = lobby.players.find((p) => p._id === _id);
  if (!player) {
    socket.emit("targetSelectionError", { message: "Player not found." });
    return;
  }
  // (Validation of source and target cities is assumed here.)
  const path = findPathBetweenCities(lobby, sourceCity, targetCity, _id);
  if (!path) {
    socket.emit("targetSelectionError", { message: "No valid path found." });
    return;
  }
  player.battlePlan = {
    sourceCity,
    targetCity,
    path,
    queuedArmy: player.queuedArmy || [],
  };
  io.to(`lobby-${lobbyId}`).emit("targetSelected", {
    playerId: _id,
    username: player.username,
    sourceCity,
    targetCity,
    path,
    message: `${player.username} has selected a target.`,
  });
  socket.emit("pathCalculated", {
    sourceCity,
    targetCity,
    path,
    message: `Path calculated with ${path.length} tiles.`,
  });

  socket.emit("autoReady", {
    message: "Path calculated, ready for battle.",
  });
}

function registerHandlers(socket, io, lobbies) {
  socket.on("selectTarget", (data) =>
    handleSelectTarget(socket, io, lobbies, data)
  );
}

module.exports = {
  registerHandlers,
  simulateBattle,
};
