// components/ControlsManager.js
export default class ControlsManager {
  constructor(scene) {
    this.scene = scene;
    this.isPanning = false;
  }

  register() {
    const scene = this.scene;

    const hexRadius = 20;
    const hexWidth = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const totalCols = scene.registry.get("mapCols");
    const totalRows = scene.registry.get("mapRows");
    const offsetX = scene.registry.get("offsetX");
    const offsetY = scene.registry.get("offsetY");

    // Calculate total map dimensions including offsets
    const mapWidth = totalCols * (hexWidth * 0.75) + hexRadius + offsetX * 2;
    const mapHeight = totalRows * hexHeight + hexHeight / 2 + offsetY * 2;
    // Store map bounds in the scene
    this.scene.mapWidth = mapWidth;
    this.scene.mapHeight = mapHeight;

    scene.input.mouse.disableContextMenu();

    // Listen for pointer events
    scene.input.on("pointerdown", this.onPointerDown, this);
    scene.input.on("pointermove", this.onPointerMove, this);
    scene.input.on("pointerup", this.onPointerUp, this);
    // Listen for wheel events for zooming
    scene.input.on("wheel", this.onWheel, this);
  }

  onPointerDown(pointer) {
    // Check if the click is on a UI element:
    // If the clicked element is a canvas, we assume it's the game.
    const element = document.elementFromPoint(pointer.x, pointer.y);
    if (
      element &&
      element.tagName.toLowerCase() !== "canvas" &&
      !element.closest("#phaser-game")
    ) {
      console.log("UI element clicked:", element);
      return; // Let the UI handle this event.
    }

    // Capture right-click events.
    if (pointer.rightButtonDown()) {
      console.log("Right-click at", pointer.x, pointer.y);
      // Add right-click logic here.
      return;
    }

    // Start panning.
    this.startPan(pointer);

    // Hit-test: get map grid coordinates.
    const tile = this.getTileAt(pointer.x, pointer.y);
    if (tile) {
      console.log("Map tile clicked:", tile);
      // Handle tile interaction here.
    } else {
      console.log("Clicked on game canvas but no tile detected.");
    }
  }

  onPointerMove(pointer) {
    if (this.isPanning) {
      this.updatePan(pointer);
    }
  }

  onPointerUp(pointer) {
    if (this.isPanning) {
      this.endPan();
    }
  }

  onWheel(pointer, currentlyOver, dx, dy, dz, event) {
    const camera = this.scene.cameras.main;
    let newZoom = camera.zoom - dy * 0.001;
    newZoom = Phaser.Math.Clamp(newZoom, 0.5, 2);
    camera.setZoom(newZoom);
  }

  startPan(pointer) {
    this.isPanning = true;
    this.panStartX = pointer.x;
    this.panStartY = pointer.y;
    this.cameraStartX = this.scene.cameras.main.scrollX;
    this.cameraStartY = this.scene.cameras.main.scrollY;
  }

  updatePan(pointer) {
    const dx = pointer.x - this.panStartX;
    const dy = pointer.y - this.panStartY;
    const newX = this.cameraStartX - dx / this.scene.cameras.main.zoom;
    const newY = this.cameraStartY - dy / this.scene.cameras.main.zoom;

    this.scene.cameras.main.scrollX = newX;
    this.scene.cameras.main.scrollY = newY;
  }

  endPan() {
    this.isPanning = false;
  }

  getTileAt(screenX, screenY) {
    const camera = this.scene.cameras.main;

    // Convert screen coordinates to world coordinates taking zoom into account
    const worldPoint = camera.getWorldPoint(screenX, screenY);
    const worldX = worldPoint.x;
    const worldY = worldPoint.y;

    // Retrieve the initial offsets from when the map was drawn
    const offsetX = this.scene.registry.get("offsetX") || 0;
    const offsetY = this.scene.registry.get("offsetY") || 0;
    const hexRadius = 20;
    const hexWidth = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;

    // Calculate effective coordinates relative to the map
    const effectiveX = worldX - offsetX;
    const effectiveY = worldY - offsetY;

    // Reverse the drawing math for an even-r flat-topped hex grid
    const approxCol = Math.round((effectiveX - hexRadius) / (hexWidth * 0.75));
    const offsetYForCol = approxCol % 2 ? hexHeight / 2 : 0;
    const approxRow = Math.round(
      (effectiveY - hexHeight / 2 - offsetYForCol) / hexHeight
    );

    return { col: approxCol, row: approxRow };
  }
}
