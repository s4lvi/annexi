"use client";
import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import ControlsManager from "./ControlsManager";
import { useGameState } from "./gameState";
import HexTileHighlighter from "./HexTileHighlighter";
import { validateCityPlacement, validateStructurePlacement } from "./PhaseUi";

export default function PhaserGame({ mapData, matchId, onMapClick }) {
  const gameRef = useRef(null);
  const hasInitialized = useRef(false);
  const { state, dispatch } = useGameState();

  function renderAdjacencyLines(scene) {
    const hexRadius = scene.registry.get("hexRadius");
    const offsetX = scene.registry.get("offsetX");
    const offsetY = scene.registry.get("offsetY");
    const hexWidth = scene.registry.get("hexWidth");
    const hexHeight = scene.registry.get("hexHeight");
    // Get the whole game state (which includes currentPlayerId, etc.)
    const gameState = scene.registry.get("gameState");
    const currentPlayerId = gameState?.currentPlayerId;

    scene.adjacencyGraphics.clear();

    if (!currentPlayerId) return;

    const playerCities = state.cities.filter(
      (city) => city.playerId === currentPlayerId
    );

    for (let i = 0; i < playerCities.length; i++) {
      for (let j = i + 1; j < playerCities.length; j++) {
        const dx = playerCities[i].x - playerCities[j].x;
        const dy = playerCities[i].y - playerCities[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

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

        if (distance <= 3) {
          scene.adjacencyGraphics.lineStyle(6, 0x00ff00, 0.3);
        } else if (distance <= 5) {
          scene.adjacencyGraphics.lineStyle(4, 0xffff00, 0.3);
        } else if (distance <= 7) {
          scene.adjacencyGraphics.lineStyle(2, 0xff0000, 0.3);
        }
        scene.adjacencyGraphics.beginPath();
        scene.adjacencyGraphics.moveTo(centerX1, centerY1);
        scene.adjacencyGraphics.lineTo(centerX2, centerY2);
        scene.adjacencyGraphics.strokePath();
      }
    }
  }

  useEffect(() => {
    if (hasInitialized.current) return;
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
    const offsetX = (window.innerWidth - totalWidth) / 2;
    const offsetY = (window.innerHeight - totalHeight) / 2;

    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: "phaser-game",
      scene: {
        preload: function () {
          this.load.setBaseURL("");
          // Preload assets as needed.
        },
        create: function () {
          // Set registry values
          this.registry.set("offsetX", offsetX);
          this.registry.set("offsetY", offsetY);
          this.registry.set("mapCols", mapData[0]?.length || 0);
          this.registry.set("mapRows", mapData.length);
          this.registry.set("mapData", mapData);
          this.registry.set("hexRadius", hexRadius);
          this.registry.set("hexWidth", hexWidth);
          this.registry.set("hexHeight", hexHeight);
          // NEW: Set turnStep instead of phase.
          this.registry.set("turnStep", state.turnStep);
          this.registry.set("placingCity", state.placingCity);
          this.registry.set("placingStructure", state.placingStructure);
          this.registry.set("gameState", state);

          this.mapGraphics = this.add.graphics();
          this.territoryGraphics = this.add.graphics();
          this.adjacencyGraphics = this.add.graphics();
          this.cityGraphics = this.add.graphics();

          this.cameras.main.setZoom(1);

          const colors = {
            grass: 0x55aa55,
            mountain: 0x888888,
            water: 0x3366cc,
          };

          this.playerColors = [
            0xed6a5a, 0x5ca4a9, 0xe6af2e, 0x9370db, 0x3d405b, 0x81b29a,
            0xf4845f, 0x706677,
          ];

          const hexagonPoints = [
            { x: -hexRadius, y: 0 },
            { x: -hexRadius / 2, y: (-hexRadius * Math.sqrt(3)) / 2 },
            { x: hexRadius / 2, y: (-hexRadius * Math.sqrt(3)) / 2 },
            { x: hexRadius, y: 0 },
            { x: hexRadius / 2, y: (hexRadius * Math.sqrt(3)) / 2 },
            { x: -hexRadius / 2, y: (hexRadius * Math.sqrt(3)) / 2 },
          ];
          this.registry.set("hexagonPoints", hexagonPoints);

          const highlighter = new HexTileHighlighter(
            this,
            hexagonPoints,
            hexRadius,
            offsetX,
            offsetY
          );
          this.highlighter = highlighter;

          // Render map tiles.
          for (let row = 0; row < mapData.length; row++) {
            for (let col = 0; col < mapData[row].length; col++) {
              const tile = mapData[row][col];
              const centerX = col * (hexWidth * 0.75) + hexRadius + offsetX;
              const centerY =
                row * hexHeight +
                (col % 2 ? hexHeight / 2 : 0) +
                hexHeight / 2 +
                offsetY;
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

          const controlsManager = new ControlsManager(this, onMapClick);
          controlsManager.register();

          // Update highlight on pointermove based on turnStep.
          this.input.on("pointermove", (pointer) => {
            const tile = controlsManager.getTileAt(pointer.x, pointer.y);
            const currentState = this.registry.get("gameState");
            const turnStep = this.registry.get("turnStep");
            const placingCity = this.registry.get("placingCity");
            const placingStructure = this.registry.get("placingStructure");

            if (turnStep === 0 && placingCity) {
              const isValid = validateCityPlacement(tile, currentState);
              highlighter.updateHighlight(tile, isValid);
            } else if (turnStep === 3 && placingStructure) {
              const isValid = validateStructurePlacement(tile, currentState);
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
  }, [
    mapData,
    matchId,
    onMapClick,
    state.turnStep,
    state.placingCity,
    state.placingStructure,
  ]);

  // Helper function to format image name
  const formatImageName = (type) => {
    return type ? type.toLowerCase().replace(/\s+/g, "_") : "default";
  };

  // Helper function to load an image if not already loaded
  const loadImageIfNeeded = (scene, key, path) => {
    if (!scene.textures.exists(key)) {
      // Create a promise to load the image
      return new Promise((resolve) => {
        scene.load.image(key, path);
        scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
          resolve(true);
        });
        scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
          console.warn(`Failed to load image: ${path}`);
          resolve(false);
        });
        scene.load.start();
      });
    }
    return Promise.resolve(true);
  };

  // Update Phaser scene registry and render cities and territories
  useEffect(() => {
    if (
      gameRef.current &&
      gameRef.current.scene &&
      gameRef.current.scene.scenes.length > 0
    ) {
      const scene = gameRef.current.scene.scenes[0];
      scene.registry.set("turnStep", state.turnStep);
      scene.registry.set("placingCity", state.placingCity);
      scene.registry.set("placingStructure", state.placingStructure);
      scene.registry.set("gameState", state);

      // Render cities and territories
      if (scene.cityGraphics && scene.territoryGraphics) {
        // Clear previous renders
        scene.cityGraphics.clear();
        scene.territoryGraphics.clear();

        // Clear previous images
        if (scene.cityImagesContainer) {
          scene.cityImagesContainer.removeAll(true);
        }

        if (scene.structureImagesContainer) {
          scene.structureImagesContainer.removeAll(true);
        }

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

        state.structures.forEach((structure) => {
          console.log("Structure:", structure);
          if (
            mapData &&
            mapData[structure.y] &&
            mapData[structure.y][structure.x]
          ) {
            const playerIndex = state.players.findIndex(
              (p) => p._id === structure.playerId
            );

            const player = state.players.find(
              (p) => p._id === structure.playerId
            );

            // Use player's selected color if available, fall back to index-based color if not
            const color =
              player && player.color
                ? player.color.value
                : scene.playerColors[playerIndex % scene.playerColors.length];

            // Calculate hex center coordinates
            const centerX =
              structure.x * (hexWidth * 0.75) + hexRadius + offsetX;
            const centerY =
              structure.y * hexHeight +
              (structure.x % 2 ? hexHeight / 2 : 0) +
              hexHeight / 2 +
              offsetY;

            // Draw structure hex - solid color
            const points = hexagonPoints.map((p) => ({
              x: p.x + centerX,
              y: p.y + centerY,
            }));

            scene.cityGraphics.fillStyle(color, 1);
            scene.cityGraphics.lineStyle(1, 0x555555, 0.8);
            scene.cityGraphics.beginPath();
            scene.cityGraphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
              scene.cityGraphics.lineTo(points[i].x, points[i].y);
            }
            scene.cityGraphics.closePath();
            scene.cityGraphics.fillPath();
            scene.cityGraphics.strokePath();

            // Format the image name based on structure type
            console.log(structure);
            const formattedType = formatImageName(structure.structure.name);
            const imageKey = `structure_${formattedType}`;
            const imagePath = `/images/structure/${formattedType}.png`;

            // Check if the image is already loaded or load it
            loadImageIfNeeded(scene, imageKey, imagePath).then((success) => {
              if (success) {
                // Create and add the structure image
                const structureImage = scene.add.image(
                  centerX,
                  centerY,
                  imageKey
                );

                // Scale the image to fit within the hex
                const scale =
                  (hexRadius * 1) /
                  Math.max(structureImage.width, structureImage.height);
                structureImage.setScale(scale);

                // Add to container for easy cleanup
                //scene.structureImagesContainer.add(structureImage);
              }
              // No fallback drawing for structures as they don't have a default representation
            });
          }
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
            scene.cityGraphics.lineStyle(2, 0x8888dd, 0.8);
            scene.cityGraphics.beginPath();
            scene.cityGraphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
              scene.cityGraphics.lineTo(points[i].x, points[i].y);
            }
            scene.cityGraphics.closePath();
            scene.cityGraphics.fillPath();
            scene.cityGraphics.strokePath();

            // Format the image name based on city type
            const formattedType = formatImageName(city.type);
            const imageKey = `city_${formattedType}`;
            const imagePath = `/images/structure/${formattedType}.png`;

            // Check if the image is already loaded or load it
            loadImageIfNeeded(scene, imageKey, imagePath).then((success) => {
              if (success) {
                // Create and add the city image
                const cityImage = scene.add.image(centerX, centerY, imageKey);

                // Scale the image to fit within the hex
                const scale =
                  (hexRadius * 1.5) /
                  Math.max(cityImage.width, cityImage.height);
                cityImage.setScale(scale);

                // Add to container for easy cleanup
                //scene.cityImagesContainer.add(cityImage);

                // Add level indicator if greater than 1
                if (city.level > 1) {
                  const levelText = scene.add.text(
                    centerX,
                    centerY + hexRadius * 0.5,
                    city.level.toString(),
                    {
                      font: "14px Arial",
                      fill: "#FFFFFF",
                      stroke: "#000000",
                      strokeThickness: 3,
                    }
                  );
                  levelText.setOrigin(0.5);
                  scene.cityImagesContainer.add(levelText);
                }
              }
            });
          }
        });

        // Draw adjacency lines after cities are rendered
        renderAdjacencyLines(scene);
      }
    }
  }, [
    state.turnStep,
    state.placingCity,
    state.placingStructure,
    state.cities,
    state.territories,
    state.currentPlayerId,
    mapData,
    state.lastUpdate,
  ]);

  useEffect(() => {
    if (state.cityBuilt) {
      // Ensure the city placement mode is turned off
      dispatch({ type: "SET_PLACING_CITY", payload: false });
      // Reset the cursor
      document.body.style.cursor = "default";
      // Optionally, hide the highlighter if your Phaser scene is available:
      if (gameRef.current && gameRef.current.scene.scenes.length > 0) {
        const scene = gameRef.current.scene.scenes[0];
        scene.highlighter.hideHighlight();
      }
    }
  }, [state.cityBuilt, dispatch]);

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
