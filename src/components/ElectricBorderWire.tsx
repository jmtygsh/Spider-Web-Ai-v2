"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type FlowDirection = 1 | -1;

interface ElectricBorderWireProps {
  side: "left" | "right";
  bulbCount?: number;
  className?: string;
}

function ElectricBulb({ isActive }: { isActive: boolean }) {
  return (
    <div className="relative flex h-1.5 w-1.5 items-center justify-center">
      <motion.div
        className="border-border/60 bg-background absolute h-1.5 w-1.5 rounded-full border"
        animate={{
          scale: isActive ? 1.3 : 1,
          backgroundColor: isActive ? "var(--primary)" : "var(--background)",
          borderColor: isActive ? "var(--primary)" : "var(--border)",
          boxShadow: isActive
            ? "0 0 6px 2px color-mix(in oklch, var(--primary) 75%, transparent), 0 0 14px 4px color-mix(in oklch, var(--primary) 40%, transparent)"
            : "0 0 0 0 transparent",
        }}
        transition={{ duration: 0.08, ease: "easeOut" }}
      />
      {isActive ? (
        <motion.span
          className="bg-primary absolute h-1.5 w-1.5 rounded-full"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      ) : null}
    </div>
  );
}

export function ElectricBorderWire({
  side,
  bulbCount = 9,
  className,
}: ElectricBorderWireProps) {
  const pulsePosition = useMotionValue(-8);
  const [activeBulb, setActiveBulb] = useState<number | null>(null);
  const [flowDirection, setFlowDirection] = useState<FlowDirection>(1);
  const [isFlowing, setIsFlowing] = useState(false);
  const mountedRef = useRef(true);

  const bulbPositions = useMemo(
    () =>
      Array.from({ length: bulbCount }, (_, index) =>
        bulbCount === 1 ? 50 : (index / (bulbCount - 1)) * 100,
      ),
    [bulbCount],
  );

  const pulseTop = useTransform(pulsePosition, (value) => `${value}%`);

  const runElectricFlow = useCallback(async () => {
    const direction: FlowDirection = Math.random() > 0.5 ? 1 : -1;
    const from = direction === 1 ? -8 : 108;
    const to = direction === 1 ? 108 : -8;
    const duration = 1.6 + Math.random() * 2.4;

    setFlowDirection(direction);
    setIsFlowing(true);

    await animate(pulsePosition, [from, to], {
      duration,
      ease: [0.45, 0.05, 0.25, 1],
      onUpdate: (value) => {
        const threshold = 5.5;
        let closest: number | null = null;
        let closestDistance = threshold;

        bulbPositions.forEach((position, index) => {
          const distance = Math.abs(position - value);
          if (distance < closestDistance) {
            closestDistance = distance;
            closest = index;
          }
        });

        setActiveBulb(closest);
      },
    });

    setActiveBulb(null);
    setIsFlowing(false);
  }, [bulbPositions, pulsePosition]);

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextFlow = () => {
      const delay = 600 + Math.random() * 2200;
      timeoutId = setTimeout(async () => {
        if (!mountedRef.current) return;
        await runElectricFlow();
        if (mountedRef.current) scheduleNextFlow();
      }, delay);
    };

    timeoutId = setTimeout(
      async () => {
        if (!mountedRef.current) return;
        await runElectricFlow();
        if (mountedRef.current) scheduleNextFlow();
      },
      400 + Math.random() * 900,
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [runElectricFlow]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 z-20 w-4",
        side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
        className,
      )}
      aria-hidden
    >
      {/* Wire backbone */}
      <div className="bg-border/50 absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      <div className="via-border/30 absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-transparent" />

      {/* Traveling current — water-like single pulse */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: pulseTop }}
        animate={{ opacity: isFlowing ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="relative -translate-y-1/2">
          <div
            className={cn(
              "via-primary/80 absolute left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-transparent",
              flowDirection === 1 ? "top-0 h-14" : "bottom-0 h-14 rotate-180",
            )}
          />
          <div
            className={cn(
              "bg-primary/25 absolute left-1/2 h-10 w-3 -translate-x-1/2 rounded-full blur-md",
              flowDirection === 1 ? "-top-3" : "-bottom-3",
            )}
          />
          <motion.div
            className="bg-primary h-2.5 w-2.5 rounded-full"
            animate={{
              boxShadow: [
                "0 0 8px 2px color-mix(in oklch, var(--primary) 80%, transparent)",
                "0 0 16px 6px color-mix(in oklch, var(--primary) 50%, transparent)",
                "0 0 8px 2px color-mix(in oklch, var(--primary) 80%, transparent)",
              ],
            }}
            transition={{ duration: 0.35, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Bulbs mounted on the wire */}
      {bulbPositions.map((position, index) => (
        <div
          key={index}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ top: `${position}%` }}
        >
          <ElectricBulb isActive={activeBulb === index} />
        </div>
      ))}
    </div>
  );
}

interface ElectricBorderFrameProps {
  children: React.ReactNode;
  className?: string;
  bulbCount?: number;
}

export function ElectricBorderFrame({
  children,
  className,
  bulbCount = 9,
}: ElectricBorderFrameProps) {
  return (
    <div className={cn("relative", className)}>
      <ElectricBorderWire side="left" bulbCount={bulbCount} />
      <ElectricBorderWire side="right" bulbCount={bulbCount} />
      {children}
    </div>
  );
}
