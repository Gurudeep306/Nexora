import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Variants } from "motion/react";

interface ViewTransitionProps {
  children: React.ReactNode;
  className?: string;
  // View transition configuration
  type?: string; // Type of transition for identification
  // Fallback motion properties (when view transitions not supported)
  initial?: Variants;
  animate?: Variants;
  exit?: Variants;
  // Custom fallback transition
  fallbackConfig?: {
    duration?: number;
    easing?: string;
  };
}

export const ViewTransition = ({
  children,
  className = "",
  type,
  initial = { opacity: 0, scale: 0.95 } as unknown as Variants,
  animate = { opacity: 1, scale: 1 } as unknown as Variants,
  exit = { opacity: 0, scale: 0.95 } as unknown as Variants,
  fallbackConfig = { duration: 0.3, easing: "easeOut" },
}: ViewTransitionProps) => {
  const [hasViewTransitionSupport, setHasViewTransitionSupport] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const locationRef = useRef<string>(window.location.pathname);

  // Check for view transition support
  useEffect(() => {
    // Check if the browser supports document.startViewTransition
    const supportsViewTransition =
      typeof document !== "undefined" &&
      "startViewTransition" in document;

    setHasViewTransitionSupport(supportsViewTransition);
  }, []);

  // Check for location changes to trigger transitions
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLocationChange = () => {
      const newLocation = window.location.pathname;
      if (newLocation !== locationRef.current) {
        locationRef.current = newLocation;
        // Trigger a view transition on location change
        // In a real app, this would be tied to route changes
      }
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // View transition wrapper function
  const startViewTransition = async (callback: () => Promise<void> | void) => {
    if (
      hasViewTransitionSupport &&
      typeof document !== "undefined" &&
      "startViewTransition" in document
    ) {
      // Use the native View Transition API
      return document.startViewTransition(() => {
        // The callback should update the DOM
        return callback();
      });
    } else {
      // Fallback to Motion crossfade
      // In a real implementation, this would trigger state changes
      // that AnimatePresence can respond to
      return callback();
    }
  };

  // For demonstration purposes, we'll simulate a state change that could trigger a transition
  // In a real app, this would be connected to actual route navigation or state changes
  const [trigger, setTrigger] = useState(0);

  // Expose a manual trigger for testing
  const manualTrigger = () => setTrigger((t) => t + 1);

  return (
    <div className={className} data-view-transition-type={type || ""}>
      {/* In a real implementation, the children would be wrapped based on state changes */}
      {/* For now, we'll show the concept with motion primitives */}
      <div
        data-view-transition-id={type || "default"}
        style={{
          // Add a slight delay to see the transition effect in development
          transition: hasViewTransitionSupport
            ? "none"
            : `opacity ${fallbackConfig.duration}s ${fallbackConfig.easing}`,
        }}
      >
        {children}
        {/* Manual trigger button for demonstration */}
        {!hasViewTransitionSupport && (
          <button
            onClick={manualTrigger}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/80 transition-colors"
            aria-label="Trigger view transition demo"
          >
            Trigger Transition (Fallback Demo)
          </button>
        )}
      </div>
    </div>
  );
}

// Helper hook for triggering view transitions in response to state changes
export const useViewTransition = () => {
  const [state, setState] = useState({});

  const startTransition = async (
    key: string,
    updater: (prevState: any) => any
  ) => {
    // In a real implementation with view transition support:
    // return document.startViewTransition(() => {
    //   setState(updater);
    // });

    // For now, fall back to immediate state update
    setState(updater);
    return Promise.resolve();
  };

  return [state, startTransition];
};