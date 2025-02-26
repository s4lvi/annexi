"use client";
import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import ControlsManager from "./ControlsManager";
import { useGameState } from "./gameState";
import HexTileHighlighter from "./HexTileHighlighter";
import { validateCityPlacement } from "./PhaseUi";

export default function PhaserGame({ mapData, matchId, onMapClick }) {
  const gameRef = useRef(null);
  const hasInitialized = useRef(false);
  const { state } = useGameState();

  function renderAdjacencyLines(scene) {
    const hexRadius = scene.registry.get("hexRadius");
    const offsetX = scene.registry.get("offsetX");
    const offsetY = scene.registry.get("offsetY");
    const hexWidth = scene.registry.get("hexWidth");
    const hexHeight = scene.registry.get("hexHeight");
    const gameState = scene.registry.get("gameState");
    const currentPlayerId = gameState?.currentPlayerId;

    // Clear previous lines.
    scene.adjacencyGraphics.clear();

    // Only proceed if we have a current player ID
    if (!currentPlayerId) return;

    // Filter cities to only show the current player's cities
    const playerCities = state.cities.filter(
      (city) => city.playerId === currentPlayerId
    );

    // Draw lines between each pair of the player's cities
    for (let i = 0; i < playerCities.length; i++) {
      for (let j = i + 1; j < playerCities.length; j++) {
        // Calculate distance between cities (hex grid)
        const dx = playerCities[i].x - playerCities[j].x;
        const dy = playerCities[i].y - playerCities[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Compute centers based on hex geometry.
        const centerX1 =
          playerCities[i].x * (hexWidth * 0.75) + hexRadius + offsetX;
        const centerY1 =
          playerCities[i].y * hexHeight +
          (playerCities[i].x % 2 ? hexHeight / 2 : 0) +
          hexHeight / 2 +
          offsetY;

        const centerX2 =
          playerCities[j].x * (hexWidth * 0.75) + hexRadius + offsetX;
        const centerY2 =
          playerCities[j].y * hexHeight +
          (playerCities[j].x % 2 ? hexHeight / 2 : 0) +
          hexHeight / 2 +
          offsetY;

        // Choose color and opacity based on distance thresholds
        if (distance <= 2) {
          // Strong bonus (0.2): green line
          scene.adjacencyGraphics.lineStyle(3, 0x00ff00, 0.8);
          scene.adjacencyGraphics.beginPath();
          scene.adjacencyGraphics.moveTo(centerX1, centerY1);
          scene.adjacencyGraphics.lineTo(centerX2, centerY2);
          scene.adjacencyGraphics.strokePath();
        } else if (distance <= 5) {
          // Medium bonus (0.1): yellow line
          scene.adjacencyGraphics.lineStyle(2, 0xffff00, 0.6);
          scene.adjacencyGraphics.beginPath();
          scene.adjacencyGraphics.moveTo(centerX1, centerY1);
          scene.adjacencyGraphics.lineTo(centerX2, centerY2);
          scene.adjacencyGraphics.strokePath();
        } else if (distance <= 7) {
          // No bonus, but shows potential future connection: red line
          scene.adjacencyGraphics.lineStyle(1, 0xff0000, 0.4);
          scene.adjacencyGraphics.beginPath();
          scene.adjacencyGraphics.moveTo(centerX1, centerY1);
          scene.adjacencyGraphics.lineTo(centerX2, centerY2);
          scene.adjacencyGraphics.strokePath();
        }
      }
    }
  }

  // Initial game setup - only run once
  useEffect(() => {
    // CRITICAL FIX: If we've already initialized, don't recreate the game
    if (hasInitialized.current) {
      return;
    }

    if (!mapData) return;

    hasInitialized.current = true;
    console.log("Initializing Phaser game ONCE");

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
          this.registry.set("hexRadius", hexRadius);
          this.registry.set("hexWidth", hexWidth);
          this.registry.set("hexHeight", hexHeight);
          this.registry.set("gameState", state);

          // Set initial phase and placingCity from global state.
          this.registry.set("phase", state.phase);
          this.registry.set("placingCity", state.placingCity);

          // Create a new graphics object for the base map
          this.mapGraphics = this.add.graphics();
          this.adjacencyGraphics = this.add.graphics();
          this.legendGraphics = this.add.graphics();
          // Create separate graphics layers for territories and cities
          this.territoryGraphics = this.add.graphics();
          this.cityGraphics = this.add.graphics();

          this.cameras.main.setZoom(1);

          const colors = {
            grass: 0x55aa55,
            mountain: 0x888888,
            water: 0x3366cc,
          };

          // Player colors for territories (avoid bright green)
          this.playerColors = [
            0xed6a5a, // red
            0x5ca4a9, // teal
            0xe6af2e, // yellow
            0x9370db, // purple
            0x3d405b, // navy
            0x81b29a, // sage
            0xf4845f, // orange
            0x706677, // slate
          ];

          const hexagonPoints = [
            { x: -hexRadius, y: 0 },
            { x: -hexRadius / 2, y: (-hexRadius * Math.sqrt(3)) / 2 },
            { x: hexRadius / 2, y: (-hexRadius * Math.sqrt(3)) / 2 },
            { x: hexRadius, y: 0 },
            { x: hexRadius / 2, y: (hexRadius * Math.sqrt(3)) / 2 },
            { x: -hexRadius / 2, y: (hexRadius * Math.sqrt(3)) / 2 },
          ];

          // Store hex points for reuse
          this.registry.set("hexagonPoints", hexagonPoints);

          // Instantiate the highlighter.
          const highlighter = new HexTileHighlighter(
            this,
            hexagonPoints,
            hexRadius,
            offsetX,
            offsetY
          );
          this.highlighter = highlighter;

          // Render each tile.
          for (let row = 0; row < mapData.length; row++) {
            for (let col = 0; col < mapData[row].length; col++) {
              const tile = mapData[row][col];
              const centerX = col * (hexWidth * 0.75) + hexRadius + offsetX;
              const centerY =
                row * hexHeight +
                (col % 2 ? hexHeight / 2 : 0) +
                hexHeight / 2 +
                offsetY;

              // Store center points in the tile for future reference
              tile.centerX = centerX;
              tile.centerY = centerY;

              const points = hexagonPoints.map((p) => ({
                x: p.x + centerX,
                y: p.y + centerY,
              }));

              this.mapGraphics.fillStyle(colors[tile.type] || colors.grass, 1);
              this.mapGraphics.beginPath();
              this.mapGraphics.moveTo(points[0].x, points[0].y);
              for (let i = 1; i < points.length; i++) {
                this.mapGraphics.lineTo(points[i].x, points[i].y);
              }
              this.mapGraphics.closePath();
              this.mapGraphics.fillPath();
            }
          }

          // Instantiate and register ControlsManager.
          const controlsManager = new ControlsManager(this, onMapClick);
          controlsManager.register();

          // Use pointermove to update highlight.
          this.input.on("pointermove", (pointer) => {
            const tile = controlsManager.getTileAt(pointer.x, pointer.y);
            // Only highlight if in expand phase and placingCity is true.
            if (
              this.registry.get("phase") === "expand" &&
              this.registry.get("placingCity")
            ) {
              const currentState = this.registry.get("gameState");

              // Use the same validation function as in PhaseUI
              const isValid = validateCityPlacement(tile, currentState);
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
    };
  }, [mapData, matchId, onMapClick, state.phase, state.placingCity]);

  // Update Phaser scene registry and render cities and territories
  useEffect(() => {
    if (
      gameRef.current &&
      gameRef.current.scene &&
      gameRef.current.scene.scenes.length > 0
    ) {
      const scene = gameRef.current.scene.scenes[0];
      scene.registry.set("phase", state.phase);
      scene.registry.set("placingCity", state.placingCity);
      scene.registry.set("gameState", state);

      // Render cities and territories
      if (scene.cityGraphics && scene.territoryGraphics) {
        // Clear previous renders
        scene.cityGraphics.clear();
        scene.territoryGraphics.clear();

        // Get hex dimensions
        const hexRadius = scene.registry.get("hexRadius");
        const hexWidth = scene.registry.get("hexWidth");
        const hexHeight = scene.registry.get("hexHeight");
        const hexagonPoints = scene.registry.get("hexagonPoints");
        const offsetX = scene.registry.get("offsetX");
        const offsetY = scene.registry.get("offsetY");

        // Render territories first (underneath cities)
        const territories = state.territories;
        Object.keys(territories).forEach((playerId, playerIndex) => {
          const player = state.players.find((p) => p._id === playerId);

          // Use player's selected color if available, fall back to index-based color if not
          const color =
            player && player.color
              ? player.color.value
              : scene.playerColors[playerIndex % scene.playerColors.length];
          const alpha = 0.6; // Semi-transparent

          territories[playerId].forEach((territory) => {
            if (
              mapData &&
              mapData[territory.y] &&
              mapData[territory.y][territory.x]
            ) {
              const tile = mapData[territory.y][territory.x];

              // Calculate hex center coordinates
              const centerX =
                territory.x * (hexWidth * 0.75) + hexRadius + offsetX;
              const centerY =
                territory.y * hexHeight +
                (territory.x % 2 ? hexHeight / 2 : 0) +
                hexHeight / 2 +
                offsetY;

              // Draw territory hex
              const points = hexagonPoints.map((p) => ({
                x: p.x + centerX,
                y: p.y + centerY,
              }));

              scene.territoryGraphics.fillStyle(color, alpha);
              scene.territoryGraphics.beginPath();
              scene.territoryGraphics.moveTo(points[0].x, points[0].y);
              for (let i = 1; i < points.length; i++) {
                scene.territoryGraphics.lineTo(points[i].x, points[i].y);
              }
              scene.territoryGraphics.closePath();
              scene.territoryGraphics.fillPath();

              // Add a border
              scene.territoryGraphics.lineStyle(1, color, 0.8);
              scene.territoryGraphics.strokePath();
            }
          });
        });

        // Now render cities on top
        state.cities.forEach((city) => {
          if (mapData && mapData[city.y] && mapData[city.y][city.x]) {
            // Find player index for color
            let playerIndex = 0;
            Object.keys(territories).forEach((pid, idx) => {
              if (pid === city.playerId) playerIndex = idx;
            });

            const player = state.players.find((p) => p._id === city.playerId);

            // Use player's selected color if available, fall back to index-based color if not
            const color =
              player && player.color
                ? player.color.value
                : scene.playerColors[playerIndex % scene.playerColors.length];

            // Calculate hex center coordinates
            const centerX = city.x * (hexWidth * 0.75) + hexRadius + offsetX;
            const centerY =
              city.y * hexHeight +
              (city.x % 2 ? hexHeight / 2 : 0) +
              hexHeight / 2 +
              offsetY;

            // Draw city hex - solid color
            const points = hexagonPoints.map((p) => ({
              x: p.x + centerX,
              y: p.y + centerY,
            }));

            scene.cityGraphics.fillStyle(color, 1);
            scene.cityGraphics.beginPath();
            scene.cityGraphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
              scene.cityGraphics.lineTo(points[i].x, points[i].y);
            }
            scene.cityGraphics.closePath();
            scene.cityGraphics.fillPath();

            // Draw city indicator (a simple building shape)
            scene.cityGraphics.fillStyle(0xffffff, 0.9);

            // Draw a simple building in the center
            const buildingWidth = hexRadius * 0.6;
            const buildingHeight = hexRadius * 0.8;
            scene.cityGraphics.fillRect(
              centerX - buildingWidth / 2,
              centerY - buildingHeight / 2,
              buildingWidth,
              buildingHeight
            );

            // Add a roof
            scene.cityGraphics.fillStyle(0x000000, 0.7);
            scene.cityGraphics.beginPath();
            scene.cityGraphics.moveTo(
              centerX - buildingWidth / 2,
              centerY - buildingHeight / 2
            );
            scene.cityGraphics.lineTo(centerX, centerY - buildingHeight);
            scene.cityGraphics.lineTo(
              centerX + buildingWidth / 2,
              centerY - buildingHeight / 2
            );
            scene.cityGraphics.closePath();
            scene.cityGraphics.fillPath();

            // Add level indicator if greater than 1
            if (city.level > 1) {
              scene.cityGraphics.setFont("14px Arial");
              scene.cityGraphics.setFill("#000000");
              scene.cityGraphics.fillText(
                city.level.toString(),
                centerX - 4,
                centerY + 5
              );
            }
          }
        });

        // Draw adjacency lines after cities are rendered
        renderAdjacencyLines(scene);
      }
    }
  }, [
    state.phase,
    state.placingCity,
    state.cities,
    state.territories,
    state.currentPlayerId,
    mapData,
    state.lastUpdate,
  ]);

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
