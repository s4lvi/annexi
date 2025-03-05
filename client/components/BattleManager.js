// BattleManager: handles buffering battle updates, animations, and visual effects.
class BattleManager {
  constructor(scene, dispatch) {
    this.scene = scene;
    this.dispatch = dispatch; // React dispatch from gameState
    this.units = {};
    this.healthBars = {};
    this.projectiles = {};
    this.updateBuffer = [];
    this.lastBufferProcessTime = scene.time.now;
    this.updateInterval = 100;
    this.maxRenderTime = 5000; // ms
    this.renderFinishStartTime = null;
    this.processedUnitIds = new Set(); // Track which units we've already processed
    this.processedTowerEvents = new Set(); // Track processed tower events

    // Load default animations if not already loaded
    this.loadDefaultAnimations();
  }

  loadDefaultAnimations() {
    // Create default animations if they don't exist
    if (!this.scene.textures.exists("default_unit")) {
      // Create a default unit texture
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0x0000ff, 1);
      graphics.fillCircle(16, 16, 16);
      graphics.lineStyle(2, 0xffffff, 1);
      graphics.strokeCircle(16, 16, 16);
      graphics.generateTexture("default_unit", 32, 32);
      graphics.destroy();
    }

    if (!this.scene.textures.exists("projectile")) {
      // Create a default projectile texture
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffff00, 1);
      graphics.fillCircle(8, 8, 8);
      graphics.generateTexture("projectile", 16, 16);
      graphics.destroy();
    }
  }

  loadUnitAnimations(unitData) {
    const cardId = unitData.cardId;
    const cardData = this.scene.registry.get("cardsData") || {};
    const unitCard = cardData[cardId] || {};
    const animations = unitCard.animations || {};

    // Load animation frames if they exist
    if (animations.move && animations.move.length > 0) {
      if (!this.scene.textures.exists(`${cardId}_move`)) {
        animations.move.forEach((framePath, index) => {
          this.scene.load.image(`${cardId}_move_${index}`, framePath);
        });
      }
    }

    if (animations.attack && animations.attack.length > 0) {
      if (!this.scene.textures.exists(`${cardId}_attack`)) {
        animations.attack.forEach((framePath, index) => {
          this.scene.load.image(`${cardId}_attack_${index}`, framePath);
        });
      }
    }

    if (animations.death && animations.death.length > 0) {
      if (!this.scene.textures.exists(`${cardId}_death`)) {
        animations.death.forEach((framePath, index) => {
          this.scene.load.image(`${cardId}_death_${index}`, framePath);
        });
      }
    }

    // Start loading if any images were added
    if (this.scene.load.list.size > 0) {
      this.scene.load.start();
    }

    return new Promise((resolve) => {
      if (this.scene.load.list.size > 0) {
        this.scene.load.once("complete", resolve);
      } else {
        resolve();
      }
    });
  }

  convertTileToSceneCoordinates(tilePosition) {
    const hexWidth = this.scene.registry.get("hexWidth") || 0;
    const hexHeight = this.scene.registry.get("hexHeight") || 0;
    const hexRadius = this.scene.registry.get("hexRadius") || 0;
    const offsetX = this.scene.registry.get("offsetX") || 0;
    const offsetY = this.scene.registry.get("offsetY") || 0;
    const x = tilePosition.x * (hexWidth * 0.75) + hexRadius + offsetX;
    const y =
      tilePosition.y * hexHeight +
      (tilePosition.x % 2 ? hexHeight / 2 : 0) +
      hexHeight / 2 +
      offsetY;
    return { x, y };
  }

  createHealthBar(x, y, width, height, entity) {
    const healthBarBg = this.scene.add.rectangle(
      x,
      y,
      width,
      height,
      0x000000,
      0.7
    );
    const healthBarFill = this.scene.add.rectangle(
      x,
      y,
      width,
      height,
      0x00ff00,
      1
    );
    healthBarFill.setOrigin(0, 0.5);
    healthBarFill.x = x - width / 2;

    const healthBarContainer = {
      bg: healthBarBg,
      fill: healthBarFill,
      entity: entity,
    };
    return healthBarContainer;
  }

  updateHealthBar(healthBar, currentHealth, maxHealth) {
    if (!healthBar || !healthBar.fill) return;

    const width = healthBar.bg.width;
    const healthPercentage = Math.max(
      0,
      Math.min(1, currentHealth / maxHealth)
    );
    healthBar.fill.width = width * healthPercentage;

    // Change color based on health percentage
    if (healthPercentage > 0.6) {
      healthBar.fill.fillColor = 0x00ff00; // Green
    } else if (healthPercentage > 0.3) {
      healthBar.fill.fillColor = 0xffff00; // Yellow
    } else {
      healthBar.fill.fillColor = 0xff0000; // Red
    }
  }

  async createBattleUnit(unitData, position) {
    // Wait for animations to load
    await this.loadUnitAnimations(unitData);

    const cardId = unitData.cardId;
    const cardData = this.scene.registry.get("cardsData") || {};
    const unitCard = cardData[cardId] || {};

    let sprite;
    if (
      unitCard.animations &&
      unitCard.animations.move &&
      unitCard.animations.move.length > 0
    ) {
      // Create sprite with animations
      sprite = this.scene.add.sprite(
        position.x,
        position.y,
        `${cardId}_move_0`
      );

      // Set up animations
      if (!this.scene.anims.exists(`${cardId}_move`)) {
        this.scene.anims.create({
          key: `${cardId}_move`,
          frames: unitCard.animations.move.map((_, i) => ({
            key: `${cardId}_move_${i}`,
          })),
          frameRate: 8,
          repeat: -1,
        });
      }

      if (
        unitCard.animations.attack &&
        unitCard.animations.attack.length > 0 &&
        !this.scene.anims.exists(`${cardId}_attack`)
      ) {
        this.scene.anims.create({
          key: `${cardId}_attack`,
          frames: unitCard.animations.attack.map((_, i) => ({
            key: `${cardId}_attack_${i}`,
          })),
          frameRate: 10,
          repeat: 0,
        });
      }

      if (
        unitCard.animations.death &&
        unitCard.animations.death.length > 0 &&
        !this.scene.anims.exists(`${cardId}_death`)
      ) {
        this.scene.anims.create({
          key: `${cardId}_death`,
          frames: unitCard.animations.death.map((_, i) => ({
            key: `${cardId}_death_${i}`,
          })),
          frameRate: 10,
          repeat: 0,
        });
      }

      // Start the move animation
      sprite.play(`${cardId}_move`);
    } else {
      // Use default unit texture
      sprite = this.scene.add.sprite(position.x, position.y, "default_unit");
    }

    // Scale the sprite to fit within a hex tile
    const hexRadius = this.scene.registry.get("hexRadius") || 32;
    const scale = (hexRadius * 0.7) / Math.max(sprite.width, sprite.height);
    sprite.setScale(scale);

    // Add health bar
    const healthBar = this.createHealthBar(
      position.x,
      position.y - sprite.displayHeight / 2 - 10,
      40,
      6,
      { id: unitData.unitId, type: "unit" }
    );

    this.healthBars[unitData.unitId] = healthBar;
    this.updateHealthBar(healthBar, unitData.health, unitData.maxHealth || 100);

    return {
      sprite,
      healthBar,
      currentPos: { ...position },
      targetPos: { ...position },
      interpProgress: 0,
      interpDuration: this.updateInterval,
      state: "move",
      cardId,
      health: unitData.health,
      maxHealth: unitData.maxHealth || unitData.health,
      isAttacking: unitData.isAttacking || false,
      unitId: unitData.unitId,
    };
  }

  pushUpdate(data) {
    // Handle different parameter formats
    let battleUnits = [];
    let towerEvents = [];

    if (Array.isArray(data)) {
      // If data is an array, assume it's battleUnits
      battleUnits = data;
    } else if (data && typeof data === "object") {
      // If data is an object
      if (data.battleUnits) {
        // New style: passed with battleUnits property
        battleUnits = data.battleUnits;
        towerEvents = data.towerEvents || [];
      } else {
        // Assume the object itself is the battleUnits array
        battleUnits = data;
      }
    }

    if (!battleUnits || battleUnits.length === 0) {
      console.warn("[BattleManager] pushUpdate called with no valid units");
      return;
    }

    console.log(
      `[BattleManager] pushUpdate called with ${
        battleUnits.length
      } unit(s) and ${towerEvents?.length || 0} tower event(s)`
    );

    // Clear processed units set at the start of a new update
    this.processedUnitIds.clear();

    const convertedUnits = battleUnits.map((unitData) => ({
      ...unitData,
      position: this.convertTileToSceneCoordinates(unitData.position),
    }));

    this.updateBuffer.push({
      time: this.scene.time.now,
      units: convertedUnits,
      towerEvents: towerEvents || [],
    });
  }

  async processBuffer() {
    if (this.updateBuffer.length > 0) {
      const update = this.updateBuffer.shift();
      const currentUnitsInUpdate = new Set();

      // Process all units first
      for (const unitData of update.units) {
        currentUnitsInUpdate.add(unitData.unitId);
        let unit = this.units[unitData.unitId];

        if (!unit) {
          // Create new unit
          unit = await this.createBattleUnit(unitData, unitData.position);
          this.units[unitData.unitId] = unit;
        } else {
          // Update existing unit
          unit.currentPos = { x: unit.sprite.x, y: unit.sprite.y };
          unit.targetPos = { ...unitData.position };
          unit.interpProgress = 0;

          // Calculate the distance between current and target positions
          const dx = unit.targetPos.x - unit.currentPos.x;
          const dy = unit.targetPos.y - unit.currentPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Define a constant speed (pixels per second)
          const constantSpeed = 100; // Adjust as needed
          unit.interpDuration = (distance / constantSpeed) * 1000;

          unit.health = unitData.health;

          // Update health bar
          this.updateHealthBar(unit.healthBar, unitData.health, unit.maxHealth);

          // Update animation state if needed
          const previousState = unit.state;
          unit.isAttacking = unitData.isAttacking || false;

          if (unit.isAttacking && previousState !== "attack") {
            unit.state = "attack";
            if (this.scene.anims.exists(`${unit.cardId}_attack`)) {
              unit.sprite.play(`${unit.cardId}_attack`);
            }
          } else if (!unit.isAttacking && previousState !== "move") {
            unit.state = "move";
            if (this.scene.anims.exists(`${unit.cardId}_move`)) {
              unit.sprite.play(`${unit.cardId}_move`);
            }
          }
        }

        // Mark this unit as processed in this update
        this.processedUnitIds.add(unitData.unitId);
      }

      // Then process tower events AFTER all units are updated
      if (update.towerEvents && update.towerEvents.length > 0) {
        for (const event of update.towerEvents) {
          // Generate eventId if not present
          if (!event.eventId) {
            event.eventId = `tower_${event.towerId}_unit_${
              event.unitId
            }_${Date.now()}`;
          }

          if (!this.processedTowerEvents.has(event.eventId)) {
            await this.handleTowerFired(event);
            this.processedTowerEvents.add(event.eventId);
          }
        }
      }

      // Check for units that no longer exist in the latest update
      Object.keys(this.units).forEach((unitId) => {
        if (
          !currentUnitsInUpdate.has(unitId) &&
          this.units[unitId].state !== "death" &&
          !this.units[unitId].removing
        ) {
          // Unit is no longer in the latest update, remove it with death animation
          this.units[unitId].health = 0; // Force health to zero
          this.units[unitId].state = "death";
          this.playDeathAnimation(this.units[unitId]);
        }
      });

      this.lastBufferProcessTime = this.scene.time.now;
    }
  }

  createProjectile(source, target, callback) {
    const projectile = this.scene.add.sprite(source.x, source.y, "projectile");

    // Scale down the projectile
    projectile.setScale(0.5);

    // Create a unique ID for this projectile
    const projectileId = `projectile_${Date.now()}_${Math.random()}`;

    // Add to our projectiles collection
    this.projectiles[projectileId] = {
      sprite: projectile,
      source: source,
      target: target,
      callback: callback,
    };

    // Tween the projectile from source to target
    this.scene.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      duration: 500,
      onComplete: () => {
        // Remove from collection and destroy
        delete this.projectiles[projectileId];
        projectile.destroy();

        // Execute callback if provided
        if (callback && typeof callback === "function") {
          callback();
        }
      },
    });

    // Return the projectile for reference if needed
    return projectile;
  }

  handleTowerFired(event) {
    console.log("[BattleManager] Tower fired event:", event);
    const { x, y, unitId, unitHealth, damage } = event;

    // Find the tower in the structures
    const gameState = this.scene.registry.get("gameState");
    const structures = gameState?.structures || [];

    // Direct ID match

    let tower = structures.find((s) => s.structure && s.x === x && s.y === y);
    const unit = this.units[unitId];

    if (!tower) {
      console.warn(`[BattleManager] Tower not found. Tower: ${event}`);
      console.log("Available structures:", structures);
      return;
    }

    if (!unit) {
      console.warn(`[BattleManager] Unit not found. UnitId: ${unitId}`);
      console.log("Available units:", Object.keys(this.units));
      return;
    }

    // Get tower position
    const towerPos = this.convertTileToSceneCoordinates({
      x: tower.x,
      y: tower.y,
    });

    // Get unit position
    const unitPos = { x: unit.sprite.x, y: unit.sprite.y };

    console.log(
      `[BattleManager] Creating projectile from tower at (${towerPos.x},${towerPos.y}) to unit at (${unitPos.x},${unitPos.y})`
    );

    // Create a projectile from tower to unit
    this.createProjectile(towerPos, unitPos, () => {
      // Update unit health
      unit.health =
        unitHealth !== undefined ? unitHealth : unit.health - (damage || 0);
      this.updateHealthBar(unit.healthBar, unit.health, unit.maxHealth);

      // Add hit effect
      const hitEffect = this.scene.add.sprite(
        unitPos.x,
        unitPos.y,
        "projectile"
      );
      hitEffect.setScale(1);
      hitEffect.setAlpha(0.8);

      // Explosion effect
      this.scene.tweens.add({
        targets: hitEffect,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          hitEffect.destroy();
        },
      });
    });
  }

  playDeathAnimation(unit) {
    if (!unit || unit.removing) return;

    unit.removing = true;

    // Stop current animation
    if (unit.sprite) unit.sprite.stop();

    // Play death animation if available
    if (unit.sprite && this.scene.anims.exists(`${unit.cardId}_death`)) {
      unit.sprite.play(`${unit.cardId}_death`);
      unit.sprite.once("animationcomplete", () => {
        this.removeUnit(unit);
      });
    } else {
      // If no death animation, fade out
      const targets = [];
      if (unit.sprite) targets.push(unit.sprite);
      if (unit.healthBar?.bg) targets.push(unit.healthBar.bg);
      if (unit.healthBar?.fill) targets.push(unit.healthBar.fill);

      if (targets.length > 0) {
        this.scene.tweens.add({
          targets: targets,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            this.removeUnit(unit);
          },
        });
      } else {
        this.removeUnit(unit);
      }
    }
  }

  removeUnit(unit) {
    if (!unit) return;

    // Find the unit ID
    const unitId =
      unit.unitId ||
      Object.keys(this.units).find((id) => this.units[id] === unit);

    // Clean up sprite
    if (unit.sprite) {
      unit.sprite.destroy();
      unit.sprite = null;
    }

    // Clean up health bar
    if (unit.healthBar) {
      if (unit.healthBar.bg) {
        unit.healthBar.bg.destroy();
        unit.healthBar.bg = null;
      }
      if (unit.healthBar.fill) {
        unit.healthBar.fill.destroy();
        unit.healthBar.fill = null;
      }
      unit.healthBar = null;
    }

    // Remove from units collection
    if (unitId && this.units[unitId]) {
      delete this.units[unitId];
    }
  }

  finishBattleRendering() {
    console.log(
      "[BattleManager] Finishing battle rendering. Units count:",
      Object.keys(this.units).length
    );

    // If no units to clean up, dispatch the event immediately
    if (Object.keys(this.units).length === 0) {
      if (this.dispatch) {
        this.dispatch({ type: "SET_BATTLE_RENDERED", payload: true });
        this.renderFinishStartTime = null;
      }
      return;
    }

    // Track units being cleaned up
    let totalUnits = Object.keys(this.units).length;
    let cleanedUnits = 0;

    // Clear all units with a fade-out effect
    Object.entries(this.units).forEach(([unitId, unit]) => {
      // Skip if already being removed
      if (unit.removing) return;
      unit.removing = true;

      const targets = [];
      if (unit.sprite) targets.push(unit.sprite);
      if (unit.healthBar?.bg) targets.push(unit.healthBar.bg);
      if (unit.healthBar?.fill) targets.push(unit.healthBar.fill);

      if (targets.length > 0) {
        this.scene.tweens.add({
          targets: targets,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            // Properly clean up the unit
            if (unit.sprite) unit.sprite.destroy();
            if (unit.healthBar) {
              if (unit.healthBar.bg) unit.healthBar.bg.destroy();
              if (unit.healthBar.fill) unit.healthBar.fill.destroy();
            }

            // Remove from units collection
            delete this.units[unitId];
            cleanedUnits++;

            // If this is the last unit, dispatch the battle rendered event
            if (cleanedUnits >= totalUnits) {
              console.log(
                "[BattleManager] All units cleaned up. Dispatching SET_BATTLE_RENDERED"
              );
              if (this.dispatch) {
                this.dispatch({ type: "SET_BATTLE_RENDERED", payload: true });
                this.renderFinishStartTime = null;
              }
            }
          },
        });
      } else {
        delete this.units[unitId];
        cleanedUnits++;

        if (cleanedUnits >= totalUnits && this.dispatch) {
          this.dispatch({ type: "SET_BATTLE_RENDERED", payload: true });
          this.renderFinishStartTime = null;
        }
      }
    });

    // Clear all projectiles
    Object.values(this.projectiles).forEach((projectile) => {
      if (projectile.sprite) projectile.sprite.destroy();
    });
    this.projectiles = {};
  }

  update(delta) {
    // Process buffered updates
    if (
      this.scene.time.now - this.lastBufferProcessTime >=
      this.updateInterval
    ) {
      this.processBuffer();
    }

    // Interpolate each unit's position
    Object.entries(this.units).forEach(([unitId, unit]) => {
      // Skip if unit is in death animation or being removed
      if (unit.state === "death" || unit.removing) return;

      unit.interpProgress += delta;
      const t = Math.min(unit.interpProgress / unit.interpDuration, 1);

      // Only move if not attacking
      if (!unit.isAttacking) {
        const newX =
          unit.currentPos.x + (unit.targetPos.x - unit.currentPos.x) * t;
        const newY =
          unit.currentPos.y + (unit.targetPos.y - unit.currentPos.y) * t;

        // Update sprite position
        if (unit.sprite) {
          unit.sprite.setPosition(newX, newY);
        }

        // Update health bar position
        if (unit.healthBar && unit.sprite) {
          if (unit.healthBar.bg) {
            unit.healthBar.bg.setPosition(
              newX,
              newY - unit.sprite.displayHeight / 2 - 10
            );
          }
          if (unit.healthBar.fill) {
            unit.healthBar.fill.setPosition(
              newX - (unit.healthBar.bg ? unit.healthBar.bg.width / 2 : 20),
              newY - unit.sprite.displayHeight / 2 - 10
            );
          }
        }
      }

      // Check if unit health is zero or negative
      if (unit.health <= 0 && unit.state !== "death" && !unit.removing) {
        unit.state = "death";
        this.playDeathAnimation(unit);
      }
    });

    // Check for tower fired events in the game state
    const gameState = this.scene.registry.get("gameState");
    // Check if battle is finished
    if (
      gameState &&
      gameState.battleState &&
      gameState.battleState.battleFinished &&
      !gameState.battleState.battleRendered
    ) {
      // Start cleanup timer if not already started
      if (!this.renderFinishStartTime) {
        console.log(
          "[BattleManager] Battle finished detected, starting cleanup timer"
        );
        this.renderFinishStartTime = this.scene.time.now;
      }

      const currentTime = this.scene.time.now;
      const noUnitsLeft = Object.keys(this.units).length === 0;
      const timeElapsed =
        currentTime - this.renderFinishStartTime >= this.maxRenderTime;

      if (noUnitsLeft || timeElapsed) {
        console.log(
          `[BattleManager] Triggering cleanup. Units left: ${
            Object.keys(this.units).length
          }, Time elapsed: ${timeElapsed}`
        );
        this.finishBattleRendering();
      }
    }
  }
}

export default BattleManager;
