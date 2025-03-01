const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/strategy-game",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    console.log("MongoDB connected");
    // Delete all lobbies and matches on startup
    const Lobby = require("./models/lobby");
    const GameMatch = require("./models/gameMatch");
    Promise.all([Lobby.deleteMany({}), GameMatch.deleteMany({})])
      .then(() => {
        console.log("Cleared all lobbies and game matches.");
      })
      .catch((err) => {
        console.error("Error clearing lobbies and game matches", err);
      });
  })
  .catch((err) => console.error("MongoDB connection error:", err));

const authRoutes = require("./routes/auth");
const lobbyRoutes = require("./routes/lobby");
const gameMatchRoutes = require("./routes/gameMatch");

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/lobby", lobbyRoutes);
app.use("/api/match", gameMatchRoutes);

// Use the refactored socket handlers to attach our event listeners.
const registerSocketHandlers = require("./socket/index");
registerSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
