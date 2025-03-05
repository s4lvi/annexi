"use client";
import React, { useState, useEffect, useRef } from "react";
import ControlsManager from "./ControlsManager";
import { useGameState } from "./gameState";
import HexTileHighlighter from "./HexTileHighlighter";
import BattleManager from "./BattleManager";
import HealthBarsRenderer from "./HealthBarsRenderer";

// Validation functions remain unchanged...
export const validateCityPlacement = (tile, state) => {
  if (tile.type !== "grass") return false;
  const { players, currentPlayerId, territories } = state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);
  if (
    !currentPlayer ||
    !territories[currentPlayerId] ||
    territories[currentPlayerId].length === 0
  ) {
    return true;
  }
  const playerTerritory = territories[currentPlayerId] || [];
  return playerTerritory.some((t) => t.x === tile.x && t.y === tile.y);
};

export const validateStructurePlacement = (tile, state) => {
  if (tile.type !== "grass") return false;
  const { players, currentPlayerId, territories } = state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);
  if (
    !currentPlayer ||
    !territories[currentPlayerId] ||
    territories[currentPlayerId].length === 0
  ) {
    return true;
  }
  const playerTerritory = territories[currentPlayerId] || [];
  return playerTerritory.some((t) => t.x === tile.x && t.y === tile.y);
};

export const getCityAtTile = (tile, cities) => {
  return cities.find((city) => city.x === tile.x && city.y === tile.y);
};

export const validateSourceCity = (tile, state, currentPlayerId) => {
  const city = getCityAtTile(tile, state.cities);
  return city && city.playerId === currentPlayerId;
};

export const validateTargetCity = (tile, state, currentPlayerId) => {
  const city = getCityAtTile(tile, state.cities);
  return city && city.playerId !== currentPlayerId;
};

export default function PhaserGame({
  mapData,
  matchId,
  onMapClick,
  toggleUiVisibility,
  socket,
}) {
  const gameRef = useRef(null);
  const hasInitialized = useRef(false);
  // A ref to store the dynamically imported Phaser instance.
  const PhaserRef = useRef(null);
  const { state, dispatch } = useGameState();

  // Define the helper function at the component level.
  const loadImageIfNeeded = (scene, key, path) => {
    if (!scene.textures.exists(key)) {
      return new Promise((resolve) => {
        scene.load.image(key, path);
        scene.load.once(PhaserRef.current.Loader.Events.COMPLETE, () => {
          resolve(true);
        });
        scene.load.once(PhaserRef.current.Loader.Events.FILE_LOAD_ERROR, () => {
          console.warn(`Failed to load image: ${path}`);
          resolve(false);
        });
        scene.load.start();
      });
    }
    return Promise.resolve(true);
  };

  // A helper function to render adjacency lines between cities.
  function renderAdjacencyLines(scene) {
    const hexRadius = scene.registry.get("hexRadius");
    const offsetX = scene.registry.get("offsetX");
    const offsetY = scene.registry.get("offsetY");
    const hexWidth = scene.registry.get("hexWidth");
    const hexHeight = scene.registry.get("hexHeight");
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

  function createHealthBar(scene, x, y, width, height, healthPercentage) {
    // Create background bar
    const bg = scene.add
      .rectangle(x, y, width, height, 0x000000, 0.4)
      .setOrigin(0.5);
    // Create the fill bar; position it so the left side is fixed
    const fill = scene.add
      .rectangle(
        x - width / 2,
        y,
        width * healthPercentage,
        height,
        0x00ff00,
        1
      )
      .setOrigin(0, 0.5);
    return { bg, fill };
  }

  function updateHealthBar(healthBar, currentHealth, maxHealth) {
    const width = healthBar.bg.width;
    const percentage = Math.max(0, Math.min(1, currentHealth / maxHealth));
    healthBar.fill.width = width * percentage;

    // Optionally change the fill color based on percentage:
    if (percentage > 0.6) {
      healthBar.fill.fillColor = 0x00ff00;
    } else if (percentage > 0.3) {
      healthBar.fill.fillColor = 0xffff00;
    } else {
      healthBar.fill.fillColor = 0xff0000;
    }
  }

  useEffect(() => {
    if (hasInitialized.current) return;
    if (!mapData) return;

    hasInitialized.current = true;
    console.log("Initializing Phaser game ONCE");

    // Dynamically import Phaser so that it only loads on the client.
    import("phaser").then(({ default: Phaser }) => {
      // Save the imported Phaser instance for later use.
      PhaserRef.current = Phaser;

      const hexRadius = 20;
      const hexWidth = 2 * hexRadius;
      const hexHeight = Math.sqrt(3) * hexRadius;
      const totalCols = mapData[0]?.length || 0;
      const totalRows = mapData.length;
      const totalWidth = totalCols * (hexWidth * 0.75) + hexRadius;
      const totalHeight = totalRows * hexHeight + hexHeight / 2;
      const offsetX = (window.innerWidth - totalWidth) / 2;
      const offsetY = (window.innerHeight - totalHeight) / 2;

      const setGameSize = () => {
        const viewportWidth = window.visualViewport
          ? window.visualViewport.width
          : window.innerWidth;
        const viewportHeight = window.visualViewport
          ? window.visualViewport.height
          : window.innerHeight;
        if (gameRef.current) {
          gameRef.current.scale.resize(viewportWidth, viewportHeight);
        }
        return { width: viewportWidth, height: viewportHeight };
      };

      const { width, height } = setGameSize();
      const config = {
        type: Phaser.AUTO,
        width,
        height,
        parent: "phaser-game",
        scene: {
          preload: function () {
            this.load.setBaseURL("");
            // Preload assets as needed.
          },
          create: function () {
            // Set registry values.
            this.registry.set("offsetX", offsetX);
            this.registry.set("offsetY", offsetY);
            this.registry.set("mapCols", mapData[0]?.length || 0);
            this.registry.set("mapRows", mapData.length);
            this.registry.set("mapData", mapData);
            this.registry.set("hexRadius", hexRadius);
            this.registry.set("hexWidth", hexWidth);
            this.registry.set("hexHeight", hexHeight);
            this.registry.set("turnStep", state.turnStep);
            this.registry.set("placingCity", state.placingCity);
            this.registry.set("placingStructure", state.placingStructure);
            this.registry.set("gameState", state);

            this.mapGraphics = this.add.graphics();
            this.territoryGraphics = this.add.graphics();
            this.adjacencyGraphics = this.add.graphics();
            this.cityGraphics = this.add.graphics();
            this.pathGraphics = this.add.graphics();
            this.battleGraphics = this.add.graphics();

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

                this.mapGraphics.fillStyle(
                  colors[tile.type] || colors.grass,
                  1
                );
                this.mapGraphics.beginPath();
                this.mapGraphics.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                  this.mapGraphics.lineTo(points[i].x, points[i].y);
                }
                this.mapGraphics.closePath();
                this.mapGraphics.fillPath();
              }
            }

            const controlsManager = new ControlsManager(
              this,
              onMapClick,
              toggleUiVisibility
            );
            controlsManager.register();

            // Update highlight on pointer move.
            this.input.on("pointermove", (pointer) => {
              const tile = controlsManager.getTileAt(pointer.x, pointer.y);
              const currentState = this.registry.get("gameState");
              const turnStep = this.registry.get("turnStep");
              const placingCity = this.registry.get("placingCity");
              const placingStructure = this.registry.get("placingStructure");
              const activeTargetSelection = currentState.targetSelectionActive;

              if (turnStep === 0 && placingCity) {
                const isValid = validateCityPlacement(tile, currentState);
                highlighter.updateHighlight(tile, isValid);
              } else if (turnStep === 3 && placingStructure) {
                const isValid = validateStructurePlacement(tile, currentState);
                highlighter.updateHighlight(tile, isValid);
              } else if (turnStep === 5 && activeTargetSelection) {
                let isValid = false;
                if (activeTargetSelection === "source") {
                  isValid = validateSourceCity(
                    tile,
                    currentState,
                    currentState.currentPlayerId
                  );
                } else if (activeTargetSelection === "target") {
                  isValid = validateSourceCity(
                    tile,
                    currentState,
                    currentState.currentPlayerId
                  );
                }
                this.highlighter.updateHighlight(tile, isValid);
              } else {
                highlighter.hideHighlight();
              }
            });

            this.battleManager = new BattleManager(this, dispatch);

            // Register socket listener for battle updates if in battle phase.
            // We assume the socket was passed in as a prop and is attached to the window for accessibility.
            if (socket && typeof socket.on === "function") {
              socket.on("battleUpdate", (data) => {
                console.log("Received battle update in [PHASERGAME]:", data);
                if (data && data.battleUnits && this.battleManager) {
                  this.battleManager.pushUpdate(data);
                }
              });
            }
          },
          update: function (time, delta) {
            if (this.battleManager) {
              this.battleManager.update(delta);
            }
          },
        },
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      const handleResize = () => {
        setGameSize();
      };

      window.addEventListener("resize", handleResize);
      window.visualViewport?.addEventListener("resize", handleResize);
      window.visualViewport?.addEventListener("scroll", handleResize);
      window.addEventListener("orientationchange", () => {
        setTimeout(handleResize, 100);
      });

      // Cleanup event listeners on unmount.
      return () => {
        window.removeEventListener("resize", handleResize);
        window.visualViewport?.removeEventListener("resize", handleResize);
        window.visualViewport?.removeEventListener("scroll", handleResize);
        window.removeEventListener("orientationchange", handleResize);
      };
    });
  }, [
    mapData,
    matchId,
    onMapClick,
    toggleUiVisibility,
    state.turnStep,
    state.placingCity,
    state.placingStructure,
    state.targetSelectionActive,
  ]);

  // Update Phaser scene with game state changes (cities, territories, structures, etc.)
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

      scene.pathGraphics.clear();
      if (scene.cityGraphics && scene.territoryGraphics) {
        scene.cityGraphics.clear();
        scene.territoryGraphics.clear();

        const hexRadius = scene.registry.get("hexRadius");
        const hexWidth = scene.registry.get("hexWidth");
        const hexHeight = scene.registry.get("hexHeight");
        const hexagonPoints = scene.registry.get("hexagonPoints");
        const offsetX = scene.registry.get("offsetX");
        const offsetY = scene.registry.get("offsetY");

        const territories = state.territories;
        Object.keys(territories).forEach((playerId, playerIndex) => {
          const player = state.players.find((p) => p._id === playerId);
          const color =
            player && player.color
              ? player.color.value
              : scene.playerColors[playerIndex % scene.playerColors.length];
          const alpha = 0.6;

          territories[playerId].forEach((territory) => {
            if (
              mapData &&
              mapData[territory.y] &&
              mapData[territory.y][territory.x]
            ) {
              const tile = mapData[territory.y][territory.x];
              const centerX =
                territory.x * (hexWidth * 0.75) + hexRadius + offsetX;
              const centerY =
                territory.y * hexHeight +
                (territory.x % 2 ? hexHeight / 2 : 0) +
                hexHeight / 2 +
                offsetY;
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

              scene.territoryGraphics.lineStyle(1, color, 0.8);
              scene.territoryGraphics.strokePath();
            }
          });
        });

        state.structures.forEach((structure) => {
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
            const color =
              player && player.color
                ? player.color.value
                : scene.playerColors[playerIndex % scene.playerColors.length];
            const centerX =
              structure.x * (hexWidth * 0.75) + hexRadius + offsetX;
            const centerY =
              structure.y * hexHeight +
              (structure.x % 2 ? hexHeight / 2 : 0) +
              hexHeight / 2 +
              offsetY;
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

            const formattedType = structure.structure.name
              ? structure.structure.name.toLowerCase().replace(/\s+/g, "_")
              : "default";
            const imageKey = `structure_${formattedType}`;
            const imagePath = `/images/structure/${formattedType}.png`;

            loadImageIfNeeded(scene, imageKey, imagePath).then((success) => {
              if (success) {
                const structureImage = scene.add.image(
                  centerX,
                  centerY,
                  imageKey
                );
                const scale =
                  (hexRadius * 1) /
                  Math.max(structureImage.width, structureImage.height);
                structureImage.setScale(scale);
              }
            });

            const healthPercentage = structure.health / structure.health;

            // Render the health bar above the city (e.g., 10 pixels above)
            const healthBar = createHealthBar(
              scene,
              centerX,
              centerY - hexRadius - 10,
              40,
              6,
              healthPercentage
            );
          }
        });

        state.cities.forEach((city) => {
          if (mapData && mapData[city.y] && mapData[city.y][city.x]) {
            let playerIndex = 0;
            Object.keys(state.territories).forEach((pid, idx) => {
              if (pid === city.playerId) playerIndex = idx;
            });

            const player = state.players.find((p) => p._id === city.playerId);
            const color =
              player && player.color
                ? player.color.value
                : scene.playerColors[playerIndex % scene.playerColors.length];
            const centerX = city.x * (hexWidth * 0.75) + hexRadius + offsetX;
            const centerY =
              city.y * hexHeight +
              (city.x % 2 ? hexHeight / 2 : 0) +
              hexHeight / 2 +
              offsetY;
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

            const formattedType = city.type
              ? city.type.toLowerCase().replace(/\s+/g, "_")
              : "default";
            const imageKey = `city_${formattedType}`;
            const imagePath = `/images/structure/${formattedType}.png`;

            loadImageIfNeeded(scene, imageKey, imagePath).then((success) => {
              if (success) {
                const cityImage = scene.add.image(centerX, centerY, imageKey);
                const scale =
                  (hexRadius * 1.5) /
                  Math.max(cityImage.width, cityImage.height);
                cityImage.setScale(scale);
              }
            });

            if (
              state.sourceCity &&
              city.x === state.sourceCity.x &&
              city.y === state.sourceCity.y
            ) {
              // For source, draw a green outline
              scene.cityGraphics.lineStyle(4, 0x00ff00, 1);
              scene.cityGraphics.strokeCircle(centerX, centerY, hexRadius);
            }
            if (
              state.targetCity &&
              city.x === state.targetCity.x &&
              city.y === state.targetCity.y
            ) {
              // For target, draw a red outline
              scene.cityGraphics.lineStyle(4, 0xff0000, 1);
              scene.cityGraphics.strokeCircle(centerX, centerY, hexRadius);
            }

            const healthPercentage = city.health / city.health;

            // Render the health bar above the city (e.g., 10 pixels above)
            const healthBar = createHealthBar(
              scene,
              centerX,
              centerY - hexRadius - 10,
              40,
              6,
              healthPercentage
            );
          }
        });

        renderAdjacencyLines(scene);

        if (state.attackPath && state.attackPath.length > 0) {
          console.log("Rendering attackPath:", state.attackPath);
          const { attackPath } = state;
          const hexRadius = scene.registry.get("hexRadius");
          const offsetX = scene.registry.get("offsetX");
          const offsetY = scene.registry.get("offsetY");
          const hexWidth = scene.registry.get("hexWidth");
          const hexHeight = scene.registry.get("hexHeight");

          scene.pathGraphics.lineStyle(3, 0xffaa00, 1);
          scene.pathGraphics.beginPath();

          attackPath.forEach((tile, index) => {
            // You may compute the center of the tile using your mapData stored earlier.
            // For example, if you stored tile.centerX and tile.centerY when rendering map:
            let centerX, centerY;
            if (scene.registry.get("mapData")) {
              const mapData = scene.registry.get("mapData");
              if (mapData[tile.y] && mapData[tile.y][tile.x]) {
                centerX = mapData[tile.y][tile.x].centerX;
                centerY = mapData[tile.y][tile.x].centerY;
              }
            }
            // Alternatively, compute using the same logic as when drawing cities.
            if (centerX === undefined || centerY === undefined) {
              centerX = tile.x * (hexWidth * 0.75) + hexRadius + offsetX;
              centerY =
                tile.y * hexHeight +
                (tile.x % 2 ? hexHeight / 2 : 0) +
                hexHeight / 2 +
                offsetY;
            }
            if (index === 0) {
              scene.pathGraphics.moveTo(centerX, centerY);
            } else {
              scene.pathGraphics.lineTo(centerX, centerY);
            }
          });
          scene.pathGraphics.strokePath();
        }
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
    state.targetSelectionActive,
    state.attackPath,
    state.sourceCity,
    state.targetCity,
    state.battleState,
  ]);

  useEffect(() => {
    if (state.cityBuilt) {
      // Ensure city placement mode is turned off.
      dispatch({ type: "SET_PLACING_CITY", payload: false });
      document.body.style.cursor = "default";
      if (gameRef.current && gameRef.current.scene.scenes.length > 0) {
        const scene = gameRef.current.scene.scenes[0];
        scene.highlighter.hideHighlight();
      }
    }
  }, [state.cityBuilt, dispatch]);

  useEffect(() => {
    // Prevent document body scrolling.
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.touchAction = "none";

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.touchAction = "";
    };
  }, []);

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
