// server/app.js
const express = require("express");
const http = require("http");
const socketio = require("socket.io");

const authRoutes = require("./routes/auth");
const lobbyRoutes = require("./routes/lobby");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/lobby", lobbyRoutes);

// Socket.IO setup
require("./socket")(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
