import { useState, useEffect, useRef } from "react";
import {
  useMotionValue,
  useTransform,
  useSpring,
  motion,
  MotionValue,
} from "motion/react";
import { twMerge } from "tailwind-merge";

interface DockItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface DockProps {
  items: DockItem[];
  className?: string;
}

export const Dock = ({ items, className = "" }: DockProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Motion values for scale and position
  const scaleValues = new Map<string, MotionValue<number>>();
  const yValues = new Map<string, MotionValue<number>>();
  // Motion values for font weight animation
  const fontWeightValues = new Map<string, MotionValue<number>>();

  // Initialize motion values for each item
  useEffect(() => {
    items.forEach((item) => {
      scaleValues.set(item.id, useMotionValue(1));
      yValues.set(item.id, useMotionValue(0));
      fontWeightValues.set(item.id, useMotionValue(400)); // Start at regular weight
    });
  }, [items]);

  const handleMouseEnter = (itemId: string) => {
    setHoveredItem(itemId);
    
    // Spring animation for hovered item
    scaleValues.get(itemId)?.set(1.2);
    yValues.get(itemId)?.set(-8);
    
    // Animate font weight to bold on hover
    fontWeightValues.get(itemId)?.set(600); // Semi-bold
    
    // Neighboring items get subtle effect
    const itemIndex = items.findIndex((item) => item.id === itemId);
    if (itemIndex > 0) {
      const leftNeighbor = items[itemIndex - 1].id;
      scaleValues.get(leftNeighbor)?.set(1.1);
      yValues.get(leftNeighbor)?.set(-4);
      // Slight font weight increase for neighbors
      fontWeightValues.get(leftNeighbor)?.set(450);
    }
    if (itemIndex < items.length - 1) {
      const rightNeighbor = items[itemIndex + 1].id;
      scaleValues.get(rightNeighbor)?.set(1.1);
      yValues.get(rightNeighbor)?.set(-4);
      // Slight font weight increase for neighbors
      fontWeightValues.get(rightNeighbor)?.set(450);
    }
  };

  const handleMouseLeave = (itemId: string) => {
    if (hoveredItem === itemId) {
      setHoveredItem(null);
    }
    
    // Reset all items
    items.forEach((item) => {
      scaleValues.get(item.id)?.set(1);
      yValues.get(item.id)?.set(0);
      fontWeightValues.get(item.id)?.set(400); // Reset to regular weight
    });
  };

  return (
    <motion.div
      className={`
        flex items-center justify-center gap-2 p-2 
        bg-popover/80 backdrop-blur-lg 
        border border-border/20 rounded-xl
        ${className}
      `}
      style={{ position: "relative" }}
    >
      {items.map((item) => {
        const isHovered = hoveredItem === item.id;
        
        return (
          <motion.div
            key={item.id}
            onMouseEnter={() => handleMouseEnter(item.id)}
            onMouseLeave={() => handleMouseLeave(item.id)}
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              scale: scaleValues.get(item.id)?.get(),
              y: yValues.get(item.id)?.get(),
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* Glass background for item */}
            <motion.div
              className="absolute inset-0 bg-background/30 backdrop-blur-sm 
                        border border-border/20 rounded-lg opacity-0"
              style={{
                opacity: isHovered ? 0.6 : 0,
              }}
              transition={{ opacity: { duration: 0.2 } }}
            />
            
            {/* Item content */}
            <div className="flex items-center justify-center p-2 rounded-lg">
              {item.href ? (
                <a href={item.href} className="flex items-center justify-center">
                  <span
                    style={{
                      fontVariationSettings: `'wght' ${fontWeightValues.get(item.id)?.get() || 400}`
                    }}
                  >
                    <item.icon 
                      className={`h-5 w-5 text-foreground ${isHovered ? "font-medium" : "font-normal"}`}
                    />
                  </span>
                </a>
              ) : (
                <button
                  onClick={item.onClick}
                  className="flex items-center justify-center p-1 rounded hover:bg-foreground/10"
                >
                  <span
                    style={{
                      fontVariationSettings: `'wght' ${fontWeightValues.get(item.id)?.get() || 400}`
                    }}
                  >
                    <item.icon 
                      className={`h-5 w-5 text-foreground ${isHovered ? "font-medium" : "font-normal"}`}
                    />
                  </span>
                </button>
              )}
              
              {/* Label flyout on hover */}
              {isHovered && (
                <div className="absolute bottom-full mb-2 px-3 py-1 text-xs 
                            bg-background/80 backdrop-blur-lg border border-border/20 
                            rounded-md text-foreground/90 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};