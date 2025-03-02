// server/resourceTerritoryManager.js

function startTerritoryExpansion(lobbyId, io, lobbies) {
  console.log(`Starting territory expansion for lobby ${lobbyId}`);
  const lobby = lobbies[lobbyId];
  if (!lobby || !lobby.mapData) {
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "Expansion failed – no map data.",
    });
    return;
  }

  if (!lobby.pendingCities || lobby.pendingCities.length === 0) {
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "No new territories to expand.",
    });
    return;
  }

  lobby.cityExpansionFrontiers = {};
  lobby.pendingCities.forEach((city, index) => {
    const cityId = `city_${index}_${city.playerId}`;
    addTileToTerritory(lobby, city.playerId, city.x, city.y);
    lobby.cityExpansionFrontiers[cityId] = new Set([`${city.x},${city.y}`]);
  });

  lobby.maxRings = 6;
  lobby.currentRing = 1;
  processNextExpansionRing(lobbyId, io, lobbies);
}

function processNextExpansionRing(lobbyId, io, lobbies) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;
  const currentRing = lobby.currentRing;
  if (currentRing > lobby.maxRings) {
    io.to(`lobby-${lobbyId}`).emit("territoryExpansionComplete", {
      message: "Territory expansion complete",
    });
    lobby.pendingCities = [];
    return;
  }

  const candidates = [];
  Object.keys(lobby.cityExpansionFrontiers).forEach((cityId) => {
    const frontier = Array.from(lobby.cityExpansionFrontiers[cityId]);
    const playerId = cityId.split("_")[2];
    const nextFrontier = new Set();
    frontier.forEach((coordStr) => {
      const [x, y] = coordStr.split(",").map(Number);
      const adjacent = getHexAdjacencyOffsets(x);
      adjacent.forEach(([dx, dy]) => {
        const newX = x + dx,
          newY = y + dy;
        if (isValidTile(newX, newY, lobby.mapData)) {
          const tileKey = `${newX},${newY}`;
          nextFrontier.add(tileKey);
          if (
            !lobby.tileOwnership[tileKey] ||
            lobby.tileOwnership[tileKey] !== playerId
          ) {
            candidates.push({ x: newX, y: newY, playerId, ring: currentRing });
          }
        }
      });
    });
    lobby.cityExpansionFrontiers[cityId] = nextFrontier;
  });

  const claims = [];
  candidates.forEach((candidate) => {
    if (
      addTileToTerritory(lobby, candidate.playerId, candidate.x, candidate.y)
    ) {
      claims.push(candidate);
    }
  });
  if (claims.length > 0) {
    io.to(`lobby-${lobbyId}`).emit("territoryUpdate", {
      claims,
      currentRing,
      remainingClaims: lobby.maxRings - currentRing,
    });
  }
  lobby.currentRing++;
  setTimeout(() => processNextExpansionRing(lobbyId, io, lobbies), 200);
}

function addTileToTerritory(lobby, playerId, x, y) {
  const tileKey = `${x},${y}`;
  if (
    lobby.tileOwnership[tileKey] &&
    lobby.tileOwnership[tileKey] !== playerId
  ) {
    return false;
  }
  lobby.tileOwnership[tileKey] = playerId;
  if (!lobby.playerTerritories[playerId]) {
    lobby.playerTerritories[playerId] = [];
  }
  lobby.playerTerritories[playerId].push({ x, y });
  return true;
}

function isValidTile(x, y, mapData) {
  if (x < 0 || y < 0 || y >= mapData.length || x >= mapData[0].length)
    return false;
  const tileType = mapData[y][x]?.type;
  return tileType !== "water" && tileType !== "mountain";
}

function getHexAdjacencyOffsets(x) {
  return x % 2 === 0
    ? [
        [0, -1],
        [1, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
        [-1, -1],
      ]
    : [
        [0, -1],
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
      ];
}

function registerHandlers(socket, io, lobbies) {
  // This module doesn't need to register direct socket events.
}

module.exports = {
  registerHandlers,
  startTerritoryExpansion,
};
