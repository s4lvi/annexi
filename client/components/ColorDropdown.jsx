// components/ColorDropdown.js
import React from "react";

const PLAYER_COLORS = [
  { name: "Red", value: 0xed6a5a, hexString: "#ed6a5a" },
  { name: "Teal", value: 0x5ca4a9, hexString: "#5ca4a9" },
  { name: "Yellow", value: 0xe6af2e, hexString: "#e6af2e" },
  { name: "Purple", value: 0x9370db, hexString: "#9370db" },
  { name: "Pink", value: 0xcf7cc1, hexString: "#cf7cc1" },
  { name: "Brown", value: 0x4f3406, hexString: "#4f3406" },
  { name: "Gray", value: 0x808080, hexString: "#808080" },
  { name: "Navy", value: 0x3d405b, hexString: "#3d405b" },
  { name: "Sage", value: 0x81b29a, hexString: "#81b29a" },
  { name: "Orange", value: 0xf4845f, hexString: "#f4845f" },
  { name: "Slate", value: 0x706677, hexString: "#706677" },
  { name: "Olive", value: 0x8d8741, hexString: "#8d8741" },
  { name: "Coral", value: 0x7b9c91, hexString: "#7b9c91" },
  { name: "Mint", value: 0xc7e9b0, hexString: "#c7e9b0" },
  { name: "Lavender", value: 0xe6e6fa, hexString: "#E6E6FA" },
];

const ColorDropdown = ({
  selectedColor,
  onColorSelect,
  takenColors,
  isCurrentUser,
}) => {
  // Convert hex to RGB for CSS
  const hexToRgb = (hex) => {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="relative">
      {isCurrentUser ? (
        <select
          value={selectedColor}
          onChange={(e) => onColorSelect(parseInt(e.target.value))}
          className="bg-neutral-800 border border-neutral-600 text-white py-1 px-2 rounded-md text-sm"
          style={{
            backgroundColor: selectedColor
              ? hexToRgb(selectedColor)
              : "transparent",
            color: selectedColor
              ? getBrightness(selectedColor) > 128
                ? "black"
                : "white"
              : "white",
          }}
        >
          {PLAYER_COLORS.map((color) => (
            <option
              key={color.value}
              value={color.value}
              disabled={
                takenColors.includes(color.value) &&
                color.value !== selectedColor
              }
            >
              {color.name}
            </option>
          ))}
        </select>
      ) : (
        <div
          className="w-6 h-6 rounded-full border border-neutral-600"
          style={{
            backgroundColor: selectedColor
              ? hexToRgb(selectedColor)
              : "transparent",
          }}
        />
      )}
    </div>
  );
};

// Calculate brightness to determine text color (black or white)
function getBrightness(hex) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export default ColorDropdown;
