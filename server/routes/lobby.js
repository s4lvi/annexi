// server/routes/lobby.js
const express = require("express");
const router = express.Router();
const lobbyController = require("../controllers/lobbyController");

router.post("/create", lobbyController.createLobby);
router.get("/list", lobbyController.listLobbies);
router.post("/start", lobbyController.startGame);
router.get("/:lobbyId", lobbyController.getLobby);

module.exports = router;
