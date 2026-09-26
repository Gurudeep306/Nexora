"use client";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "cmdk";
import { useState } from "react";
import { Search, ChevronDown, Terminal, Zap, Moon, Sun } from "lucide-react";

interface CommandPaletteProps {
  className?: string;
}

export const CommandPalette = ({ className = "" }: CommandPaletteProps) => {
  const [query, setQuery] = useState("");

  const commands = [
    {
      name: "Quick Find",
      description: "Search files and navigate",
      shortcut: "Cmd+K",
      icon: Search,
      group: "Navigation",
    },
    {
      name: "Terminal",
      description: "Open integrated terminal",
      shortcut: "Ctrl+`",
      icon: Terminal,
      group: "Development",
    },
    {
      name: "Dark Mode",
      description: "Toggle dark/light theme",
      shortcut: "Cmd+D",
      icon: query.includes("dark") ? Sun : Moon,
      group: "Appearance",
    },
    {
      name: "Settings",
      description: "Open settings panel",
      shortcut: "Cmd+,",
      icon: Zap,
      group: "System",
    },
    {
      name: "Help",
      description: "Open documentation and help",
      shortcut: "Cmd+?",
      icon: Search,
      group: "Support",
    },
  ];

  return (
     
      <Command className={`w-[24rem] max-w-full ${className}`}>
        <CommandGroup>
          <CommandInput placeholder="Search commands..." onValueChange=setQuery />
          <CommandList>
            {commands.length > 0 ? (
              commands
                .filter((cmd) =>
                  cmd.name.toLowerCase().includes(query.toLowerCase()) ||
                  cmd.description.toLowerCase().includes(query.toLowerCase())
                )
                .map((cmd) => (
                  <CommandItem key={cmd.name}>
                    <div className="flex items-center gap-3">
                      <cmd.icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{cmd.name}</span>
                          {cmd.shortcut && (
                            <span className="text-xs text-muted-foreground">
                              {cmd.shortcut}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {cmd.description}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))
            ) : (
              <CommandEmpty>No commands found</CommandEmpty>
            )}
          </CommandList>
        </CommandGroup>
      </Command>
     
  );
}