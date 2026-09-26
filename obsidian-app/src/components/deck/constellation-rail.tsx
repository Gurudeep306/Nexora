"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  useMotionValue,
  useTransform,
  useSpring,
  motion,
  MotionValue,
} from "motion/react";
import { 
  Home, Users, Settings, Code, BarChart2, Zap, Moon, Sun, Search,
  LucideProps, LucideIcon 
} from "lucide-react";
import { twMerge } from "tailwind-merge";

interface ConstellationNode {
  id: string;
  icon: string; // Icon name from Lucide
  label: string;
  description?: string;
  href?: string;
  children?: ConstellationNode[];
  isActive?: boolean;
}

interface ConstellationRailProps {
  nodes: ConstellationNode[];
  className?: string;
  onNodeSelect?: (nodeId: string) => void;
}

// Helper component to render icon by name
const GetIcon = ({ icon, className }: { icon: string; className?: string }) => {
  // Icon mapping from string names to actual Lucide icon components
  const iconMap: Record<string, React.ComponentType<LucideProps>> = {
    home: Home,
    users: Users,
    settings: Settings,
    code: Code,
    "bar-chart-2": BarChart2,
    zap: Zap,
    moon: Moon,
    sun: Sun,
    search: Search,
  };
  
  const IconComponent = iconMap[icon] || Search; // fallback to search icon
  return <IconComponent className={className} />;
};

// ConstellationNode component - each node handles its own animations
const ConstellationNode = ({ 
  node, 
  index, 
  nodes, 
  hoveredNode, 
  expandedNode,
  onNodeSelect,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onNodeClick
}: {
  node: ConstellationNode;
  index: number;
  nodes: ConstellationNode[];
  hoveredNode: string | null;
  expandedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
  onNodeMouseEnter: (nodeId: string) => void;
  onNodeMouseLeave: (nodeId: string) => void;
  onNodeClick: (nodeId: string) => void;
}) => {
  const { id, label, description, href, children, icon, isActive = false } = node;
  
  // Motion values for this node
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);
  const glow = useMotionValue(0);
  
  // Determine if this node is hovered, or a neighbor of the hovered node
  const isHovered = hoveredNode === id;
  const isLeftNeighbor = index > 0 && nodes[index - 1]?.id === hoveredNode;
  const isRightNeighbor = index < nodes.length - 1 && nodes[index + 1]?.id === hoveredNode;
  
  // Update motion values based on hover state and active state
  useEffect(() => {
    if (isHovered) {
      // Animate hovered node
      scale.set(1.2);
      rotate.set(0); // Reset rotation
      
      // Glow effect for active node when hovered
      if (isActive) {
        glow.set(1);
      }
    } else if (isLeftNeighbor) {
      // Left neighbor: slight left rotation
      scale.set(1.1);
      rotate.set(-5); // Slight left rotation
      glow.set(0); // No glow for neighbors
    } else if (isRightNeighbor) {
      // Right neighbor: slight right rotation
      scale.set(1.1);
      rotate.set(5); // Slight right rotation
      glow.set(0); // No glow for neighbors
    } else {
      // Default state
      scale.set(1);
      rotate.set(0);
      
      // Glow only for active nodes when not hovered (but only if we want them to always glow?)
      // Based on original code, active nodes glow when hovered and keep glowing?
      // We'll set glow to 1 for active nodes only when they are the hovered node?
      // But the original code set glow to 1 on hover for active nodes and didn't reset on leave for active nodes.
      // Let's follow: active nodes glow when hovered, and remain glowing until another node is hovered?
      // Actually, the original code on leave only reset glow if NOT active.
      // So active nodes keep their glow state until they are hovered again? That doesn't make sense.
      // Let's simplify: active nodes have a base glow of 0.5, and when hovered they go to 1.
      // We'll do: glow.set(isActive ? 0.5 : 0);
      // But to match the original behavior as closely as possible without storing state:
      // We'll set glow to 1 if active and hovered, otherwise 0 for active nodes? 
      // Actually, the original code left the glow at 1 for active nodes after hovering.
      // Since we don't have persistence, we'll make active nodes always glow at 0.5, and when hovered go to 1.
      glow.set(isActive ? (isHovered ? 1 : 0.5) : 0);
    }
  }, [isHovered, isLeftNeighbor, isRightNeighbor, isActive, scale, rotate, glow]);
  
  // Handle mouse enter
  const handleMouseEnter = useCallback(() => {
    onNodeMouseEnter(id);
  }, [id, onNodeMouseEnter]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    onNodeMouseLeave(id);
  }, [id, onNodeMouseLeave]);
  
  // Handle click
  const handleClick = useCallback(() => {
    onNodeClick(id);
  }, [id, onNodeClick]);
  
  return (
    <motion.div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="relative flex items-center justify-center w-10 h-10 mx-2"
      style={{
        scale: scale.get(),
        rotate: rotate.get(),
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Glowing thread connection */}
      {!expandedNode && (
        <motion.div
          className="absolute left-1/2 -top-2 w-0.5"
          style={{
            height: `calc(100% + 4px)`,
            background: `linear-gradient(
              to bottom,
              transparent,
              ${isActive ? "var(--color-primary)" : "transparent"} 
              ${isActive ? "70%" : "0%"}
            )`,
            opacity: isActive ? glow.get() : 0,
            transformOrigin: "top",
          }}
          transition={{ opacity: { duration: 0.2 } }}
        />
      )}
      
      {/* Node background (glass effect) */}
      <motion.div
        className="absolute inset-0 bg-background/40 backdrop-blur-sm
                   border border-border/20 rounded-full opacity-0"
        style={{
          opacity: (isHovered || isActive) ? 0.3 : 0,
        }}
        transition={{ opacity: { duration: 0.2 } }}
      />
      
      {/* Active indicator ring */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid var(--color-primary)`,
            opacity: glow.get(),
          }}
          transition={{ opacity: { duration: 0.2 } }}
        />
      )}
      
      {/* Node content */}
      <div className="flex items-center justify-center z-10">
        {href ? (
          <a href={href} className="flex items-center justify-center p-1">
            <GetIcon icon={icon} 
              className={`${isActive ? "text-primary" : "text-foreground/90"} 
                       ${isHovered && "scale-110"}`}
            />
          </a>
        ) : (
          <button
            onClick={handleClick}
            className={`
              flex items-center justify-center p-1 rounded 
              hover:bg-foreground/10
              ${isActive && "bg-primary/20"}
              ${isHovered && "bg-primary/10"}
            `}
          >
            <GetIcon icon={icon} 
              className={`${isActive ? "text-primary" : "text-foreground/90"} 
                       ${isHovered && "scale-110"}`}
            />
          </button>
        )}
        
        {/* Label flyout on hover */}
        {isHovered && !expandedNode && (
          <div className="absolute left-full ml-3 flex items-center gap-2 
                     px-3 py-1 text-xs bg-background/80 backdrop-blur-lg
                     border border-border/20 rounded-md text-foreground/90
                     whitespace-nowrap">
            <span>{label}</span>
            {description && (
              <span className="text-xs text-muted-foreground ml-1">
                ({description})
              </span>
            )}
          </div>
        )}
        
        {/* Expanded children (radial arc) */}
        {expandedNode === id && children && children.length > 0 && (
          <motion.div
            className="absolute"
            style={{
              position: "absolute",
              bottom: "120%",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {/* Would implement radial arc layout here */}
            <div className="flex space-x-2">
              {children.map((child, childIndex) => (
                <motion.div
                  key={child.id}
                  className="relative flex items-center justify-center w-8 h-8"
                  style={{
                    // Position in arc
                    transform: `rotate(${
                      (childIndex - (children.length - 1) / 2) * 15
                    }deg) translateY(-20px) rotate(${
                      -(childIndex - (children.length - 1) / 2) * 15
                    }deg)`,
                  }}
                >
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm
                           border border-border/20 rounded-full opacity-0"
                   style={{
                     opacity: 0.2,
                     transition: "opacity 0.2s"
                   }}
                  />
                  <div className="flex items-center justify-center z-10">
                    <button
                      onClick={() => {}}
                      className="flex items-center justify-center p-1 rounded hover:bg-foreground/10"
                    >
                      <child.icon 
                         className="h-3.5 w-3.5 text-foreground/90"
                       />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export const ConstellationRail = ({ 
  nodes, 
  className = "", 
  onNodeSelect 
}: ConstellationRailProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
   
  // Handle mouse enter on rail
  const handleRailMouseEnter = useCallback(() => {
    // Could implement hover effects here
  }, []);
  
  // Handle mouse leave on rail
  const handleRailMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);
  
  // Handle node hover
  const handleNodeMouseEnter = useCallback((nodeId: string) => {
    setHoveredNode(nodeId);
  }, []);
  
  // Handle node leave
  const handleNodeMouseLeave = useCallback((nodeId: string) => {
    if (hoveredNode === nodeId) {
      setHoveredNode(null);
    }
  }, [hoveredNode]);
  
  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    setExpandedNode(expandedNode === nodeId ? null : nodeId);
    onNodeSelect?.(nodeId);
  }, [onNodeSelect]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const focusedIndex = nodes.findIndex(
      (node) => node.id === hoveredNode || node.id === expandedNode
    );
    
    if (e.key === "ArrowDown" && focusedIndex < nodes.length - 1) {
      const nextNode = nodes[focusedIndex + 1];
      setHoveredNode(nextNode.id);
      onNodeSelect?.(nextNode.id);
    }
    else if (e.key === "ArrowUp" && focusedIndex > 0) {
      const prevNode = nodes[focusedIndex - 1];
      setHoveredNode(prevNode.id);
      onNodeSelect?.(prevNode.id);
    }
    else if (e.key === "Enter" || e.key === " ") {
      if (hoveredNode) {
        handleNodeClick(hoveredNode);
      }
    }
    else if (e.key === "Escape") {
      setExpandedNode(null);
      setHoveredNode(null);
    }
    // Number keys 1-9 for direct access
    else if (e.key >= "1" && e.key <= "9") {
      const index = parseInt(e.key) - 1;
      if (index < nodes.length) {
        const node = nodes[index];
        setHoveredNode(node.id);
        onNodeSelect?.(node.id);
      }
    }
  }, [nodes, hoveredNode, expandedNode, onNodeSelect, handleNodeClick]);
  
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown as EventListener);
    return () => document.removeEventListener("keydown", handleKeyDown as EventListener);
  }, [handleKeyDown]);
  
  return (
    <motion.div
      ref={railRef}
      className={`
        flex flex-col items-center gap-2 p-3 
        bg-popover/80 backdrop-blur-lg 
        border-r border-border/20 h-full overflow-hidden
        ${className}
      `}
      onMouseEnter={handleRailMouseEnter}
      onMouseLeave={handleRailMouseLeave}
      tabIndex={0} // Make rail focusable for keyboard navigation
      style={{ position: "relative" }}
    >
      {/* Vertical rail line */}
      <motion.div className="w-0.5 bg-border/20" />
      
      {/* Nodes */}
      {nodes.map((node, index) => (
        <ConstellationNode
          key={node.id}
          node={node}
          index={index}
          nodes={nodes}
          hoveredNode={hoveredNode}
          expandedNode={expandedNode}
          onNodeSelect={onNodeSelect}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onNodeClick={handleNodeClick}
        />
      ))}
      
      {/* Bottom glow effect for active node when expanded */}
      {expandedNode && (
        <motion.div
          className="absolute bottom-0 left-1/2 w-0.5"
          style={{
            height: "20px",
            background: "var(--color-primary)",
            opacity: 0.4,
            transformOrigin: "top",
          }}
          transition={{ opacity: { duration: 0.2 } }}
        />
      )}
    </motion.div>
  );
};