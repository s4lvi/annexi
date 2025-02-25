// server/utils/mapGenerator.js
const noise = {
  // Permutation table
  p: new Array(512),

  // Initialize the permutation table
  seed: function () {
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
    }

    // Duplicate the permutation table
    for (let i = 0; i < 256; i++) {
      this.p[256 + i] = this.p[i];
    }
  },

  // Fade function for smoother interpolation
  fade: function (t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  },

  // Linear interpolation
  lerp: function (t, a, b) {
    return a + t * (b - a);
  },

  // Gradient function
  grad: function (hash, x, y) {
    const h = hash & 15;
    const grad2 = 1 + (h & 7); // Gradients 1-8
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : x;
    return (h & 1 ? -u : u) + (h & 2 ? -v : v);
  },

  // 2D Perlin noise function
  perlin: function (x, y) {
    // Find unit square that contains point
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    // Find relative x, y of point in square
    x -= Math.floor(x);
    y -= Math.floor(y);

    // Compute fade curves for coordinates
    const u = this.fade(x);
    const v = this.fade(y);

    // Hash coordinates of the 4 square corners
    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;

    // Mix final hash values with coordinates
    return this.lerp(
      v,
      this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
      this.lerp(
        u,
        this.grad(this.p[A + 1], x, y - 1),
        this.grad(this.p[B + 1], x - 1, y - 1)
      )
    );
  },
};

function generateRandomMap() {
  const width = 100;
  const height = 50;
  const map = [];

  // Initialize noise
  noise.seed();

  // Parameters for continent generation
  const scale = 0.02; // Scale of the noise (smaller = larger features)
  const octaves = 5; // Number of layers of noise
  const persistence = 0.7; // How much each octave contributes
  const centerWeight = 0.4; // How much to weight the center of the map

  // Generate base noise map
  for (let row = 0; row < height; row++) {
    const rowData = [];
    for (let col = 0; col < width; col++) {
      // Calculate distance from center for circular continent effect
      const dx = col / width - 0.5;
      const dy = row / height - 0.5;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy) * 2;

      // Generate layered noise
      let value = 0;
      let amplitude = 1;
      let frequency = 1;
      let maxValue = 0;

      for (let o = 0; o < octaves; o++) {
        const x = col * scale * frequency;
        const y = row * scale * frequency;
        value += noise.perlin(x, y) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
      }

      // Normalize value
      value = value / maxValue;

      // Apply center weight to create continent effect
      value = value - distanceFromCenter * centerWeight;

      // Determine terrain type based on noise value
      let type = "water";
      if (row === 0 || row === height - 1 || col === 0 || col === width - 1) {
        type = "water"; // Ensure border is water
      } else if (value > -0.3) {
        if (value > 0.0) {
          type = "mountain";
        } else {
          type = "grass";
        }
      }

      rowData.push({ x: col, y: row, type });
    }
    map.push(rowData);
  }

  return map;
}

module.exports = { generateRandomMap };
