// server/routes/deck.js
const express = require("express");
const router = express.Router();
const deckService = require("../controllers/deckService");

// Get all decks for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const decks = await deckService.getUserDecks(userId);
    res.json({ success: true, decks });
  } catch (error) {
    console.error(`Error in GET /decks/user/${req.params.userId}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a specific deck by ID
router.get("/user/:userId/:deckId", async (req, res) => {
  try {
    const { userId, deckId } = req.params;
    const deck = await deckService.getDeckById(userId, deckId);
    res.json({ success: true, deck });
  } catch (error) {
    console.error(
      `Error in GET /decks/user/${req.params.userId}/${req.params.deckId}:`,
      error
    );

    if (
      error.message === "Deck not found" ||
      error.message === "User not found"
    ) {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new deck
router.post("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const deckData = req.body;

    if (!deckData.name) {
      return res
        .status(400)
        .json({ success: false, message: "Deck name is required" });
    }

    // Validate the deck if cards are provided
    if (deckData.cards && deckData.cards.length > 0) {
      const validationResult = await deckService.validateDeck(
        userId,
        deckData.cards
      );
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: `Invalid deck: ${validationResult.message}`,
        });
      }
    }

    const newDeck = await deckService.createDeck(userId, deckData);
    res.status(201).json({
      success: true,
      message: "Deck created successfully",
      deck: newDeck,
    });
  } catch (error) {
    console.error(`Error in POST /decks/user/${req.params.userId}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update an existing deck
router.put("/user/:userId/:deckId", async (req, res) => {
  try {
    const { userId, deckId } = req.params;
    const deckData = req.body;

    // Validate the deck if cards are provided
    if (deckData.cards) {
      const validationResult = await deckService.validateDeck(
        userId,
        deckData.cards
      );
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: `Invalid deck: ${validationResult.message}`,
        });
      }
    }

    const updatedDeck = await deckService.updateDeck(userId, deckId, deckData);
    res.json({
      success: true,
      message: "Deck updated successfully",
      deck: updatedDeck,
    });
  } catch (error) {
    console.error(
      `Error in PUT /decks/user/${req.params.userId}/${req.params.deckId}:`,
      error
    );

    if (
      error.message === "Deck not found" ||
      error.message === "User not found"
    ) {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a deck
router.delete("/user/:userId/:deckId", async (req, res) => {
  try {
    const { userId, deckId } = req.params;
    const result = await deckService.deleteDeck(userId, deckId);
    res.json({ success: true, message: "Deck deleted successfully" });
  } catch (error) {
    console.error(
      `Error in DELETE /decks/user/${req.params.userId}/${req.params.deckId}:`,
      error
    );

    if (
      error.message === "Deck not found" ||
      error.message === "User not found"
    ) {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Set a deck as the default
router.patch("/user/:userId/:deckId/default", async (req, res) => {
  try {
    const { userId, deckId } = req.params;
    const result = await deckService.setDefaultDeck(userId, deckId);
    res.json({ success: true, message: "Default deck updated successfully" });
  } catch (error) {
    console.error(
      `Error in PATCH /decks/user/${req.params.userId}/${req.params.deckId}/default:`,
      error
    );

    if (
      error.message === "Deck not found" ||
      error.message === "User not found"
    ) {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Validate a deck
router.post("/user/:userId/validate", async (req, res) => {
  try {
    const { userId } = req.params;
    const { cards } = req.body;

    if (!cards || !Array.isArray(cards)) {
      return res
        .status(400)
        .json({ success: false, message: "Cards array is required" });
    }

    const validationResult = await deckService.validateDeck(userId, cards);
    res.json({ success: true, validation: validationResult });
  } catch (error) {
    console.error(
      `Error in POST /decks/user/${req.params.userId}/validate:`,
      error
    );
    res.status(500).json({ success: false, message: error.message });
  }
});

// Initialize starter deck for a new user
router.post("/user/:userId/initialize", async (req, res) => {
  try {
    const { userId } = req.params;
    const decks = await deckService.initializeUserDecks(userId);
    res.json({ success: true, message: "User decks initialized", decks });
  } catch (error) {
    console.error(
      `Error in POST /decks/user/${req.params.userId}/initialize:`,
      error
    );
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get the default deck for a user
router.get("/user/:userId/default", async (req, res) => {
  try {
    const { userId } = req.params;
    const deck = await deckService.getDefaultDeck(userId);
    res.json({ success: true, deck });
  } catch (error) {
    console.error(
      `Error in GET /decks/user/${req.params.userId}/default:`,
      error
    );

    if (
      error.message === "No default deck found" ||
      error.message === "User not found"
    ) {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
