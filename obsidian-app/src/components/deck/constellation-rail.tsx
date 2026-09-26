import { useState, useEffect, useRef } from "react";
import {
  useMotionValue,
  useTransform,
  useSpring,
  motion,
  MotionValue,
} from "motion/react";
import { LucideProps, LucideIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface ConstellationNode {
  id: string;
  icon: React.ComponentType<LucideProps>;
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

export const ConstellationRail = ({ 
  nodes, 
  className = "", 
  onNodeSelect 
}: ConstellationRailProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  
  // Motion values for each node
  const scaleValues = new Map<string, MotionValue<number>>();
  const rotateValues = new Map<string, MotionValue<number>>();
  const glowValues = new Map<string, MotionValue<number>>();
  
  // Initialize motion values
  useEffect(() => {
    nodes.forEach((node) => {
      scaleValues.set(node.id, useMotionValue(1));
      rotateValues.set(node.id, useMotionValue(0));
      glowValues.set(node.id, useMotionValue(0));
    });
  }, [nodes]);

  // Handle mouse enter on rail
  const handleRailMouseEnter = () => {
    // Could implement hover effects here
  };

  // Handle mouse leave on rail
  const handleRailMouseLeave = () => {
    setHoveredNode(null);
    // Reset all nodes
    nodes.forEach((node) => {
      scaleValues.get(node.id)?.set(1);
      rotateValues.get(node.id)?.set(0);
      glowValues.get(node.id)?.set(node.isActive ? 1 : 0);
    });
  };

  // Handle node hover
  const handleNodeMouseEnter = (nodeId: string) => {
    setHoveredNode(nodeId);
    
    // Animate hovered node
    scaleValues.get(nodeId)?.set(1.2);
    rotateValues.get(nodeId)?.set(0); // Reset rotation
    
    // Orbital drift for neighbors
    const nodeIndex = nodes.findIndex((node) => node.id === nodeId);
    if (nodeIndex > 0) {
      const leftNeighbor = nodes[nodeIndex - 1].id;
      rotateValues.get(leftNeighbor)?.set(-5); // Slight left rotation
    }
    if (nodeIndex < nodes.length - 1) {
      const rightNeighbor = nodes[nodeIndex + 1].id;
      rotateValues.get(rightNeighbor)?.set(5); // Slight right rotation
    }
    
    // Glow effect for active node
    if (nodes[nodeIndex]?.isActive) {
      glowValues.get(nodeId)?.set(1);
    }
  };

  const handleNodeMouseLeave = (nodeId: string) => {
    if (hoveredNode === nodeId) {
      setHoveredNode(null);
    }
    
    // Reset node
    scaleValues.get(nodeId)?.set(1);
    rotateValues.get(nodeId)?.set(0);
    
    // Reset neighbors
    nodes.forEach((node) => {
      if (node.id !== nodeId) {
        rotateValues.get(node.id)?.set(0);
      }
    });
    
    // Reset glow unless active
    const node = nodes.find((n) => n.id === nodeId);
    if (node && !node.isActive) {
      glowValues.get(nodeId)?.set(0);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    setExpandedNode(expandedNode === nodeId ? null : nodeId);
    onNodeSelect?.(nodeId);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
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
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown as EventListener);
    return () => document.removeEventListener("keydown", handleKeyDown as EventListener);
  }, []);

  // Adaptive ordering logic (simplified)
  useEffect(() => {
    // In a real implementation, we would track usage frequency
    // and adjust positions accordingly
  }, []);

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
      {nodes.map((node, index) => {
        const isActive = node.isActive || false;
        const isHovered = hoveredNode === node.id;
        const isExpanded = expandedNode === node.id;
        
        return (
          <motion.div
            key={node.id}
            onMouseEnter={() => handleNodeMouseEnter(node.id)}
            onMouseLeave={() => handleNodeMouseLeave(node.id)}
            onClick={() => handleNodeClick(node.id)}
            className="relative flex items-center justify-center w-10 h-10 mx-2"
            style={{
              scale: scaleValues.get(node.id)?.get(),
              rotate: rotateValues.get(node.id)?.get(),
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* Glowing thread connection */}
            {!isExpanded && (
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
                  opacity: isActive ? glowValues.get(node.id)?.get() : 0,
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
                  opacity: glowValues.get(node.id)?.get(),
                }}
                transition={{ opacity: { duration: 0.2 } }}
              />
            )}
            
            {/* Node content */}
            <div className="flex items-center justify-center z-10">
              {node.href ? (
                <a href={node.href} className="flex items-center justify-center p-1">
                  <node.icon 
                    className={`${isActive ? "text-primary" : "text-foreground/90"} 
                             ${isHovered && "scale-110"}`
                    }
                  />
                </a>
              ) : (
                <button
                  onClick={(e) => handleNodeClick(node.id)}
                  className={`
                    flex items-center justify-center p-1 rounded 
                    hover:bg-foreground/10
                    ${isActive && "bg-primary/20"}
                    ${isHovered && "bg-primary/10"}
                  `}
                >
                  <node.icon 
                    className={`${isActive ? "text-primary" : "text-foreground/90"} 
                             ${isHovered && "scale-110"}`
                    }
                  />
                </button>
              )}
              
              {/* Label flyout on hover */}
              {isHovered && !isExpanded && (
                <div className="absolute left-full ml-3 flex items-center gap-2 
                           px-3 py-1 text-xs bg-background/80 backdrop-blur-lg
                           border border-border/20 rounded-md text-foreground/90
                           whitespace-nowrap">
                  <span>{node.label}</span>
                  {node.description && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({node.description})
                    </span>
                  )}
                </div>
              )}
              
              {/* Expanded children (radial arc) */}
              {isExpanded && node.children && node.children!.length > 0 && (
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
                    {node.children!.map((child, childIndex) => (
                      <motion.div
                        key={child.id}
                        className="relative flex items-center justify-center w-8 h-8"
                        style={{
                          // Position in arc
                          transform: `rotate(${
                            (childIndex - (node.children!.length - 1) / 2) * 15
                          }deg) translateY(-20px) rotate(${
                            -(childIndex - (node.children!.length - 1) / 2) * 15
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
      })}
      
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