// server/cardManager.js

const baseDeckDefinition = [
  {
    id: "capital-city",
    name: "Capital City",
    type: "city",
    cost: { production: 10 },
    count: 1,
    hideFromInventory: true,
  },
  {
    id: "base-city",
    name: "Base City",
    type: "city",
    cost: { production: 10 },
    count: 1,
    alwaysInInventory: true,
    hideFromInventory: true,
  },
  {
    id: "city-upgrade-1",
    name: "Fortified City",
    type: "city",
    cost: { production: 1, gold: 1 },
    count: 3,
  },
  {
    id: "defensive-structure-1",
    name: "Watchtower",
    type: "defensive",
    cost: { production: 2 },
    count: 5,
  },
  {
    id: "defensive-structure-2",
    name: "Wall",
    type: "defensive",
    reusable: true,
    cost: { production: 1 },
    count: 20,
  },
  {
    id: "defensive-structure-3",
    name: "Archer",
    type: "defensive",
    reusable: true,
    cost: { production: 1 },
    count: 10,
  },
  {
    id: "army-unit-1",
    name: "Militia",
    type: "unit",
    reusable: false,
    cost: { production: 1 },
    count: 10,
  },
  {
    id: "army-unit-2",
    name: "Light Infantry",
    type: "unit",
    reusable: false,
    cost: { production: 2 },
    count: 5,
  },
  // ... add any additional cards
];

const baseCardsMapping = {};
baseDeckDefinition.forEach((card) => {
  baseCardsMapping[card.id] = card;
});

function initializePlayerDeck() {
  const deck = {};
  baseDeckDefinition.forEach((card) => {
    deck[card.id] = card.count;
  });
  return deck;
}

function drawHandFromDeck(deck, handSize) {
  let pool = [];
  for (const cardId in deck) {
    const count = deck[cardId];
    for (let i = 0; i < count; i++) {
      pool.push(baseCardsMapping[cardId]);
    }
  }
  shuffleArray(pool);
  return pool.slice(0, handSize);
}

function handleBuyCard(socket, io, lobbies, data) {
  const { lobbyId, card, _id } = data;
  const lobby = lobbies[lobbyId];
  if (!lobby) return;
  const player = lobby.players.find((p) => p._id === _id);
  if (!player) return;

  const handIndex = player.currentHand.findIndex((c) => c.id === card.id);
  if (handIndex === -1) {
    socket.emit("cardPurchaseError", { message: "Card not in hand." });
    return;
  }

  const cardDef = baseCardsMapping[card.id];
  if (!cardDef) {
    socket.emit("cardPurchaseError", { message: "Invalid card." });
    return;
  }

  const cost = cardDef.cost.production;
  if (player.production < cost) {
    socket.emit("cardPurchaseError", { message: "Not enough production." });
    return;
  }

  // Subtract the cost only from the purchasing player's resources.
  player.production -= cost;
  player.currentHand.splice(handIndex, 1);

  if (player.deck[card.id] > 0) {
    player.deck[card.id]--;
  }

  if (!cardDef.hideFromInventory) {
    player.inventory.push(cardDef);
  }

  socket.emit("cardPurchaseSuccess", {
    card: cardDef,
    currentCards: player.inventory,
    production: player.production,
    hand: player.currentHand,
  });

  // Send the resource update only to the purchasing player.
  if (player.socketId) {
    io.to(player.socketId).emit("resourceUpdate", {
      production: player.production,
      gold: player.gold,
    });
  }
}

function registerHandlers(socket, io, lobbies) {
  socket.on("buyCard", (data) => handleBuyCard(socket, io, lobbies, data));
}

module.exports = {
  registerHandlers,
  initializePlayerDeck,
  drawHandFromDeck,
  baseCardsMapping,
  baseDeckDefinition,
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
