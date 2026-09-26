import { DeckShell } from "../../components/deck/shell";
import { LucideIcon } from "lucide-react";
import { Home, Users, Settings, Code, BarChart2, Zap, Moon, Sun, Search } from "lucide-react";
import { ScrollReveal } from "../../components/animation/scroll-reveal";

export const metadata = {
  title: "Test Page",
  description: "Test page for Obsidian token layer and Deck shell",
};

const constellationNodes = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "home",
    description: "Overview of your projects",
    isActive: true,
  },
  {
    id: "projects",
    label: "Projects",
    icon: "users",
    description: "Manage your projects",
  },
  {
    id: "editor",
    label: "Editor",
    icon: "code",
    description: "Code editor",
    children: [
      { id: "editor-new", label: "New File", icon: "zap" },
      { id: "editor-open", label: "Open File", icon: "search" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "bar-chart-2",
    description: "View statistics",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    description: "Application settings",
  },
];

export default function TestPage() {
  return (
    <DeckShell constellationNodes={constellationNodes}>
      <div className="space-y-8">
        <div className="p-6 bg-card text-card-foreground rounded-lg border border-border">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Welcome to Nexora Obsidian
          </h1>
          <p className="text-muted-foreground">
            This is a test of the Obsidian design system with Deck shell components.
          </p>
        </div>
        
        {/* Scroll Reveal Demo */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Scroll Reveal Demonstrations
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ScrollReveal delay={0.1} distance="30px" origin="bottom">
              <div className="p-6 bg-card text-card-foreground rounded-lg border border-border hover:bg-primary/5 transition-colors">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Fade Up Reveal
                </h3>
                <p className="text-muted-foreground">
                  This element fades in and slides up as you scroll.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.2} distance="30px" origin="right">
              <div className="p-6 bg-card text-card-foreground rounded-lg border border-border hover:bg-primary/5 transition-colors">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Slide From Right
                </h3>
                <p className="text-muted-foreground">
                  This element slides in from the right as you scroll.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.3} distance="30px" origin="left">
              <div className="p-6 bg-card text-card-foreground rounded-lg border border-border hover:bg-primary/5 transition-colors">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Slide From Left
                </h3>
                <p className="text-muted-foreground">
                  This element slides in from the left as you scroll.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.4} distance="30px" origin="top">
              <div className="p-6 bg-card text-card-foreground rounded-lg border border-border hover:bg-primary/5 transition-colors">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Slide Down Reveal
                </h3>
                <p className="text-muted-foreground">
                  This element slides down as you scroll.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
        
        {/* Glass Surface Demo */}
        <div className="glass-surface p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Glass Surface
          </h2>
          <div className="reading-zone p-4 bg-background text-foreground rounded-lg">
            <p className="text-foreground">
              This text is on an opaque reading zone inside the glass surface.
            </p>
          </div>
        </div>
        
        {/* Grid Demo */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-card text-card-foreground rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Card Component
            </h2>
            <p className="text-muted-foreground">
              This is a test card using semantic tokens.
            </p>
          </div>
          
          <div className="p-6 bg-card text-card-foreground rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Another Card
            </h2>
            <p className="text-muted-foreground">
              More content here to test the layout.
            </p>
          </div>
          
          <div className="p-6 bg-card text-card-foreground rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Third Card
            </h2>
            <p className="text-muted-foreground">
              Another test card for the grid layout.
            </p>
          </div>
        </div>
      </div>
    </DeckShell>
  );
}