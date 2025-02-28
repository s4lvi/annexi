// ReadyButton.jsx
import React, { useState } from "react";
import StepProgressCircle from "./StepProgressCircle";

export default function ReadyButton({
  isReady,
  onClick,
  currentStep,
  localReady,
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={!isReady ? onClick : null}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "fixed",
        top: "0px",
        left: "0px",
        width: "20vw",
        height: "20vw",
        minWidth: "128px",
        minHeight: "128px",
        borderRadius: "0 0 50% 0",
        border: `1em solid ${
          isHovered && !isReady ? "rgba(119, 119, 119, 0.7)" : "#5a9656"
        }`,
        backgroundColor: isReady
          ? "rgba(108, 117, 125, 0.7)"
          : isHovered
          ? "#28a745"
          : "rgba(108, 117, 125, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: "bold",
        cursor: isReady ? "default" : "pointer",
        zIndex: 1000,
        boxShadow:
          isHovered && !isReady
            ? "0 4px 15px rgba(0,0,0,0.5)"
            : "0 2px 10px rgba(0,0,0,0.3)",
        transition: "all 0.3s ease",
        transform: isHovered && !isReady ? "scale(1.05)" : "scale(1)",
        fontSize: isHovered && !isReady ? "1.1em" : "1em",
        textShadow:
          isHovered && !isReady ? "0px 1px 3px rgba(0,0,0,0.5)" : "none",
      }}
    >
      {isReady ? (
        "Waiting"
      ) : (
        <StepProgressCircle
          currentStep={currentStep}
          totalSteps={7}
          size={128}
          localReady={localReady}
        />
      )}
    </div>
  );
}
