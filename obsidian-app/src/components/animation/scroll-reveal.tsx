"use client";
import { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  // Animation configuration
  delay?: number; // Delay in seconds before starting animation
  duration?: number; // Duration of animation in seconds
  distance?: string; // Distance to move (e.g., "20px", "10%")
  origin?: "top" | "right" | "bottom" | "left"; // Origin of animation
  // Scroll-driven reveal options
  threshold?: number; // Visibility threshold (0-1) to trigger animation
  rootMargin?: string; // Margin for root element
  // Once the animation has played, should it reset when scrolled back up?
  reset?: boolean;
}

export const ScrollReveal = ({
  children,
  className = "",
  delay = 0,
  duration = 0.6,
  distance = "20px",
  origin = "bottom",
  threshold = 0.1,
  rootMargin = "0px",
  reset = false,
}: ScrollRevealProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Check if scroll-driven animations are supported (safe for SSR)
  const isScrollTimelineSupported = useRef(false);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      isScrollTimelineSupported.current = "scrollTimeline" in document.documentElement.style;
    }
  }, []);

  // Check if prefers-reduced-motion is enabled (safe for SSR)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;

    // If scroll-driven animations are not supported or reduced motion is enabled,
    // fall back to Intersection Observer
    if (!isScrollTimelineSupported.current || prefersReducedMotion) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          const shouldAnimate = entry.isIntersecting;
          
          if (shouldAnimate && (!reset || !hasAnimated)) {
            setIsVisible(true);
            setHasAnimated(true);
          } else if (!shouldAnimate && reset) {
            setIsVisible(false);
          }
        },
        {
          threshold,
          rootMargin,
        }
      );

      observer.observe(elementRef.current);
      return () => observer.disconnect();
    }

    // For browsers that support scroll-driven animations, we could implement
    // a more sophisticated solution using ScrollTimeline and AnimationTimeline
    // For now, we'll fall back to the Intersection Observer approach for consistency
    // since full scroll-driven animation support is still limited across browsers
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldAnimate = entry.isIntersecting;
        
        if (shouldAnimate && (!reset || !hasAnimated)) {
          setIsVisible(true);
          setHasAnimated(true);
        } else if (!shouldAnimate && reset) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [
    delay,
    distance,
    duration,
    origin,
    threshold,
    rootMargin,
    reset,
    isScrollTimelineSupported.current,
    prefersReducedMotion,
  ]);

  // Calculate transform based on origin and distance
  const getTransform = (): string => {
    const dist = parseFloat(distance);
    const unit = distance.replace(/[\d.-]+/, "");
    
    switch (origin) {
      case "top":
        return `translateY(${-dist}${unit})`;
      case "right":
        return `translateX(${dist}${unit})`;
      case "bottom":
        return `translateY(${dist}${unit})`;
      case "left":
        return `translateX(${-dist}${unit})`;
      default:
        return `translateY(${-dist}${unit})`;
    }
  };

  // Calculate transition
  const transition = `opacity ${duration}s ease${delay > 0 ? ` ${delay}s` : ""}, transform ${duration}s ease${delay > 0 ? ` ${delay}s` : ""}`;

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : getTransform(),
        transition: isVisible ? "none" : transition,
        // Will transition when isVisible changes
      }}
    >
      {children}
    </div>
  );
};

// Preset configurations for common reveal patterns
export const ScrollRevealPresets = {
  fade: {
    distance: "0px",
    origin: "bottom" as const,
  },
  slideUp: {
    distance: "20px",
    origin: "bottom" as const,
  },
  slideDown: {
    distance: "20px",
    origin: "top" as const,
  },
  slideLeft: {
    distance: "20px",
    origin: "right" as const,
  },
  slideRight: {
    distance: "20px",
    origin: "left" as const,
  },
  slideUpDelay: {
    distance: "20px",
    origin: "bottom" as const,
    delay: 0.2,
  },
};