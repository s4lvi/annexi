// HealthBarsRenderer: handles health bar rendering for cities and structures
class HealthBarsRenderer {
  constructor(scene) {
    this.scene = scene;
    this.healthBars = {};
  }

  createHealthBar(x, y, width, height, entityId, maxHealth, currentHealth) {
    // Remove existing health bar if there is one
    this.removeHealthBar(entityId);

    // Create background (black)
    const healthBarBg = this.scene.add.rectangle(
      x,
      y,
      width,
      height,
      0x000000,
      0.7
    );

    // Create fill (green)
    const healthBarFill = this.scene.add.rectangle(
      x - width / 2, // Start from left side
      y,
      width * (currentHealth / maxHealth), // Scale based on health percentage
      height,
      this.getHealthColor(currentHealth, maxHealth),
      1
    );

    // Set origin to left center
    healthBarFill.setOrigin(0, 0.5);

    // Store the health bar reference
    this.healthBars[entityId] = {
      bg: healthBarBg,
      fill: healthBarFill,
      currentHealth,
      maxHealth,
    };

    return this.healthBars[entityId];
  }

  getHealthColor(current, max) {
    const percentage = current / max;
    if (percentage > 0.6) {
      return 0x00ff00; // Green
    } else if (percentage > 0.3) {
      return 0xffff00; // Yellow
    } else {
      return 0xff0000; // Red
    }
  }

  updateHealthBar(entityId, currentHealth) {
    const healthBar = this.healthBars[entityId];
    if (!healthBar) return;

    const width = healthBar.bg.width;
    const percentage = Math.max(
      0,
      Math.min(1, currentHealth / healthBar.maxHealth)
    );

    // Update width
    healthBar.fill.width = width * percentage;

    // Update color
    healthBar.fill.fillColor = this.getHealthColor(
      currentHealth,
      healthBar.maxHealth
    );

    // Update stored health
    healthBar.currentHealth = currentHealth;
  }

  removeHealthBar(entityId) {
    const healthBar = this.healthBars[entityId];
    if (healthBar) {
      healthBar.bg.destroy();
      healthBar.fill.destroy();
      delete this.healthBars[entityId];
    }
  }

  renderCityHealthBars(cities, getCoordinates) {
    cities.forEach((city) => {
      const coords = getCoordinates(city);
      const entityId = `city_${city.x}_${city.y}`;
      const maxHealth = city.maxHealth || 100;
      const currentHealth = city.health || maxHealth;

      if (!this.healthBars[entityId]) {
        this.createHealthBar(
          coords.x,
          coords.y - 30,
          40,
          5,
          entityId,
          maxHealth,
          currentHealth
        );
      } else {
        // Update position and health
        this.healthBars[entityId].bg.setPosition(coords.x, coords.y - 30);
        this.healthBars[entityId].fill.setPosition(
          coords.x - 20,
          coords.y - 30
        );
        this.updateHealthBar(entityId, currentHealth);
      }
    });
  }

  renderStructureHealthBars(structures, getCoordinates) {
    structures.forEach((structure) => {
      if (!structure.structure || !structure.structure.health) return;

      const coords = getCoordinates(structure);
      const entityId = `structure_${structure.x}_${structure.y}`;
      const maxHealth =
        structure.structure.maxHealth || structure.structure.health;
      const currentHealth = structure.structure.health;

      if (!this.healthBars[entityId]) {
        this.createHealthBar(
          coords.x,
          coords.y - 30,
          40,
          5,
          entityId,
          maxHealth,
          currentHealth
        );
      } else {
        // Update position and health
        this.healthBars[entityId].bg.setPosition(coords.x, coords.y - 30);
        this.healthBars[entityId].fill.setPosition(
          coords.x - 20,
          coords.y - 30
        );
        this.updateHealthBar(entityId, currentHealth);
      }
    });
  }

  clearUnusedHealthBars(entities, prefix) {
    // Create a map of valid entity IDs
    const validIds = {};
    entities.forEach((entity) => {
      validIds[`${prefix}_${entity.x}_${entity.y}`] = true;
    });

    // Remove health bars for entities that no longer exist
    Object.keys(this.healthBars).forEach((id) => {
      if (id.startsWith(prefix) && !validIds[id]) {
        this.removeHealthBar(id);
      }
    });
  }

  clear() {
    Object.keys(this.healthBars).forEach((id) => {
      this.removeHealthBar(id);
    });
  }
}

export default HealthBarsRenderer;
