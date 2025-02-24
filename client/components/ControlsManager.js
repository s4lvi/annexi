export default class ControlsManager {
  constructor(scene, onMapClick) {
    this.scene = scene;
    this.onMapClick = onMapClick;
    this.isPanning = false;
    this.previousDistance = null; // Track previous distance for pinch zoom
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
    // Still listen for wheel events for desktop zooming
    scene.input.on("wheel", this.onWheel, this);
  }

  onPointerDown(pointer) {
    // Check if the click is on a UI element:
    const element = document.elementFromPoint(pointer.x, pointer.y);
    if (
      element &&
      element.tagName.toLowerCase() !== "canvas" &&
      !element.closest("#phaser-game")
    ) {
      console.log("UI element clicked:", element);
      return; // Let the UI handle this event.
    }

    if (this.onMapClick) {
      const tile = this.getTileAt(pointer.x, pointer.y);
      this.onMapClick(tile);
    }

    // Capture right-click events.
    if (pointer.rightButtonDown()) {
      const tile = this.getTileAt(pointer.x, pointer.y);
      console.log("Right-click at", pointer.x, pointer.y, tile);
      // Add right-click logic here.
      return;
    }

    // Start panning only if not doing a multi-touch gesture.
    if (!this.isMultiTouchActive()) {
      this.startPan(pointer);
    }
  }

  onPointerMove(pointer) {
    // Check for multi-touch (pinch zoom) first
    const activePointers = this.scene.input.manager.pointers.filter(
      (p) => p.isDown
    );
    if (activePointers.length >= 2) {
      const [p1, p2] = activePointers;
      const currentDistance = Phaser.Math.Distance.Between(
        p1.x,
        p1.y,
        p2.x,
        p2.y
      );

      if (this.previousDistance !== null) {
        const distanceDelta = currentDistance - this.previousDistance;
        const zoomFactor = 0.005; // Adjust zoom sensitivity as needed
        let newZoom = this.scene.cameras.main.zoom + distanceDelta * zoomFactor;
        newZoom = Phaser.Math.Clamp(newZoom, 0.5, 2);
        this.scene.cameras.main.setZoom(newZoom);
      }
      this.previousDistance = currentDistance;
      // If pinch zoom is active, don't process panning.
      return;
    } else {
      this.previousDistance = null;
    }

    // If not multi-touch, process panning.
    if (this.isPanning) {
      this.updatePan(pointer);
    }
  }

  onPointerUp(pointer) {
    // Reset pinch zoom tracking when fingers are lifted.
    const activePointers = this.scene.input.manager.pointers.filter(
      (p) => p.isDown
    );
    if (activePointers.length < 2) {
      this.previousDistance = null;
    }
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

  isMultiTouchActive() {
    return (
      this.scene.input.manager.pointers.filter((p) => p.isDown).length >= 2
    );
  }

  getTileAt(screenX, screenY) {
    const camera = this.scene.cameras.main;
    const worldPoint = camera.getWorldPoint(screenX, screenY);
    const worldX = worldPoint.x;
    const worldY = worldPoint.y;

    // Retrieve offsets from the registry.
    const offsetX = this.scene.registry.get("offsetX") || 0;
    const offsetY = this.scene.registry.get("offsetY") || 0;
    const hexRadius = 20;
    const hexWidth = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;

    const effectiveX = worldX - offsetX;
    const effectiveY = worldY - offsetY;

    // Compute grid coordinates.
    const approxCol = Math.round((effectiveX - hexRadius) / (hexWidth * 0.75));
    const offsetYForCol = approxCol % 2 ? hexHeight / 2 : 0;
    const approxRow = Math.round(
      (effectiveY - hexHeight / 2 - offsetYForCol) / hexHeight
    );

    // Retrieve mapData stored in the registry (set it in PhaserGame's create).
    const mapData = this.scene.registry.get("mapData");
    let tile = { col: approxCol, row: approxRow, type: "unknown" };
    if (mapData && mapData[approxRow] && mapData[approxRow][approxCol]) {
      tile = { ...tile, ...mapData[approxRow][approxCol] };
    }
    return tile;
  }
}
