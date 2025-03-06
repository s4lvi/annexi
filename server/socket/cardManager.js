// server/cardManager.js
const { getCardsByIds } = require("../services/cardService");

// Function to initialize player deck from user's default deck
async function initializePlayerDeckFromUserDeck(playerDeck) {
  try {
    if (!playerDeck || !playerDeck.cards || !Array.isArray(playerDeck.cards)) {
      console.warn("Invalid player deck, using fallback initialization");
      return {}; // Return empty deck as fallback
    }

    // Convert the player's deck to the format expected by the game
    const deck = {};

    // Get detailed card information from database
    const cardIds = [...new Set(playerDeck.cards)]; // Get unique card IDs
    const cardDetails = await getCardsByIds(cardIds);

    // Map card IDs to their database information
    const cardDetailsMap = {};
    cardDetails.forEach((card) => {
      cardDetailsMap[card.id] = card;
    });

    // Count occurrences of each card in the deck
    playerDeck.cards.forEach((cardId) => {
      // Make sure the card exists in our database
      if (cardDetailsMap[cardId]) {
        deck[cardId] = (deck[cardId] || 0) + 1;
      }
    });

    return deck;
  } catch (error) {
    console.error("Error initializing player deck from user deck:", error);
    return {}; // Return empty deck as fallback
  }
}

// Draw hand of cards from deck
async function drawHandFromDeck(deck, handSize) {
  try {
    let pool = [];
    const cardIds = Object.keys(deck);

    // Get card details from database
    const cardDetails = await getCardsByIds(cardIds);

    // Create card pool with proper counts
    for (const cardId in deck) {
      const count = deck[cardId];
      const cardDetail = cardDetails.find((card) => card.id === cardId);

      if (!cardDetail) {
        console.warn(`Card definition not found for ${cardId}, skipping`);
        continue;
      }

      // Format card for game use
      const gameCard = {
        id: cardDetail.id,
        name: cardDetail.name,
        type: cardDetail.type,
        cost: cardDetail.inGameCost || { production: 0, gold: 0 },
        effect: cardDetail.effect,
        health: cardDetail.health,
        attackDamage: cardDetail.attackDamage,
        attackRange: cardDetail.attackRange,
        attackInterval: cardDetail.attackInterval,
        speed: cardDetail.speed,
        cityDamage: cardDetail.cityDamage,
        reusable: cardDetail.reusable,
        hideFromInventory: cardDetail.hideFromInventory,
        alwaysInInventory: cardDetail.alwaysInInventory,
      };

      // Add card to pool based on count
      for (let i = 0; i < count; i++) {
        pool.push(gameCard);
      }
    }

    // Shuffle and return hand
    shuffleArray(pool);
    return pool.slice(0, handSize);
  } catch (error) {
    console.error("Error drawing hand from deck:", error);
    return []; // Return empty hand as fallback
  }
}

// Card purchase handler
async function handleBuyCard(socket, io, lobbies, data) {
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

  // Get card definition from player's hand
  const cardDef = player.currentHand[handIndex];
  if (!cardDef) {
    socket.emit("cardPurchaseError", { message: "Invalid card." });
    return;
  }

  // Check cost
  const cost = cardDef.cost?.production || 0;
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

// Register socket handlers
function registerHandlers(socket, io, lobbies) {
  socket.on("buyCard", (data) => handleBuyCard(socket, io, lobbies, data));
}

// Helper function to shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

module.exports = {
  registerHandlers,
  initializePlayerDeckFromUserDeck,
  drawHandFromDeck,
};
