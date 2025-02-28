// CardDisplayBar.jsx
import React, { useState, useRef } from "react";

export default function CardDisplayBar({
  title,
  message,
  children,
  rightContent,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [moveDistance, setMoveDistance] = useState(0);
  const cardContainerRef = useRef(null);

  // Using a dragThreshold to distinguish between clicks and drags
  const dragThreshold = 5;

  const handleMouseDown = (e) => {
    if (!cardContainerRef.current || e.button !== 0) return;

    // Record the starting position but don't set isDragging yet
    setStartX(e.pageX - cardContainerRef.current.offsetLeft);
    setScrollLeft(cardContainerRef.current.scrollLeft);
    setMoveDistance(0);
  };

  const handleMouseUp = (e) => {
    // If we didn't move far enough to be considered a drag,
    // we don't need to prevent the click from going through
    if (moveDistance < dragThreshold) {
      setIsDragging(false);
    } else {
      // This prevents the click event from firing after a drag
      e.stopPropagation();
      setTimeout(() => {
        setIsDragging(false);
      }, 0);
    }

    if (cardContainerRef.current) {
      cardContainerRef.current.style.cursor = "default";
    }
  };

  const handleMouseMove = (e) => {
    if (!cardContainerRef.current) return;

    const x = e.pageX - cardContainerRef.current.offsetLeft;
    const dx = Math.abs(x - startX);
    setMoveDistance(dx);

    // Only consider it a drag if we've moved past the threshold
    if (dx > dragThreshold) {
      if (!isDragging) {
        setIsDragging(true);
        cardContainerRef.current.style.cursor = "grabbing";
      }

      const walk = (x - startX) * 2;
      cardContainerRef.current.scrollLeft = scrollLeft - walk;
      e.preventDefault();
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (cardContainerRef.current) {
      cardContainerRef.current.style.cursor = "default";
    }
  };

  return (
    <div className="mobile-scale-container">
      <div className="absolute bottom-0 left-0 w-full h-[420px] z-20">
        {/* Cards container with horizontal scrolling */}
        {children && (
          <div
            ref={cardContainerRef}
            className="p-4 overflow-x-auto"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
          >
            <div className="flex gap-4 px-2 pb-20 min-h-[120px] items-center">
              {React.Children.map(children, (child) => (
                <div
                  onClick={(e) => {
                    // If we're dragging, prevent the click
                    if (isDragging) {
                      e.stopPropagation();
                    }
                  }}
                >
                  {child}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Title bar */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent py-6 pt-20 px-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            {message && <p className="text-white text-sm">{message}</p>}
          </div>
          {rightContent && <div>{rightContent}</div>}
        </div>
      </div>
    </div>
  );
}
