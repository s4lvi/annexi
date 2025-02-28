"use client";
import React, { useRef, useEffect } from "react";

/**
 * A horizontally scrollable container with drag-to-scroll functionality
 * with increased height to prevent vertical cutoff
 */
const ScrollableCardContainer = ({ children }) => {
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Handle mouse events for drag scrolling
    const handleMouseDown = (e) => {
      isDragging.current = true;
      startX.current = e.pageX - container.offsetLeft;
      scrollLeft.current = container.scrollLeft;
      container.style.cursor = "grabbing";
      e.preventDefault();
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      container.style.cursor = "grab";
    };

    const handleMouseLeave = () => {
      isDragging.current = false;
      container.style.cursor = "grab";
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX.current) * 1.5; // Scroll speed multiplier
      container.scrollLeft = scrollLeft.current - walk;
    };

    // Add event listeners
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("mousemove", handleMouseMove);

    // Clean up event listeners
    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full flex items-end overflow-x-auto pb-2 px-8 gap-4 cursor-grab"
      style={{
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none", // IE/Edge
        height: "340px", // INCREASED HEIGHT to fit cards
        marginBottom: "-20px", // Pull closer to the bar
      }}
    >
      {/* Hide scrollbar for Chrome/Safari/Opera */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {children}
    </div>
  );
};

export default ScrollableCardContainer;
