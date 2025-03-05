import React, { useState, useRef, useEffect } from "react";

export default function CardDisplayBar({
  title,
  message,
  children,
  rightContent,
  onCardClick, // optional async callback for when a card is clicked
}) {
  const containerRef = useRef(null);
  const childrenContainerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Measure the natural width of the cards and calculate a scale factor
  useEffect(() => {
    function updateScale() {
      if (childrenContainerRef.current) {
        const childrenWidth = childrenContainerRef.current.scrollWidth;
        const availableWidth = window.innerWidth - 20; // account for 10px padding each side
        const newScale =
          childrenWidth > availableWidth ? availableWidth / childrenWidth : 1;
        setScale(newScale);
      }
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [children]);

  // Fade out the entire UI when a card is clicked until the async work (if any) is finished.
  const handleCardClick = async (e, child) => {
    e.stopPropagation();
    if (onCardClick) {
      await onCardClick(child);
    }
  };

  return (
    <div
      ref={containerRef}
      className="mobile-scale-container"
      style={{
        pointerEvents: "auto",
        opacity: 1,
        transition: "opacity 0.3s ease",
        overflow: "visible",
        width: "100vw", // container spans the full viewport width
      }}
    >
      {/* Title bar remains unchanged */}
      <div
        className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent py-6 pt-20 px-4 flex justify-between items-center"
        style={{ pointerEvents: "none", display: "inline-block" }}
      >
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          {message && <p className="text-white text-sm">{message}</p>}
        </div>
        {rightContent && <div>{rightContent}</div>}
      </div>
      <div
        className="absolute bottom-0 left-0 w-full h-[420px] z-20"
        style={{ pointerEvents: "none" }}
      >
        {children && (
          // This outer wrapper ensures centering and side padding.
          <div
            className="p-6"
            style={{
              pointerEvents: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              paddingLeft: "20px",
              paddingRight: "0px",
              transform: `scale(${scale})`,
              transformOrigin: "bottom center",
            }}
          >
            {/* The inner container's natural width is measured */}
            <div ref={childrenContainerRef} style={{ display: "flex" }}>
              {React.Children.map(children, (child, index) => (
                <div
                  style={{
                    pointerEvents: "auto",
                    display: "inline-block",
                    transition: "transform 0.2s ease, z-index 0.2s ease",
                    // Overlap subsequent cards; they’ll overlap more as the available space shrinks.
                    marginLeft: index === 0 ? 0 : "-40px",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.zIndex = 10;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.zIndex = 1;
                  }}
                  onClick={(e) => handleCardClick(e, child)}
                >
                  {child}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
