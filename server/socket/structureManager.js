// server/structureManager.js

function validateCityPlacement(lobby, tile, playerId) {
  lobby.occupiedTiles = lobby.occupiedTiles || new Set();
  if (lobby.occupiedTiles.has(JSON.stringify(tile))) {
    return false;
  }
  const player = lobby.players.find((p) => p._id === playerId);
  if (!player) return false;
  if (!player.cities || player.cities.length === 0) {
    return true;
  }
  const tileKey = `${tile.x},${tile.y}`;
  return lobby.tileOwnership && lobby.tileOwnership[tileKey] === playerId;
}

function updatePlayerResources(player, socket, io, lobbyId) {
  const resourceUpdate = {
    production: player.production,
    gold: player.gold || 0,
  };
  if (player.socketId) {
    io.to(player.socketId).emit("resourceUpdate", resourceUpdate);
  }
}

function updatePlayerCards(player, socket, io, lobbyId) {
  const cardsUpdate = {
    inventory: player.inventory,
  };
  if (player.socketId) {
    io.to(player.socketId).emit("cardsUpdate", cardsUpdate);
  }
}

function handleBuildStructure(socket, io, lobbies, data) {
  const { lobbyId, structure, tile, _id } = data;
  const lobby = lobbies[lobbyId];
  if (!lobby) return;
  const player = lobby.players.find((p) => p._id === _id);
  if (!player) return;
  if (!validateCityPlacement(lobby, tile, _id)) {
    socket.emit("buildStructureError", {
      message: "Invalid tile: must be within your territory and unoccupied.",
    });
    return;
  }
  const cardIndex = player.inventory.findIndex(
    (card) => card.id === structure.id
  );
  if (cardIndex === -1) {
    socket.emit("buildStructureError", {
      message: "Defensive structure card not in inventory.",
    });
    return;
  }
  const [placedCard] = player.inventory.splice(cardIndex, 1);
  if (player.deck[structure.id] !== undefined) {
    player.deck[structure.id]++;
  }
  lobby.occupiedTiles = lobby.occupiedTiles || new Set();
  lobby.occupiedTiles.add(JSON.stringify(tile));
  if (!lobby.structures) {
    lobby.structures = [];
  }
  lobby.structures.push({ ...tile, playerId: _id, structure: placedCard });
  io.to(`lobby-${lobbyId}`).emit("buildStructureSuccess", {
    structure: placedCard,
    tile,
    playerId: _id,
    message: `${player.username} placed a ${placedCard.name}.`,
  });
  updatePlayerResources(player, socket, io, lobbyId);
  updatePlayerCards(player, socket, io, lobbyId);
}

function handleBuildCity(socket, io, lobbies, data) {
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
  const isFirstCity = !player.cities || player.cities.length === 0;
  const cityType = isFirstCity ? "Capital City" : "Base City";
  const newCity = {
    tile,
    level: 1,
    radius: 6,
    type: cityType,
  };
  if (!player.cities) player.cities = [];
  player.cities.push(newCity);
  lobby.occupiedTiles = lobby.occupiedTiles || new Set();
  lobby.occupiedTiles.add(JSON.stringify(tile));
  lobby.pendingCities = lobby.pendingCities || [];
  lobby.pendingCities.push({
    x: tile.x,
    y: tile.y,
    playerId: _id,
    radius: 6,
    type: cityType,
  });
  io.to(`lobby-${lobbyId}`).emit("buildCitySuccess", {
    username: player.username,
    type: cityType,
    level: newCity.level,
    x: newCity.tile.x,
    y: newCity.tile.y,
    playerId: _id,
  });
  updatePlayerResources(player, socket, io, lobbyId);
}

function handleQueueArmy(socket, io, lobbies, data) {
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
  const maxQueueLength = player.cities ? player.cities.length : 0;
  if (selectedCards.length > maxQueueLength) {
    socket.emit("queueArmyError", { message: "Too many units selected." });
    return;
  }
  selectedCards.forEach((card) => {
    const index = player.inventory.findIndex(
      (invCard) => invCard.id === card.id
    );
    if (index !== -1) {
      player.inventory.splice(index, 1);
    }
  });
  player.queuedArmy = selectedCards;
  console.log("Player army queued:", selectedCards);
  socket.emit("updateCards", {
    inventory: player.inventory,
    message: "Army queued successfully.",
  });
}

function registerHandlers(socket, io, lobbies) {
  socket.on("buildStructure", (data) =>
    handleBuildStructure(socket, io, lobbies, data)
  );
  socket.on("buildCity", (data) => handleBuildCity(socket, io, lobbies, data));
  socket.on("queueArmy", (data) => handleQueueArmy(socket, io, lobbies, data));
}

module.exports = {
  registerHandlers,
};
