"use client";
import { useState, useEffect } from "react";
import {
  useMotionValue,
  motion,
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

// Individual dock item that handles its own motion values
const DockItem = ({
  item,
  index,
  items,
  hoveredItem,
  onMouseEnter,
  onMouseLeave,
}: {
  item: DockItem;
  index: number;
  items: DockItem[];
  hoveredItem: string | null;
  onMouseEnter: (itemId: string) => void;
  onMouseLeave: (itemId: string) => void;
}) => {
  const { id, label, href, onClick } = item;

  // Compute target values based on hover state
  const isHovered = hoveredItem === id;
  const isLeftNeighbor = index > 0 && hoveredItem === items[index - 1]?.id;
  const isRightNeighbor = index < items.length - 1 && hoveredItem === items[index + 1]?.id;
  
  const targetScale = isHovered ? 1.2 : (isLeftNeighbor || isRightNeighbor) ? 1.1 : 1;
  const targetY = isHovered ? -8 : (isLeftNeighbor || isRightNeighbor) ? -4 : 0;
  const targetFontWeight = isHovered ? 600 : (isLeftNeighbor || isRightNeighbor) ? 450 : 400;

  // Motion values for animation
  const scale = useMotionValue(targetScale);
  const y = useMotionValue(targetY);
  const fontWeight = useMotionValue(targetFontWeight);

  // Update motion values when targets change
  useEffect(() => {
    scale.set(targetScale);
    y.set(targetY);
    fontWeight.set(targetFontWeight);
  }, [targetScale, targetY, targetFontWeight, scale, y, fontWeight]);

  return (
    <motion.div
      onMouseEnter={() => onMouseEnter(id)}
      onMouseLeave={() => onMouseLeave(id)}
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        scale: scale.get(),
        y: y.get(),
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
        {href ? (
          <a href={href} className="flex items-center justify-center">
            <span
              style={{
                fontVariationSettings: `'wght' ${fontWeight.get() || 400}`
              }}
            >
              <item.icon 
                className={`h-5 w-5 text-foreground ${isHovered ? "font-medium" : "font-normal"}`}
              />
            </span>
          </a>
        ) : (
          <button
            onClick={onClick}
            className="flex items-center justify-center p-1 rounded hover:bg-foreground/10"
          >
            <span
              style={{
                fontVariationSettings: `'wght' ${fontWeight.get() || 400}`
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
            {label}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const Dock = ({ items, className = "" }: DockProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleMouseEnter = (itemId: string) => {
    setHoveredItem(itemId);
  };

  const handleMouseLeave = (itemId: string) => {
    if (hoveredItem === itemId) {
      setHoveredItem(null);
    }
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
      {items.map((item, index) => (
        <DockItem
          key={item.id}
          item={item}
          index={index}
          items={items}
          hoveredItem={hoveredItem}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      ))}
    </motion.div>
  );
};