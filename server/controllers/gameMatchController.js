// server/controllers/gameMatchController.js
const GameMatch = require("../models/gameMatch");
const Lobby = require("../models/lobby");
const { generateRandomMap } = require("../utils/mapGenerator");
const gameStateManager = require("../gameStateManager");
const { getDefaultDeck } = require("./deckService");
const { getCardsByIds } = require("./cardService");

exports.startMatch = async (req, res) => {
  const { lobbyId, hostUserId, players } = req.body;
  try {
    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ message: "Lobby not found" });
    }
    if (lobby.gameStarted) {
      return res
        .status(400)
        .json({ message: "Game has already started for this lobby." });
    }

    // Generate map data
    const mapData = generateRandomMap();
    console.log("Generated map data for lobby:", lobbyId);

    // Create an array for playerDecks (not an object)
    const playerDecks = [];
    const playerDecksMap = {}; // Keep the object format for gameStateManager

    for (const playerId of players) {
      try {
        // Get the player's default deck
        const deck = await getDefaultDeck(playerId);

        // Get the full card details for each card in the deck
        const cardDetails = await getCardsByIds(deck.cards);

        // Add to array format for the GameMatch model
        playerDecks.push({
          userId: playerId, // This is the required field that was missing
          deckId: deck._id,
          deckName: deck.name, // Match the field name in the schema
          cards: deck.cards, // Use card IDs as per the schema
        });

        // Keep the object format for gameStateManager
        playerDecksMap[playerId] = {
          deckId: deck._id,
          name: deck.name,
          cards: cardDetails,
        };
      } catch (error) {
        console.error(`Error getting deck for player ${playerId}:`, error);

        // Add fallback to array as well
        playerDecks.push({
          userId: playerId,
          deckId: null,
          deckName: "Default",
          cards: [],
        });

        // Fallback to empty deck if there's an error
        playerDecksMap[playerId] = {
          deckId: null,
          name: "Default",
          cards: [],
        };
      }
    }

    // Create the game match metadata document
    const newMatch = new GameMatch({
      lobbyId,
      hostUserId,
      players,
      playerDecks, // Now using the array format
    });
    await newMatch.save();

    lobby.gameStarted = true;
    await lobby.save();

    // Save the volatile game state in memory
    gameStateManager.createGameState(newMatch._id, mapData, playerDecksMap);

    res.status(201).json({
      message: "Game match started",
      match: newMatch,
      mapData,
      playerDecks: playerDecksMap, // Keep the same response format
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
