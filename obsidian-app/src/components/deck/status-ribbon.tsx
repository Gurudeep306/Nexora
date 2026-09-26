import { twMerge } from "tailwind-merge";

interface StatusRibbonProps {
  className?: string;
  children: React.ReactNode;
}

export const StatusRibbon = ({ 
  className = "", 
  children 
}: StatusRibbonProps) => {
  return (
    <div
      className={twMerge(
        "flex h-10 items-center px-4 justify-between",
        "bg-popover/80 backdrop-blur-lg",
        "border-t border-border/20",
        "text-sm text-muted-foreground",
        className
      )}
    >
      <div className="flex items-center gap-3">{/* Left side */}</div>
      <div className="flex items-center gap-3">{children}</div>
      <div className="flex items-center gap-3">{/* Right side */}</div>
    </div>
  );
};