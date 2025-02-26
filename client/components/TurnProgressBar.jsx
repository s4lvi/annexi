// TurnProgressBar.jsx
import React from "react";

const TurnProgressBar = ({ currentStep, totalSteps = 7 }) => {
  const dots = [];
  for (let i = 0; i < totalSteps; i++) {
    const isCurrent = i === currentStep;
    const isPast = i < currentStep;
    const style = {
      width: isCurrent ? "16px" : "10px",
      height: isCurrent ? "16px" : "10px",
      borderRadius: "50%",
      backgroundColor: isPast ? "green" : isCurrent ? "blue" : "gray",
      margin: "0 4px",
      transition: "all 0.3s ease",
    };
    dots.push(<div key={i} style={style} />);
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "8px" }}>
      {dots}
    </div>
  );
};

export default TurnProgressBar;
