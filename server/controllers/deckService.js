// server/services/deckService.js
const User = require("../models/user");
const Card = require("../models/card");
const { starterDeck } = require("../seedDatabase");

// Constants for deck validation
const MAX_DECK_SIZE = 30;
const MIN_DECK_SIZE = 10;
const MAX_COPIES_PER_CARD = 3;

// Get all decks for a user
const getUserDecks = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user.decks;
  } catch (error) {
    console.error(`Error fetching decks for user ${userId}:`, error);
    throw error;
  }
};

// Get a specific deck by ID
const getDeckById = async (userId, deckId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const deck = user.decks.id(deckId);
    if (!deck) {
      throw new Error("Deck not found");
    }

    return deck;
  } catch (error) {
    console.error(`Error fetching deck ${deckId} for user ${userId}:`, error);
    throw error;
  }
};

// Create a new deck for a user
const createDeck = async (userId, deckData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate the deck data
    if (!deckData.name) {
      throw new Error("Deck name is required");
    }

    // Create new deck
    const newDeck = {
      name: deckData.name,
      description: deckData.description || "",
      cards: deckData.cards || [],
      isDefault: deckData.isDefault || false,
    };

    // If this is set as default, unset any existing default
    if (newDeck.isDefault) {
      user.decks.forEach((deck) => {
        deck.isDefault = false;
      });
    }

    user.decks.push(newDeck);
    await user.save();

    return user.decks[user.decks.length - 1];
  } catch (error) {
    console.error(`Error creating deck for user ${userId}:`, error);
    throw error;
  }
};

// Update an existing deck
const updateDeck = async (userId, deckId, deckData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const deckIndex = user.decks.findIndex((d) => d._id.toString() === deckId);
    if (deckIndex === -1) {
      throw new Error("Deck not found");
    }

    // Update deck properties
    if (deckData.name) user.decks[deckIndex].name = deckData.name;
    if (deckData.description !== undefined)
      user.decks[deckIndex].description = deckData.description;
    if (deckData.cards) user.decks[deckIndex].cards = deckData.cards;

    // Handle default status
    if (deckData.isDefault) {
      // Unset any existing default deck
      user.decks.forEach((deck, i) => {
        user.decks[i].isDefault = i === deckIndex;
      });
    }

    user.decks[deckIndex].updatedAt = Date.now();

    await user.save();
    return user.decks[deckIndex];
  } catch (error) {
    console.error(`Error updating deck ${deckId} for user ${userId}:`, error);
    throw error;
  }
};

// Delete a deck
const deleteDeck = async (userId, deckId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const deckIndex = user.decks.findIndex((d) => d._id.toString() === deckId);
    if (deckIndex === -1) {
      throw new Error("Deck not found");
    }

    // If deleting the default deck, we need to set another as default if available
    const isDefault = user.decks[deckIndex].isDefault;

    // Remove the deck
    user.decks.splice(deckIndex, 1);

    // If we're deleting the default deck and have other decks, set a new default
    if (isDefault && user.decks.length > 0) {
      user.decks[0].isDefault = true;
    }

    await user.save();
    return { success: true, message: "Deck deleted successfully" };
  } catch (error) {
    console.error(`Error deleting deck ${deckId} for user ${userId}:`, error);
    throw error;
  }
};

// Set a deck as the default
const setDefaultDeck = async (userId, deckId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    let foundDeck = false;

    // Update all decks, setting only the selected one as default
    user.decks.forEach((deck) => {
      if (deck._id.toString() === deckId) {
        deck.isDefault = true;
        foundDeck = true;
      } else {
        deck.isDefault = false;
      }
    });

    if (!foundDeck) {
      throw new Error("Deck not found");
    }

    await user.save();
    return { success: true, message: "Default deck updated successfully" };
  } catch (error) {
    console.error(
      `Error setting default deck ${deckId} for user ${userId}:`,
      error
    );
    throw error;
  }
};

// Validate a deck
const validateDeck = async (userId, deckCards) => {
  try {
    // Check deck size
    if (deckCards.length > MAX_DECK_SIZE) {
      return {
        valid: false,
        message: `Deck exceeds maximum size of ${MAX_DECK_SIZE} cards`,
      };
    }

    if (deckCards.length < MIN_DECK_SIZE) {
      return {
        valid: false,
        message: `Deck needs at least ${MIN_DECK_SIZE} cards`,
      };
    }

    // Get user's owned cards
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get all card details
    const cards = await Card.find({ id: { $in: deckCards } });

    // Check if user owns all the cards
    const userOwnedCardIds = user.ownedCards.map((oc) => oc.cardId);
    const missingCards = deckCards.filter(
      (cardId) => !userOwnedCardIds.includes(cardId)
    );

    if (missingCards.length > 0) {
      return {
        valid: false,
        message: `User doesn't own the following cards: ${missingCards.join(
          ", "
        )}`,
      };
    }

    // Check card count limits
    const cardCounts = {};
    for (const cardId of deckCards) {
      cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    }

    // Check against card limits
    for (const cardId in cardCounts) {
      const card = cards.find((c) => c.id === cardId);
      if (!card) {
        return {
          valid: false,
          message: `Card ${cardId} not found in repository`,
        };
      }

      if (cardCounts[cardId] > (card.count || MAX_COPIES_PER_CARD)) {
        return {
          valid: false,
          message: `Too many copies of ${card.name} (max: ${
            card.count || MAX_COPIES_PER_CARD
          })`,
        };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error(`Error validating deck for user ${userId}:`, error);
    throw error;
  }
};

// Initialize starter deck for a new user
const initializeUserDecks = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Skip if user already has decks
    if (user.decks && user.decks.length > 0) {
      return user.decks;
    }

    // Create a starter deck
    user.decks.push({
      name: "Starter Deck",
      description: "Basic deck for new players",
      cards: starterDeck,
      isDefault: true,
    });

    await user.save();
    return user.decks;
  } catch (error) {
    console.error(`Error initializing decks for user ${userId}:`, error);
    throw error;
  }
};

// Get the default deck for a user
const getDefaultDeck = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const defaultDeck = user.decks.find((deck) => deck.isDefault);
    if (!defaultDeck) {
      // If no default deck is set but user has decks, set the first as default
      if (user.decks.length > 0) {
        user.decks[0].isDefault = true;
        await user.save();
        return user.decks[0];
      }
      throw new Error("No default deck found");
    }

    return defaultDeck;
  } catch (error) {
    console.error(`Error getting default deck for user ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  getUserDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
  setDefaultDeck,
  validateDeck,
  initializeUserDecks,
  getDefaultDeck,
};
