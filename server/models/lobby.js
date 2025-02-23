// server/models/lobby.js
class Lobby {
  constructor(name, hostUserId) {
    this.id = Lobby.incrementId();
    this.name = name;
    this.hostUserId = hostUserId;
    this.players = [hostUserId];
    this.createdAt = new Date();
    this.mapData = null;
  }

  static incrementId() {
    Lobby.currentId = (Lobby.currentId || 0) + 1;
    return Lobby.currentId;
  }
}

module.exports = Lobby;
