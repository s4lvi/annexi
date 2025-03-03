// server/app.js
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import route handlers
const authRoutes = require("./routes/auth");
const lobbyRoutes = require("./routes/lobby");
const gameMatchRoutes = require("./routes/gameMatch");
const cardRoutes = require("./routes/card");
const deckRoutes = require("./routes/deck");
const profileRoutes = require("./routes/profile");
const shopRoutes = require("./routes/shop");

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/strategy-game",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    console.log("MongoDB connected");
    // We'll keep this for development, but in production you might want to remove it
    const Lobby = require("./models/lobby");
    const GameMatch = require("./models/gameMatch");
    const User = require("./models/user");
    Promise.all([
      Lobby.deleteMany({}),
      GameMatch.deleteMany({}),
      User.deleteMany({}),
    ])
      .then(() => {
        console.log("Cleared all lobbies and game matches.");
      })
      .catch((err) => {
        console.error("Error clearing lobbies and game matches", err);
      });
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/lobby", lobbyRoutes);
app.use("/api/match", gameMatchRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/shop", shopRoutes);

// Basic route for checking server status
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", serverTime: new Date() });
});

// Socket handlers
const registerSocketHandlers = require("./socket/index");
registerSocketHandlers(io);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server }; // Export for testing
