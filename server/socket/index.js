// server/socket/index.js
module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinLobby", (data) => {
      // data should include lobbyId and user info
      socket.join(`lobby-${data.lobbyId}`);
      io.to(`lobby-${data.lobbyId}`).emit("lobbyUpdate", {
        message: "A new player has joined.",
      });
    });

    socket.on("startGame", (data) => {
      // data contains lobbyId and (optionally) map data
      io.to(`lobby-${data.lobbyId}`).emit("gameStarted", data.mapData);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
