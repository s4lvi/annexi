// TerritoryExpansionUI.jsx
import React from "react";
import CardDisplayBar from "./CardDisplayBar.jsx";

export default function TerritoryExpansionUI() {
  return (
    <CardDisplayBar
      title="Territory Expansion"
      message={`Territory expansion is in progress. Please wait...`}
    ></CardDisplayBar>
  );
}
