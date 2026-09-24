"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import AppMockup from "./AppMockup";
import Silk from "./reactbits/Silk";
import { IconCheck, IconPlay } from "./icons";

/**
 * Isometric "app in orbit" showcase.
 * The product window rests at a subtle 3D angle and parallaxes to the cursor;
 * a few real UI chips detach and float in front of it (translateZ depth).
 * Falls back to a flat, static window on touch / small / reduced-motion.
 */
export default function HeroShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Scroll progress across the stage: 0 when it enters the viewport bottom,
  // 1 once it has scrolled past the top. Drives the "flip".
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Cursor delta (small) + scroll flip (large) combine into one rotateX.
  // As you scroll down, the card flips forward from +11° through the flat
  // resting angle and keeps tipping — the flip tracks the scroll position.
  const cursorX = useTransform(my, [-0.5, 0.5], [11, 1]);
  const scrollFlip = useTransform(scrollYProgress, [0, 0.5, 1], [24, 0, -34]);
  const rotateX = useSpring(
    useTransform([cursorX, scrollFlip], ([c, s]: number[]) => c + s),
    { stiffness: 120, damping: 20 },
  );
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 4]), {
    stiffness: 120,
    damping: 20,
  });

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setTilt(wide.matches && !noMotion.matches);
    update();
    wide.addEventListener("change", update);
    noMotion.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      noMotion.removeEventListener("change", update);
    };
  }, []);

  const onMove = (e: React.MouseEvent) => {
    if (!tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative mx-auto mt-14 max-w-[1080px] px-4 sm:mt-16 lg:[perspective:2000px]"
    >
      {/* Silk glow pooling under the stage (React Bits · WebGL) */}
      <div className="pointer-events-none absolute -inset-x-24 -inset-y-16 -z-10 [mask-image:radial-gradient(58%_60%_at_50%_45%,#000,transparent_80%)]">
        <Silk
          color="#5B8DEF"
          speed={4}
          scale={1.5}
          rotation={0.35}
          noiseIntensity={1.1}
          className="opacity-[0.13] dark:opacity-[0.32]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 64 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
        style={
          tilt
            ? { rotateX, rotateY, transformStyle: "preserve-3d" }
            : undefined
        }
        className="relative will-change-transform"
      >
        <div className="overflow-hidden rounded-[22px] shadow-[0_40px_90px_-30px_rgba(22,22,15,0.35)] ring-1 ring-black/5 dark:ring-white/10">
          <AppMockup />
        </div>

        {tilt && (
          <>
            {/* active focus session detaching from the board */}
            <FloatChip className="-left-10 top-[20%]" z={90} delay={1.0}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#2B6BF5] text-white">
                  <IconPlay className="h-3.5 w-3.5" />
                </span>
                <div className="text-left">
                  <div className="text-[12px] font-semibold text-ink">
                    Write launch post
                  </div>
                  <div className="mono text-[11px] font-bold tracking-tight text-[#2B6BF5]">
                    14:51 focus
                  </div>
                </div>
              </div>
            </FloatChip>

            {/* completed task */}
            <FloatChip className="-right-8 top-[12%]" z={70} delay={1.2}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#10C49A] text-white">
                  <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-[12px] font-semibold text-ink">
                  Ship onboarding
                </span>
                <span className="mono text-[11px] font-semibold text-ink-faint">
                  38m
                </span>
              </div>
            </FloatChip>

            {/* end-of-day insight */}
            <FloatChip className="-right-6 bottom-[10%]" z={110} delay={1.4}>
              <div className="text-left">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  Focus today
                </div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="mono text-[17px] font-semibold text-ink">
                    3h 12m
                  </span>
                  <span className="flex items-end gap-[3px]">
                    {[8, 14, 6, 18, 11, 16].map((h, i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-[#2B6BF5]/70"
                        style={{ height: h }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </FloatChip>
          </>
        )}
      </motion.div>
    </div>
  );
}

function FloatChip({
  children,
  className = "",
  z = 60,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  z?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay },
      }}
      style={{ transform: `translateZ(${z}px)` }}
      className={`absolute z-10 rounded-[14px] border border-line bg-surface/90 px-3.5 py-2.5 shadow-lift backdrop-blur-md ${className}`}
    >
      {children}
    </motion.div>
  );
}
