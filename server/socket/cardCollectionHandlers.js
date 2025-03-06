// server/socket/cardCollectionHandlers.js
const User = require("../models/user");
const { getUserCards } = require("../controllers/cardService");
const {
  getUserDecks,
  getUserDefaultDeck,
} = require("../controllers/deckService");

// Handle request for user's cards
async function handleGetUserCards(socket, data) {
  try {
    const { userId } = data;

    if (!userId) {
      socket.emit("cardCollectionError", {
        message: "User ID is required",
      });
      return;
    }

    const cards = await getUserCards(userId);
    console.log("User cards:", cards);
    socket.emit("userCardsResponse", {
      success: true,
      cards,
    });
  } catch (error) {
    console.error("Error in handleGetUserCards:", error);
    socket.emit("cardCollectionError", {
      message: error.message || "Failed to get user cards",
    });
  }
}

// Handle request for user's decks
async function handleGetUserDecks(socket, data) {
  try {
    const { userId } = data;

    if (!userId) {
      socket.emit("deckCollectionError", {
        message: "User ID is required",
      });
      return;
    }

    const decks = await getUserDecks(userId);

    socket.emit("userDecksResponse", {
      success: true,
      decks,
    });
  } catch (error) {
    console.error("Error in handleGetUserDecks:", error);
    socket.emit("deckCollectionError", {
      message: error.message || "Failed to get user decks",
    });
  }
}

// Handle request for user's default deck
async function handleGetDefaultDeck(socket, data) {
  try {
    const { userId } = data;

    if (!userId) {
      socket.emit("deckCollectionError", {
        message: "User ID is required",
      });
      return;
    }

    const deck = await getUserDefaultDeck(userId);

    socket.emit("defaultDeckResponse", {
      success: true,
      deck,
    });
  } catch (error) {
    console.error("Error in handleGetDefaultDeck:", error);
    socket.emit("deckCollectionError", {
      message: error.message || "Failed to get default deck",
    });
  }
}

// Handle post-match rewards
async function handlePostMatchRewards(socket, io, data) {
  try {
    const { userId, matchResult } = data;

    if (!userId || !matchResult) {
      socket.emit("rewardError", {
        message: "User ID and match result are required",
      });
      return;
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      socket.emit("rewardError", { message: "User not found" });
      return;
    }

    // Calculate rewards based on match outcome
    const currencyReward = matchResult.won ? 100 : 25;

    // Update user's currency
    user.currency += currencyReward;

    // Update user's stats
    user.stats.matchesPlayed += 1;
    if (matchResult.won) {
      user.stats.wins += 1;
    } else {
      user.stats.losses += 1;
    }

    // Update win rate
    const totalMatches = user.stats.wins + user.stats.losses;
    if (totalMatches > 0) {
      user.stats.winRate = Math.round((user.stats.wins / totalMatches) * 100);
    }

    // Update last played
    user.stats.lastPlayed = new Date();

    // Update favorite cards if cards were used
    if (matchResult.cardsUsed && matchResult.cardsUsed.length > 0) {
      const cardCounts = {};

      // Count existing favorites
      user.stats.favoriteCards.forEach((cardId) => {
        cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
      });

      // Add cards used in this match
      matchResult.cardsUsed.forEach((cardId) => {
        cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
      });

      // Sort by usage and take top 5
      user.stats.favoriteCards = Object.entries(cardCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => entry[0]);
    }

    await user.save();

    // Send the reward info to the client
    socket.emit("rewardSuccess", {
      success: true,
      message: `You received ${currencyReward} currency for this match`,
      currencyReward,
      newBalance: user.currency,
      newStats: user.stats,
    });
  } catch (error) {
    console.error("Error in handlePostMatchRewards:", error);
    socket.emit("rewardError", {
      message: error.message || "Failed to process match rewards",
    });
  }
}

// Register all card collection socket handlers
function registerCardCollectionHandlers(socket, io) {
  socket.on("getUserCards", (data) => handleGetUserCards(socket, data));
  socket.on("getUserDecks", (data) => handleGetUserDecks(socket, data));
  socket.on("getDefaultDeck", (data) => handleGetDefaultDeck(socket, data));
  socket.on("postMatchRewards", (data) =>
    handlePostMatchRewards(socket, io, data)
  );
}

module.exports = {
  registerCardCollectionHandlers,
};
