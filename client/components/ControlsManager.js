export default class ControlsManager {
  constructor(scene, onMapClick) {
    this.scene = scene;
    this.onMapClick = onMapClick;
    this.isPanning = false;
    this.isMiddleButtonPanning = false;
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

    // Add global event listeners for middle mouse button to ensure it's always captured
    // This is important because middle mouse clicks might not always reach the canvas
    window.addEventListener("mousedown", this.onGlobalMouseDown.bind(this));
    window.addEventListener("mousemove", this.onGlobalMouseMove.bind(this));
    window.addEventListener("mouseup", this.onGlobalMouseUp.bind(this));
  }

  onGlobalMouseDown(e) {
    if (e.button === 1) {
      // Middle button
      this.isMiddleButtonPanning = true;
      document.body.style.cursor = "grabbing";

      // Capture panning start position
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.cameraStartX = this.scene.cameras.main.scrollX;
      this.cameraStartY = this.scene.cameras.main.scrollY;

      // Prevent default middle-click scrolling behavior
      e.preventDefault();
    }
  }

  onGlobalMouseMove(e) {
    if (this.isMiddleButtonPanning) {
      const dx = e.clientX - this.panStartX;
      const dy = e.clientY - this.panStartY;
      const newX = this.cameraStartX - dx / this.scene.cameras.main.zoom;
      const newY = this.cameraStartY - dy / this.scene.cameras.main.zoom;
      this.scene.cameras.main.scrollX = newX;
      this.scene.cameras.main.scrollY = newY;

      // Prevent default
      e.preventDefault();
    }
  }

  onGlobalMouseUp(e) {
    if (e.button === 1) {
      this.isMiddleButtonPanning = false;

      // Reset cursor based on current game state
      const gameState = this.scene.registry.get("gameState");
      if (gameState?.placingCity || gameState?.placingStructure) {
        document.body.style.cursor = "crosshair";
      } else {
        document.body.style.cursor = "default";
      }
    }
  }

  onPointerDown(pointer) {
    // If middle mouse is active globally, don't process further
    if (this.isMiddleButtonPanning) return;

    // Check if the click is on a UI element
    const element = document.elementFromPoint(pointer.x, pointer.y);
    if (
      element &&
      element.tagName.toLowerCase() !== "canvas" &&
      !element.closest("#phaser-game")
    ) {
      return; // Let the UI handle this event
    }

    // Handle left click for map interaction
    if (pointer.leftButtonDown() && this.onMapClick) {
      const tile = this.getTileAt(pointer.x, pointer.y);
      this.onMapClick(tile);
    }

    // Capture right-click events for any additional functionality
    if (pointer.rightButtonDown()) {
      const tile = this.getTileAt(pointer.x, pointer.y);
      console.log("Right-click at", pointer.x, pointer.y, tile);
      return;
    }

    // Start panning with left button if not multi-touch
    if (pointer.leftButtonDown() && !this.isMultiTouchActive()) {
      this.startPan(pointer);
    }
  }

  onPointerMove(pointer) {
    // If middle mouse is active globally, don't process further
    if (this.isMiddleButtonPanning) return;

    // Check for multi-touch (pinch zoom)
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
        const zoomFactor = 0.005;
        let newZoom = this.scene.cameras.main.zoom + distanceDelta * zoomFactor;
        newZoom = Phaser.Math.Clamp(newZoom, 0.5, 2);
        this.scene.cameras.main.setZoom(newZoom);
      }
      this.previousDistance = currentDistance;
      return;
    } else {
      this.previousDistance = null;
    }

    // Process normal panning if active
    if (this.isPanning) {
      this.updatePan(pointer);
    }
  }

  onPointerUp(pointer) {
    // Reset pinch zoom tracking
    const activePointers = this.scene.input.manager.pointers.filter(
      (p) => p.isDown
    );
    if (activePointers.length < 2) {
      this.previousDistance = null;
    }

    // End left-button panning if active
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

    // Retrieve offsets from the registry
    const offsetX = this.scene.registry.get("offsetX") || 0;
    const offsetY = this.scene.registry.get("offsetY") || 0;
    const hexRadius = 20;
    const hexWidth = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;

    const effectiveX = worldX - offsetX;
    const effectiveY = worldY - offsetY;

    // Compute grid coordinates
    const approxCol = Math.round((effectiveX - hexRadius) / (hexWidth * 0.75));
    const offsetYForCol = approxCol % 2 ? hexHeight / 2 : 0;
    const approxRow = Math.round(
      (effectiveY - hexHeight / 2 - offsetYForCol) / hexHeight
    );

    // Get map data
    const mapData = this.scene.registry.get("mapData");
    let tile = { col: approxCol, row: approxRow, type: "unknown" };
    if (mapData && mapData[approxRow] && mapData[approxRow][approxCol]) {
      tile = { ...tile, ...mapData[approxRow][approxCol] };
    }
    return tile;
  }
}
