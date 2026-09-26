import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";

interface AuroraBackgroundProps {
  className?: string;
}

export const AuroraBackground = ({ className = "" }: AuroraBackgroundProps) => {
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check WebGL support and set up fallbacks
  useEffect(() => {
    // Check if WebGL is supported
    try {
      const canvas = document.createElement("canvas");
      setIsWebGLSupported(!!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch (e) {
      setIsWebGLSupported(false);
    }

    // Set up visibility change handler for performance
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Set up intersection observer for performance when off-screen
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fallback to CSS gradient if WebGL not supported or reduced motion
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!isWebGLSupported || prefersReducedMotion || !isVisible) {
    return (
      <div
        ref={containerRef}
        className={`
          fixed inset-0 z-[-1]
          bg-gradient-to-b from-indigo-950 via-violet-900 to-indigo-900
          ${className}
        `}
        aria-hidden="true"
      />
    );
  }

  return (
    <div ref={containerRef} className={`fixed inset-0 z-[-1] ${className}`} aria-hidden="true">
      <Canvas
        gl={{ antialias: false, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 5], fov: 35 }}
        style={{ height: "100%", width: "100%" }}
        // Performance: limit devicePixelRatio and frame rate
      >
        {/* Aurora shader implementation would go here */}
        {/* For now, we'll render a simple placeholder that demonstrates the concept */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        {/* Simple shader placeholder - in reality this would be a custom shader material */}
        <mesh>
          <sphereGeometry args={[3, 32, 32]} />
          <meshStandardMaterial
            color="#4f46e5"
            emissive="#7c3aed"
            emissiveIntensity={0.5}
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      </Canvas>
    </div>
  );
};