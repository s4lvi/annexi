// server/routes/gameMatch.js
const express = require("express");
const router = express.Router();
const gameMatchController = require("../controllers/gameMatchController");

// POST endpoint to start a new game match
router.post("/start", gameMatchController.startMatch);

module.exports = router;
