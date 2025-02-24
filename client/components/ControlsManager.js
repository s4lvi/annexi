export default class ControlsManager {
  constructor(scene, onMapClick) {
    this.scene = scene;
    this.onMapClick = onMapClick;
    this.isPanning = false;
    this.previousDistance = null; // Used for pinch zoom
    // Bind methods
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  register() {
    const scene = this.scene;
    // Retrieve map configuration (omitted here for brevity)
    const hexRadius = 20;
    const hexWidth = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const totalCols = scene.registry.get("mapCols");
    const totalRows = scene.registry.get("mapRows");
    const offsetX = scene.registry.get("offsetX");
    const offsetY = scene.registry.get("offsetY");
    // Calculate and store map bounds if needed
    scene.mapWidth = totalCols * (hexWidth * 0.75) + hexRadius + offsetX * 2;
    scene.mapHeight = totalRows * hexHeight + hexHeight / 2 + offsetY * 2;

    scene.input.mouse.disableContextMenu();

    // Register pointer events
    scene.input.on("pointerdown", this.handlePointerDown, this);
    scene.input.on("pointermove", this.handlePointerMove, this);
    scene.input.on("pointerup", this.handlePointerUp, this);
    scene.input.on("wheel", this.handleWheel, this);

    // If touch events are available, add dedicated listeners on the canvas.
    if ("ontouchstart" in window) {
      scene.input.manager.canvas.addEventListener(
        "touchstart",
        this.handleTouchStart,
        { passive: false }
      );
      scene.input.manager.canvas.addEventListener(
        "touchmove",
        this.handleTouchMove,
        { passive: false }
      );
      scene.input.manager.canvas.addEventListener(
        "touchend",
        this.handleTouchEnd,
        { passive: false }
      );
    }
  }

  /* === Common Helpers === */

  // Returns an array of active pointers from Phaser's pointer manager.
  getActivePointers() {
    return this.scene.input.manager.pointers.filter((p) => p.isDown);
  }

  // Given an array of two or more pointers (or touch objects), process pinch zoom.
  // Returns true if pinch zoom logic was applied.
  processPinchZoom(activePoints) {
    if (activePoints.length < 2) {
      this.previousDistance = null;
      return false;
    }
    const [p1, p2] = activePoints;
    const currentDistance =
      Phaser.Math.Distance.Between(p1.x, p1.y, p2.y, p2.x) ||
      Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    // Alternatively, if using plain objects ensure you have x and y.
    if (this.previousDistance !== null) {
      const distanceDelta = currentDistance - this.previousDistance;
      const zoomFactor = 0.005; // Adjust sensitivity as needed
      let newZoom = this.scene.cameras.main.zoom + distanceDelta * zoomFactor;
      newZoom = Phaser.Math.Clamp(newZoom, 0.5, 2);
      this.scene.cameras.main.setZoom(newZoom);
    }
    this.previousDistance = currentDistance;
    return true;
  }

  /* === Pointer Event Handlers === */

  handlePointerDown(pointer) {
    // Skip if this pointer event originates from a touch
    if (pointer.pointerType === "touch") return;
    const element = document.elementFromPoint(pointer.x, pointer.y);
    if (
      element &&
      element.tagName.toLowerCase() !== "canvas" &&
      !element.closest("#phaser-game")
    ) {
      console.log("UI element clicked:", element);
      return;
    }
    if (this.onMapClick) {
      const tile = this.getTileAt(pointer.x, pointer.y);
      this.onMapClick(tile);
    }
    if (pointer.rightButtonDown()) {
      const tile = this.getTileAt(pointer.x, pointer.y);
      console.log("Right-click at", pointer.x, pointer.y, tile);
      return;
    }
    // Start panning only if no multi-touch is active.
    if (this.getActivePointers().length < 2) {
      this.startPan(pointer);
    }
  }

  handlePointerMove(pointer) {
    // Skip if from touch (handled in touch events)
    if (pointer.pointerType === "touch") return;
    const activePointers = this.getActivePointers();
    if (activePointers.length >= 2) {
      if (this.processPinchZoom(activePointers)) {
        return;
      }
    } else {
      this.previousDistance = null;
    }
    if (this.isPanning) {
      this.updatePan(pointer);
    }
  }

  handlePointerUp(pointer) {
    // Skip if from touch
    if (pointer.pointerType === "touch") return;
    if (this.isPanning) {
      this.endPan();
    }
    this.previousDistance = null;
  }

  handleWheel(pointer, currentlyOver, dx, dy, dz, event) {
    const camera = this.scene.cameras.main;
    let newZoom = camera.zoom - dy * 0.001;
    newZoom = Phaser.Math.Clamp(newZoom, 0.5, 2);
    camera.setZoom(newZoom);
  }

  /* === Touch Event Handlers for Mobile Devices === */

  handleTouchStart(event) {
    event.preventDefault();
    // We let Phaser update its pointer list and use our common methods below.
    // Optionally, you can add logging here.
  }

  handleTouchMove(event) {
    event.preventDefault();
    // Create an array of touch-like objects from event.touches.
    const touches = Array.from(event.touches).map((touch) => ({
      x: touch.clientX,
      y: touch.clientY,
      pointerType: "touch",
    }));
    // Process pinch zoom if more than one touch is active.
    if (touches.length >= 2) {
      if (this.processPinchZoom(touches)) {
        return;
      }
    } else {
      this.previousDistance = null;
    }
    // If only one touch is active, treat it as panning.
    if (touches.length === 1) {
      if (!this.isPanning) {
        this.startPan(touches[0]);
      } else {
        this.updatePan(touches[0]);
      }
    }
  }

  handleTouchEnd(event) {
    event.preventDefault();
    // Reset pinch zoom state if fewer than two touches remain.
    if (event.touches.length < 2) {
      this.previousDistance = null;
    }
    // End panning if no touches remain.
    if (event.touches.length === 0 && this.isPanning) {
      this.endPan();
    }
  }

  /* === Panning Logic === */

  startPan(point) {
    this.isPanning = true;
    this.panStartX = point.x;
    this.panStartY = point.y;
    this.cameraStartX = this.scene.cameras.main.scrollX;
    this.cameraStartY = this.scene.cameras.main.scrollY;
  }

  updatePan(point) {
    const dx = point.x - this.panStartX;
    const dy = point.y - this.panStartY;
    const newX = this.cameraStartX - dx / this.scene.cameras.main.zoom;
    const newY = this.cameraStartY - dy / this.scene.cameras.main.zoom;
    this.scene.cameras.main.scrollX = newX;
    this.scene.cameras.main.scrollY = newY;
  }

  endPan() {
    this.isPanning = false;
  }

  /* === Utility: Get Tile At Screen Coordinates === */

  getTileAt(screenX, screenY) {
    const camera = this.scene.cameras.main;
    const worldPoint = camera.getWorldPoint(screenX, screenY);
    const worldX = worldPoint.x;
    const worldY = worldPoint.y;
    const offsetX = this.scene.registry.get("offsetX") || 0;
    const offsetY = this.scene.registry.get("offsetY") || 0;
    const hexRadius = 20;
    const hexWidth = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const effectiveX = worldX - offsetX;
    const effectiveY = worldY - offsetY;
    const approxCol = Math.round((effectiveX - hexRadius) / (hexWidth * 0.75));
    const offsetYForCol = approxCol % 2 ? hexHeight / 2 : 0;
    const approxRow = Math.round(
      (effectiveY - hexHeight / 2 - offsetYForCol) / hexHeight
    );
    const mapData = this.scene.registry.get("mapData");
    let tile = { col: approxCol, row: approxRow, type: "unknown" };
    if (mapData && mapData[approxRow] && mapData[approxRow][approxCol]) {
      tile = { ...tile, ...mapData[approxRow][approxCol] };
    }
    return tile;
  }
}
