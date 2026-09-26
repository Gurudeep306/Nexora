import { ReactNode } from "react";

interface CardProps {
  className?: string;
  children: ReactNode;
}

export const Card = ({ className, children }: CardProps) => {
  return (
    <div
      className={twMerge(
        "bg-card text-card-foreground rounded-lg border border-border",
        className
      )}
    >
      {children}
    </div>
  );
};

// We need to import twMerge
import { twMerge } from "tailwind-merge";