import { useEffect, useState } from "react";

export interface ChartColors {
  primary: string;
  bright: string;
  cyan: string;
  accent: string;
  success: string;
  warning: string;
  info: string;
  gold: string;
  streak: string;
  border: string;
  dim: string;
  faint: string;
  surface: string;
  background: string;
}

const FALLBACK: ChartColors = {
  primary: "#7c3aed",
  bright: "#a78bfa",
  cyan: "#22d3ee",
  accent: "#f43f5e",
  success: "#34d399",
  warning: "#fbbf24",
  info: "#38bdf8",
  gold: "#facc15",
  streak: "#fb923c",
  border: "#2e2e52",
  dim: "#94a3b8",
  faint: "#64748b",
  surface: "#16162e",
  background: "#0f0f23",
};

/** Resolve design-token colors at runtime so charts never hardcode hex values. */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(FALLBACK);
  useEffect(() => {
    // Re-read whenever the look changes (appearance, accent, wallpaper), so
    // charts recolour live instead of keeping the colours they mounted with.
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const get = (name: string, fb: string) =>
        s.getPropertyValue(name).trim() || fb;
      setColors({
        primary: get("--color-primary", FALLBACK.primary),
        bright: get("--color-primary-bright", FALLBACK.bright),
        cyan: get("--color-cyan", FALLBACK.cyan),
        accent: get("--color-accent", FALLBACK.accent),
        success: get("--color-success", FALLBACK.success),
        warning: get("--color-warning", FALLBACK.warning),
        info: get("--color-info", FALLBACK.info),
        gold: get("--color-gold", FALLBACK.gold),
        streak: get("--color-streak", FALLBACK.streak),
        border: get("--color-border", FALLBACK.border),
        dim: get("--color-foreground-dim", FALLBACK.dim),
        faint: get("--color-foreground-faint", FALLBACK.faint),
        surface: get("--color-surface", FALLBACK.surface),
        background: get("--color-background", FALLBACK.background),
      });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "class",
        "data-theme",
        "data-accent",
        "data-wall",
        "data-wall-tone",
        "data-glass",
        "style",
      ],
    });
    return () => mo.disconnect();
  }, []);
  return colors;
}

/** Categorical neon palette for donuts/bars, derived from tokens. */
export function seriesPalette(c: ChartColors): string[] {
  return [
    c.bright,
    c.cyan,
    c.accent,
    c.success,
    c.warning,
    c.info,
    c.gold,
    c.streak,
    c.primary,
  ];
}
