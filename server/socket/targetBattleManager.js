// server/targetBattleManager.js

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

  // Node class for A* search.
  class Node {
    constructor(x, y, cost = 0, parent = null) {
      this.x = x;
      this.y = y;
      this.cost = cost;
      this.parent = parent;
      this.key = `${x},${y}`;
      // Manhattan distance as heuristic
      const dx = Math.abs(this.x - targetCity.x);
      const dy = Math.abs(this.y - targetCity.y);
      this.heuristic = dx + dy;
      this.f = this.cost + this.heuristic;
    }
  }

  // Calculate movement cost for a tile at (x, y).
  function getMovementCost(x, y) {
    if (x < 0 || y < 0 || x >= mapData[0].length || y >= mapData.length) {
      return Infinity; // Out of bounds.
    }
    const tile = mapData[y][x];
    if (tile.type === "water" || tile.type === "mountain") {
      return Infinity;
    }
    // Check if a structure exists at this tile.
    const structure = lobby.structures
      ? lobby.structures.find((s) => s.x === x && s.y === y)
      : null;
    if (structure) {
      if (structure.playerId === playerId) {
        return 1; // Friendly structure.
      }
      // Enemy structure: cost depends on type.
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
    // For enemy cities/territories.
    const tileKey = `${x},${y}`;
    const tileOwner = lobby.tileOwnership[tileKey];
    if (tileOwner && tileOwner !== playerId) {
      return 2; // Slightly higher cost in enemy territory.
    }
    return 1; // Normal cost.
  }

  // Get neighboring nodes using the hex grid offsets.
  function getNeighbors(node) {
    const { x, y } = node;
    const adjacentOffsets = getHexAdjacencyOffsets(x);
    return adjacentOffsets
      .map(([dx, dy]) => {
        const newX = x + dx;
        const newY = y + dy;
        const cost = getMovementCost(newX, newY);
        if (cost === Infinity) return null;
        return new Node(newX, newY, node.cost + cost, node);
      })
      .filter((neighbor) => neighbor !== null);
  }

  // Reconstruct path from end node.
  function reconstructPath(endNode) {
    const path = [];
    let current = endNode;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }

  // A* search implementation.
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
        const existingNode = nodeMap[neighbor.key];
        if (!existingNode) {
          openSet.push(neighbor);
          nodeMap[neighbor.key] = neighbor;
        } else if (neighbor.cost < existingNode.cost) {
          existingNode.cost = neighbor.cost;
          existingNode.f = neighbor.cost + existingNode.heuristic;
          existingNode.parent = neighbor.parent;
        }
      }
    }
    return null;
  }

  return findPath();
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
  console.log("validating target selection");
  // Validate source city: must be a Capital or Fortified city owned by the player.
  const validSource = lobby.players.some(
    (p) =>
      p._id === _id &&
      p.cities &&
      p.cities.some(
        (city) =>
          city.tile.x === sourceCity.x &&
          city.tile.y === sourceCity.y &&
          (city.type === "Capital City" || city.type === "Fortified City")
      )
  );
  // Validate target city: must belong to another player.
  const validTarget = lobby.players.some(
    (p) =>
      p._id !== _id &&
      p.cities &&
      p.cities.some(
        (city) => city.tile.x === targetCity.x && city.tile.y === targetCity.y
      )
  );
  console.log(
    "validating target selection done, source:",
    validSource,
    "target:",
    validTarget
  );
  if (!validSource) {
    socket.emit("targetSelectionError", { message: "Invalid source city." });
    return;
  }
  if (!validTarget) {
    socket.emit("targetSelectionError", { message: "Invalid target city." });
    return;
  }
  const path = findPathBetweenCities(lobby, sourceCity, targetCity, _id);
  console.log("path found:", path);
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
}

function registerHandlers(socket, io, lobbies) {
  socket.on("selectTarget", (data) =>
    handleSelectTarget(socket, io, lobbies, data)
  );
}

module.exports = {
  registerHandlers,
};
