import React, { useState, useEffect } from "react";
import StepProgressCircle from "./StepProgressCircle";
import { useGameState } from "./gameState";

export default function ReadyButton({
  isReady,
  onClick,
  currentStep,
  localReady,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBattle, setIsBattle] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const { state } = useGameState();
  const { currentPlayerId, players } = state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);
  const color = currentPlayer.color;

  // Detect battle phase changes to trigger animations.
  useEffect(() => {
    if (currentStep === 6 && !isBattle) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsBattle(true);
        setIsAnimating(false);
      }, 500);
    } else if (currentStep !== 6 && isBattle) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsBattle(false);
        setIsAnimating(false);
      }, 500);
    }
  }, [currentStep, isBattle]);

  // Wrap the onClick handler with cooldown logic.
  const handleClick = () => {
    if (!cooldown && !isReady && !isBattle) {
      onClick();
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
      }, 1000); // 1 second cooldown
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        maxWidth: "256px",
        maxHeight: "256px",
        width: "20vw",
        height: "20vw",
        minWidth: "128px",
        minHeight: "128px",
        borderRadius: "50%",
        border: cooldown
          ? "1em solid grey"
          : isBattle
          ? "1em solid #dc2626"
          : `1em solid ${color.hexString}`,
        backgroundColor: cooldown
          ? "rgba(128, 128, 128, 0.5)"
          : isBattle
          ? "rgba(220, 38, 38, 0.8)" // red with transparency
          : "rgba(17, 24, 39, 0.5)", // gray-900 with transparency
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: "bold",
        cursor: cooldown || isReady || isBattle ? "default" : "pointer",
        zIndex: 1000,
        boxShadow: isBattle
          ? "0 0 20px rgba(220, 38, 38, 0.6)"
          : isHovered && !isReady
          ? "0 4px 15px rgba(0,0,0,0.5)"
          : "0 2px 10px rgba(0,0,0,0.3)",
        transition: isAnimating
          ? "all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)"
          : "all 0.3s ease",
        transform: isAnimating
          ? "rotate(360deg) scale(0.8)"
          : isHovered && !isReady && !isBattle
          ? "scale(1.05)"
          : isBattle && !isAnimating
          ? "scale(1.1)"
          : "scale(1)",
        fontSize: isHovered && !isReady ? "1.1em" : "1em",
        overflow: "hidden",
        textShadow: isBattle
          ? "0px 0px 8px rgba(255,255,255,0.7)"
          : isHovered && !isReady
          ? "0px 1px 3px rgba(0,0,0,0.5)"
          : "none",
      }}
    >
      {isReady ? (
        "Waiting"
      ) : isBattle ? (
        <div
          style={{
            fontSize: "1.8em",
            fontWeight: "bold",
            letterSpacing: "1px",
            textShadow: "0px 0px 8px rgba(255,255,255,0.7)",
          }}
        >
          BATTLE!
        </div>
      ) : (
        <>
          <StepProgressCircle
            currentStep={currentStep}
            totalSteps={7}
            size={384}
            localReady={localReady}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "1.5em",
            }}
          >
            READY
          </div>
        </>
      )}
    </div>
  );
}
