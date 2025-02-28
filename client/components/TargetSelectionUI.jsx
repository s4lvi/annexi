// TargetSelectionUI.jsx
import React from "react";
import CardDisplayBar from "./CardDisplayBar.jsx";

export default function TargetSelectionUI() {
  return (
    <CardDisplayBar
      title="Select Target City"
      message={`Click on an enemy city on the map to target it.`}
    ></CardDisplayBar>
  );
}
