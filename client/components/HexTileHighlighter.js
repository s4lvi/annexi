// components/HexTileHighlighter.js
export default class HexTileHighlighter {
  constructor(scene, hexagonPoints, hexRadius, offsetX, offsetY) {
    this.scene = scene;
    this.hexagonPoints = hexagonPoints;
    this.hexRadius = hexRadius;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.graphics = scene.add.graphics();
  }

  updateHighlight(tile, isValid) {
    const { col, row } = tile;
    const hexWidth = 2 * this.hexRadius;
    const hexHeight = Math.sqrt(3) * this.hexRadius;
    const centerX = col * (hexWidth * 0.75) + this.hexRadius + this.offsetX;
    const centerY =
      row * hexHeight +
      (col % 2 ? hexHeight / 2 : 0) +
      hexHeight / 2 +
      this.offsetY;

    const points = this.hexagonPoints.map((p) => ({
      x: p.x + centerX,
      y: p.y + centerY,
    }));

    this.graphics.clear();

    // Draw filled hexagon using a semi-transparent color.
    const fillColor = isValid ? 0x00ff00 : 0xff0000;
    this.graphics.fillStyle(fillColor, 0.5);
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((pt) => this.graphics.lineTo(pt.x, pt.y));
    this.graphics.closePath();
    this.graphics.fillPath();

    // Draw outline.
    this.graphics.lineStyle(2, 0x00ff00, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((pt) => this.graphics.lineTo(pt.x, pt.y));
    this.graphics.closePath();
    this.graphics.strokePath();
  }

  hideHighlight() {
    this.graphics.clear();
  }
}
