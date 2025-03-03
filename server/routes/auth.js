// server/routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Register a new user
router.post("/register", authController.register);

// Login a user
router.post("/login", authController.login);

// Create a guest user
router.post("/guest", authController.createGuestUser);

// Convert a guest to a regular user
router.post("/convert", authController.convertGuest);

// Get user by ID
router.get("/user/:userId", authController.getUser);

module.exports = router;
