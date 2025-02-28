import React from "react";

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeDonutSegment(
  cx,
  cy,
  outerRadius,
  innerRadius,
  startAngle,
  endAngle
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    startOuter.x,
    startOuter.y,
    "A",
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    1,
    endOuter.x,
    endOuter.y,
    "L",
    startInner.x,
    startInner.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    0,
    endInner.x,
    endInner.y,
    "Z",
  ].join(" ");
}

export default function StepProgressCircle({
  currentStep,
  totalSteps = 7,
  size = 128,
  localReady,
}) {
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size * 0.3;
  const innerRadius = size * 0.45;
  const gap = 10; // degrees
  const stepAngle = 360 / totalSteps;
  const segments = [];

  for (let i = 0; i < totalSteps; i++) {
    const startAngle = i * stepAngle + gap / 2;
    const endAngle = (i + 1) * stepAngle - gap / 2;

    // New color logic:
    // - Red for current step (not yet ready)
    // - Yellow for current step when locally ready (waiting for server confirmation)
    // - Green for completed steps
    // - Gray for future steps
    let fillColor = "rgba(108,117,125,0.1)"; // default gray for incomplete/future steps

    if (i < currentStep) {
      fillColor = "#28a745"; // green for completed steps
    } else if (i === currentStep) {
      if (localReady) {
        fillColor = "#f1c40f"; // yellow when waiting
      } else {
        fillColor = "#dc3545"; // red for current active step
      }
    }

    segments.push(
      <path
        key={i}
        d={describeDonutSegment(
          cx,
          cy,
          outerRadius,
          innerRadius,
          startAngle,
          endAngle
        )}
        fill={fillColor}
        stroke="none"
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments}
    </svg>
  );
}
