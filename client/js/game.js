// client/js/game.js

// Create a global reference to the Phaser game instance
window.gameInstance = null;

window.onload = function () {
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
      preload: preload,
      create: create,
      update: update,
    },
  };

  window.gameInstance = new Phaser.Game(config);
  window.gameInstance.mapData = null;
};

function preload() {
  // Load assets if needed
}

function create() {
  // Draw map if already available
  if (window.gameInstance.mapData) {
    drawMap.call(this, window.gameInstance.mapData);
  }
}

function update() {
  // Game loop logic
}

// Allow setting/updating map data after game start
window.gameInstance.setMapData = function (mapData) {
  this.mapData = mapData;
  if (this.scene && this.scene.scenes[0]) {
    drawMap.call(this.scene.scenes[0], mapData);
  }
};

// Example function to draw a hex grid based on mapData
function drawMap(mapData) {
  const hexSize = 30; // Adjust as needed
  mapData.forEach((hex) => {
    // Convert axial coordinates (q, r) to pixel coordinates
    const x = hexSize * 1.5 * hex.q + 400;
    const y = hexSize * Math.sqrt(3) * (hex.r + hex.q / 2) + 300;
    const graphics = this.add.graphics({ fillStyle: { color: 0x00ff00 } });
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.DegToRad(60 * i);
      points.push(
        new Phaser.Math.Vector2(
          x + hexSize * Math.cos(angle),
          y + hexSize * Math.sin(angle)
        )
      );
    }
    graphics.fillPoints(points, true);
  });
}
