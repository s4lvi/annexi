const lobbies = {};

module.exports = function (io) {
  function createPhaseTimer(lobbyId) {
    const phaseDuration = lobbies[lobbyId].settings.phaseDuration;
    return setInterval(() => {
      try {
        console.log("Changing phase for lobby:", lobbyId);
        lobbies[lobbyId].phase =
          lobbies[lobbyId].phase === "expand" ? "conquer" : "expand";
        io.to(`lobby-${lobbyId}`).emit("phaseChange", {
          phase: lobbies[lobbyId].phase,
          phaseDuration,
        });
      } catch (error) {
        console.error("Error in phase timer:", error);
      }
    }, lobbies[lobbyId].settings.phaseDuration);
  }

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinLobby", (data) => {
      const { lobbyId, username, _id } = data;
      socket.join(`lobby-${lobbyId}`);

      // If the lobby doesn't exist, create it with default settings.
      if (!lobbies[lobbyId]) {
        lobbies[lobbyId] = {
          players: [],
          timer: null,
          phase: "expand",
          settings: {
            phaseDuration: 300000, // default to 30 seconds; changeable later
          },
        };
      }

      // Add the player to the lobby.
      if (lobbies[lobbyId].players.some((p) => p._id === _id)) {
        console.log("Player already in lobby:", username);
        return;
      }
      lobbies[lobbyId].players.push({
        socketId: socket.id,
        username,
        _id,
        ready: false,
      });

      io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
        players: lobbies[lobbyId].players,
        message: `${username} joined the lobby.`,
      });
    });

    socket.on("startGame", (data) => {
      const { lobbyId, mapData } = data;
      console.log("Starting game for lobby:", lobbyId);
      if (!lobbies[lobbyId]) return;

      // Initialize the phase.
      lobbies[lobbyId].phase = "expand";
      io.to(`lobby-${lobbyId}`).emit("gameStarted", {
        mapData,
        players: lobbies[lobbyId].players,
        phase: lobbies[lobbyId].phase,
        phaseDuration: lobbies[lobbyId].settings.phaseDuration,
      });

      // Clear any existing timer and start a new phase timer.
      if (lobbies[lobbyId].timer) {
        clearInterval(lobbies[lobbyId].timer);
      }
      lobbies[lobbyId].timer = createPhaseTimer(lobbyId);
    });

    socket.on("playerReady", (data) => {
      const { lobbyId, username, _id } = data;
      if (lobbies[lobbyId]) {
        // Mark this player as ready.
        lobbies[lobbyId].players = lobbies[lobbyId].players.map((player) => {
          if (player._id === _id) {
            return { ...player, ready: true };
          }
          return player;
        });
        io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
          players: lobbies[lobbyId].players,
          message: `${username} is ready.`,
        });

        // Check if all players are ready.
        const allReady =
          lobbies[lobbyId].players.length > 0 &&
          lobbies[lobbyId].players.every((player) => player.ready);
        if (allReady) {
          console.log(
            `All players in lobby ${lobbyId} are ready. Advancing phase.`
          );
          // Clear the current timer.
          if (lobbies[lobbyId].timer) {
            clearInterval(lobbies[lobbyId].timer);
          }
          // Advance phase immediately.
          lobbies[lobbyId].phase =
            lobbies[lobbyId].phase === "expand" ? "conquer" : "expand";
          io.to(`lobby-${lobbyId}`).emit("phaseChange", {
            phase: lobbies[lobbyId].phase,
            phaseDuration: lobbies[lobbyId].settings.phaseDuration,
          });
          // Restart the timer.
          lobbies[lobbyId].timer = createPhaseTimer(lobbyId);
          // Reset all players' ready status.
          lobbies[lobbyId].players = lobbies[lobbyId].players.map((player) => ({
            ...player,
            ready: false,
          }));
          io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
            players: lobbies[lobbyId].players,
            message: `All players were ready. Phase moved to ${lobbies[lobbyId].phase}.`,
          });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      // Remove the disconnected socket from all lobbies.
      for (const lobbyId in lobbies) {
        const beforeCount = lobbies[lobbyId].players.length;
        lobbies[lobbyId].players = lobbies[lobbyId].players.filter(
          (p) => p.socketId !== socket.id
        );
        if (lobbies[lobbyId].players.length !== beforeCount) {
          io.to(`lobby-${lobbyId}`).emit("lobbyUpdate", {
            players: lobbies[lobbyId].players,
            message: `A player left the lobby.`,
          });
        }
      }
    });
  });
};
