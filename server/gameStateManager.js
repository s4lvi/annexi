// server/gameStateManager.js
const gameStates = {};

module.exports = {
  createGameState: (matchId, mapData) => {
    // You can also store other state info like units, resources, etc.
    gameStates[matchId] = { mapData, otherState: {} };
    return gameStates[matchId];
  },
  getGameState: (matchId) => gameStates[matchId],
  updateGameState: (matchId, newState) => {
    gameStates[matchId] = newState;
  },
  deleteGameState: (matchId) => {
    delete gameStates[matchId];
  },
  getAllStates: () => gameStates,
};
