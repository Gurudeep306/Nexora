import { ConstellationRail } from "./constellation-rail";
import { StatusRibbon } from "./status-ribbon";
import { CommandPalette } from "./command-palette";
import { Dock } from "./dock";
import { AuroraBackground } from "../background/aurora-background";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

interface DockItem {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface DeckShellProps {
  children: React.ReactNode;
  constellationNodes: Array<{
    id: string;
    icon: React.ComponentType<any>;
    label: string;
    description?: string;
    href?: string;
    children?: Array<{
      id: string;
      icon: React.ComponentType<any>;
      label: string;
    }>;
    isActive?: boolean;
  }>;
  className?: string;
}

export const DeckShell = ({ 
  children, 
  constellationNodes,
  className = ""
}: DeckShellProps) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Handle command palette toggle with Cmd/Ctrl + K
  // In a real implementation, we'd use a proper keyboard shortcut handler
  // For now, we'll just show/hide based on state

  // Sample dock items
  const dockItems: DockItem[] = [
    {
      id: "home",
      icon: () => <div className="h-4 w-4">🏠</div>,
      label: "Home",
      href: "/"
    },
    {
      id: "projects",
      icon: () => <div className="h-4 w-4">💼</div>,
      label: "Projects",
      href: "/projects"
    },
    {
      id: "profile",
      icon: () => <div className="h-4 w-4">👤</div>,
      label: "Profile",
      href: "/profile"
    }
  ];

  return (
    <div className={twMerge("flex min-h-screen bg-background", className)} style={{ position: "relative" }}>
      {/* Aurora Background (full backdrop) */}
      <AuroraBackground className="pointer-events-none" />
      
      {/* Constellation Rail (replaces sidebar) */}
      <ConstellationRail
        nodes={constellationNodes.map(node => ({
          ...node,
          isActive: node.id === activeNode
        }))}
        onNodeSelect={(nodeId) => {
          setActiveNode(nodeId);
          // In a real app, this would navigate to the appropriate route
        }}
        className="hidden md:block" /* Hidden on mobile, shown on desktop */
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Status Ribbon (at top of main content) */}
        <StatusRibbon className="flex-shrink-0">
          {/* Status content would go here */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-success rounded-full" title="Connected" />
            <span className="text-xs">Ready</span>
          </div>
        </StatusRibbon>
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
        
        {/* Dock (at bottom) */}
        <Dock items={dockItems} className="flex-shrink-0" />
      </div>
      
      {/* Mobile Constellation Rail (orbiting node) */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2">
        {/* Would implement the orbiting node for mobile */}
        <div className="relative">
          {/* Orbiting node */}
          <div className="w-10 h-10 flex items-center justify-center bg-popover/80 backdrop-blur-lg 
                    border border-border/20 rounded-full hover:bg-popover/90 transition-all 
                    shadow-lg" 
              onClick={() => setShowCommandPalette(true)}
              title="Menu">
            {/* Icon would go here */}
            <div className="text-foreground">☰</div>
          </div>
          
          {/* Expanded view when clicked */}
          {showCommandPalette && (
            <div className="absolute bottom-[60px] left-1/2 -translate-x-1/2 w-80 bg-popover/90 
                      backdrop-blur-lg border border-border/20 rounded-xl p-4 space-y-3 
                      z-50 shadow-xl transform scale-95 opacity-0 animate-[scale-up_0.2s_ease-out]">
              {/* Would show constellation nodes in a grid or list */}
              <div className="space-y-2">
                {constellationNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md 
                              ${activeNode === node.id ? "bg-primary/20" : "hover:bg-foreground/5"}`}
                    onClick={() => {
                      setActiveNode(node.id);
                      setShowCommandPalette(false);
                    }}
                  >
                    <div className="flex-shrink-0">
                      <node.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{node.label}</div>
                      {node.description && (
                        <div className="text-xs text-muted-foreground">{node.description}</div>
                      )}
                    </div>
                    {activeNode === node.id && (
                      <div className="text-xs text-success">●</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Command Palette (would be triggered by Cmd/Ctrl+K) */}
      {showCommandPalette && <CommandPalette />}
    </div>
  );
};