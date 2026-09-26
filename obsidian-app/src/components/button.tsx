import * as React from "react";
import * as ButtonPrimitive from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        destructive:
          "bg-error text-error-foreground hover:bg-error/80",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonVariantProps
  extends VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  className?: string;
}

// Create a simple Slot component for asChild functionality with proper typing
interface SlotProps extends React.PropsWithoutRef<React.HTMLAttributes<HTMLSpanElement>> {
  children?: React.ReactNode;
}
const Slot = React.forwardRef<HTMLSpanElement, SlotProps>(({ children, ...props }, ref) => (
  <span ref={ref} {...props}>
    {children}
  </span>
));
Slot.displayName = "Slot";

export const Button = React.forwardRef<
  HTMLElement, // From Button.d.ts: ForwardRefExoticComponent<Omit<ButtonProps, "ref"> & React.RefAttributes<HTMLElement>>
  ButtonVariantProps
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  // When asChild is true, we use our Slot component to pass props/ref to a child
  // When asChild is false, we use the ButtonPrimitive directly
  const Component = asChild ? (Slot as any) : (ButtonPrimitive as any);
  return (
    <Component
      ref={ref}
      className={twMerge(
        buttonVariants({ variant, size }),
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Slot };