// gameState.js
class GameState {
  constructor() {
    this.phase = "expand"; // e.g. "expand", "conquer", etc.
    this.placingCity = false;
    this.subscribers = [];
  }

  setPhase(phase) {
    this.phase = phase;
    this.notify();
  }

  setPlacingCity(placingCity) {
    this.placingCity = placingCity;
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  notify() {
    this.subscribers.forEach((cb) =>
      cb({ phase: this.phase, placingCity: this.placingCity })
    );
  }
}

export default new GameState();
