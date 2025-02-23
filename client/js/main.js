// client/js/main.js

// Connect to Socket.IO
const socket = io();

// Placeholder current user (in a real app, handle authentication properly)
const currentUser = { id: 1, username: "Player1" };

// Function to join a lobby
function joinLobby(lobbyId) {
  socket.emit("joinLobby", { lobbyId, userId: currentUser.id });
}

// Listen for lobby updates
socket.on("lobbyUpdate", (data) => {
  console.log("Lobby update:", data);
});

// Listen for game start event with map data
socket.on("gameStarted", (mapData) => {
  console.log("Game started! Map data received:", mapData);
  // Pass mapData to your Phaser game
  initGame(mapData);
});

// Fetch open lobbies from the server and display them
fetch("/api/lobby/list")
  .then((response) => response.json())
  .then((data) => {
    const lobbyDiv = document.getElementById("lobbyList");
    data.lobbies.forEach((lobby) => {
      const btn = document.createElement("button");
      btn.innerText = lobby.name;
      btn.onclick = () => joinLobby(lobby.id);
      lobbyDiv.appendChild(btn);
    });
  })
  .catch((err) => console.error(err));

// Function to initialize (or update) the Phaser game with the received map data
function initGame(mapData) {
  if (
    window.gameInstance &&
    typeof window.gameInstance.setMapData === "function"
  ) {
    window.gameInstance.setMapData(mapData);
  }
}
