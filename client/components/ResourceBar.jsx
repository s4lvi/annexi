// ResourceBar.jsx
import React, { useState, useEffect } from "react";

export default function ResourceBar({ resourceValue }) {
  const [displayValue, setDisplayValue] = useState(resourceValue);

  useEffect(() => {
    let startValue = displayValue;
    const endValue = resourceValue;
    const duration = 1000; // animation duration in ms
    const stepTime = 50; // update every 50ms
    const steps = duration / stepTime;
    const increment = (endValue - startValue) / steps;
    let current = startValue;

    const interval = setInterval(() => {
      current += increment;
      setDisplayValue(Math.floor(current));
      if (
        (increment > 0 && current >= endValue) ||
        (increment < 0 && current <= endValue)
      ) {
        clearInterval(interval);
        setDisplayValue(endValue);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [resourceValue]);

  return (
    <div className="resource-bar p-2 bg-gray-800 text-white rounded">
      <span>Production: {displayValue}</span>
    </div>
  );
}
