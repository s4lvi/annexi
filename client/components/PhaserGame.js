// components/PhaserGame.js
"use client";
import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import ControlsManager from "./ControlsManager";
import gameState from "./gameState";
import HexTileHighlighter from "./HexTileHighlighter";

export default function PhaserGame({ mapData, matchId, onMapClick }) {
  const gameRef = useRef(null);
  useEffect(() => {
    if (!mapData) return;
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
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
    // Store offsets in registry for ControlsManager
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: "phaser-game",
      scene: {
        create: function () {
          // Set up registry values that never change
          this.registry.set("offsetX", offsetX);
          this.registry.set("offsetY", offsetY);
          this.registry.set("mapCols", mapData[0]?.length || 0);
          this.registry.set("mapRows", mapData.length);
          this.registry.set("mapData", mapData);

          this.cameras.main.setZoom(1);
          const graphics = this.add.graphics();
          const colors = {
            grass: 0x55aa55,
            mountain: 0x888888,
            water: 0x3366cc,
          };
          const hexRadius = 20;
          const hexagonPoints = [
            { x: -hexRadius, y: 0 },
            { x: -hexRadius / 2, y: (-hexRadius * Math.sqrt(3)) / 2 },
            { x: hexRadius / 2, y: (-hexRadius * Math.sqrt(3)) / 2 },
            { x: hexRadius, y: 0 },
            { x: hexRadius / 2, y: (hexRadius * Math.sqrt(3)) / 2 },
            { x: -hexRadius / 2, y: (hexRadius * Math.sqrt(3)) / 2 },
          ];

          // Instantiate the highlighter.
          const highlighter = new HexTileHighlighter(
            this,
            hexagonPoints,
            hexRadius,
            offsetX,
            offsetY
          );
          this.highlighter = highlighter;
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
              if (tile.city) {
                graphics.fillStyle(0xffff00, 1); // Yellow for cities
                graphics.beginPath();
                graphics.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                  graphics.lineTo(points[i].x, points[i].y);
                }
                graphics.closePath();
                graphics.fillPath();
              }
            }
          }
          // Instantiate and register ControlsManager.
          const controlsManager = new ControlsManager(this, onMapClick);
          controlsManager.register();

          // Optionally subscribe to gameState updates
          gameState.subscribe(({ phase, placingCity }) => {
            this.registry.set("phase", phase);
            this.registry.set("placingCity", placingCity);
          });

          // Use pointermove to update highlight.
          this.input.on("pointermove", (pointer) => {
            const tile = controlsManager.getTileAt(pointer.x, pointer.y);
            // Only highlight if in expand phase and placingCity is true.
            if (
              this.registry.get("phase") === "expand" &&
              this.registry.get("placingCity")
            ) {
              const isValid = tile.type === "grass"; // or your validateCityPlacement(tile)
              highlighter.updateHighlight(tile, isValid);
            } else {
              highlighter.hideHighlight();
            }
          });
        },
      },
    };

    const game = new Phaser.Game(config);

    gameRef.current = game;
    const handleResize = () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [mapData, matchId, onMapClick]);

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
