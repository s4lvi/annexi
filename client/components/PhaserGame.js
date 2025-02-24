// components/PhaserGame.js
"use client";
import { useEffect } from "react";
import * as Phaser from "phaser";
import ControlsManager from "./ControlsManager";

export default function PhaserGame({ mapData, matchId }) {
  useEffect(() => {
    if (!mapData) return;

    const hexRadius = 20;
    const hexWidth = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const totalCols = mapData[0]?.length || 0;
    const totalRows = mapData.length;
    const totalWidth = totalCols * (hexWidth * 0.75) + hexRadius;
    const totalHeight = totalRows * hexHeight + hexHeight / 2;
    // Center the map in the full-window canvas.
    const offsetX = (window.innerWidth - totalWidth) / 2;
    const offsetY = (window.innerHeight - totalHeight) / 2;
    const hexagonPoints = [
      { x: -hexRadius, y: 0 },
      { x: -hexRadius / 2, y: (-hexRadius * Math.sqrt(3)) / 2 },
      { x: hexRadius / 2, y: (-hexRadius * Math.sqrt(3)) / 2 },
      { x: hexRadius, y: 0 },
      { x: hexRadius / 2, y: (hexRadius * Math.sqrt(3)) / 2 },
      { x: -hexRadius / 2, y: (hexRadius * Math.sqrt(3)) / 2 },
    ];
    // Store offsets in registry for ControlsManager
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: "phaser-game",
      scene: {
        create: function () {
          // Save offsets in registry so they can be used in hit tests
          this.registry.set("offsetX", offsetX);
          this.registry.set("offsetY", offsetY);
          this.registry.set("mapCols", mapData[0]?.length || 0);
          this.registry.set("mapRows", mapData.length);

          this.cameras.main.setZoom(1);
          const graphics = this.add.graphics();
          const colors = {
            grass: 0x55aa55,
            mountain: 0x888888,
            water: 0x3366cc,
          };

          for (let row = 0; row < mapData.length; row++) {
            for (let col = 0; col < mapData[row].length; col++) {
              const tile = mapData[row][col];
              const centerX = col * (hexWidth * 0.75) + hexRadius + offsetX;
              const centerY =
                row * hexHeight +
                (col % 2 ? hexHeight / 2 : 0) +
                hexHeight / 2 +
                offsetY;
              const points = hexagonPoints.map((p) => ({
                x: p.x + centerX,
                y: p.y + centerY,
              }));
              graphics.fillStyle(colors[tile.type] || colors.grass, 1);
              graphics.beginPath();
              graphics.moveTo(points[0].x, points[0].y);
              for (let i = 1; i < points.length; i++) {
                graphics.lineTo(points[i].x, points[i].y);
              }
              graphics.closePath();
              graphics.fillPath();
            }
          }

          // Instantiate and register the ControlsManager.
          const controlsManager = new ControlsManager(this);
          controlsManager.register();

          // Tooltip example for debugging pointer coordinates
          const tooltip = this.add
            .text(0, 0, "", {
              font: "16px Arial",
              fill: "#ffffff",
              backgroundColor: "#000000",
              padding: { x: 4, y: 2 },
            })
            .setDepth(1)
            .setScrollFactor(0);
          const tileSelector = this.add.graphics();

          this.input.on("pointermove", (pointer) => {
            const tile = controlsManager.getTileAt(pointer.x, pointer.y);
            const camera = this.cameras.main;
            tileSelector.clear();
            // Add zoom level to debug output
            tooltip.setText(`(${tile.col}, ${tile.row})`);

            tooltip.setScale(1 / camera.zoom);

            // Try using camera's viewport coordinates
            const viewportX = pointer.worldX - camera.scrollX;
            const viewportY = pointer.worldY - camera.scrollY;
            tooltip.setPosition(viewportX + 10, viewportY + 10);

            const centerX = tile.col * (hexWidth * 0.75) + hexRadius + offsetX;
            const centerY =
              tile.row * hexHeight +
              (tile.col % 2 ? hexHeight / 2 : 0) +
              hexHeight / 2 +
              offsetY;
            const points = hexagonPoints.map((p) => ({
              x: p.x + centerX,
              y: p.y + centerY,
            }));
            tileSelector.lineStyle(2, 0x00ff00, 1);
            tileSelector.beginPath();
            tileSelector.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
              tileSelector.lineTo(points[i].x, points[i].y);
            }
            tileSelector.closePath();
            tileSelector.strokePath();
          });
        },
      },
    };

    const game = new Phaser.Game(config);

    const handleResize = () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      game.destroy(true);
    };
  }, [mapData, matchId]);

  return (
    <div
      id="phaser-game"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
      }}
    />
  );
}
