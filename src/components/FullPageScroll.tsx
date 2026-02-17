"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import SlideNav from "@/components/SlideNav";
import SiteNav from "@/components/SiteNav";

const easing = [0.77, 0, 0.18, 1] as const;
const duration = 0.9;

type FullPageScrollContextValue = {
  currentIndex: number;
  goTo: (n: number) => void;
  totalSlides: number;
};

const FullPageScrollContext = createContext<FullPageScrollContextValue | null>(
  null
);

export function useFullPageScroll() {
  const ctx = useContext(FullPageScrollContext);
  if (!ctx) throw new Error("useFullPageScroll must be used inside FullPageScroll");
  return ctx;
}

const slideTransition = {
  duration,
  ease: easing,
};

export default function FullPageScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const slides = React.Children.toArray(children);
  const totalSlides = slides.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastWheelRef = useRef(0);
  const touchStartY = useRef(0);

  const goTo = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(n, totalSlides - 1));
      setCurrentIndex(next);
    },
    [totalSlides]
  );

  // Колесо мыши, debounce 800ms
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelRef.current < 800) return;
      lastWheelRef.current = now;
      if (e.deltaY > 0) goTo(currentIndex + 1);
      else if (e.deltaY < 0) goTo(currentIndex - 1);
    },
    [currentIndex, goTo]
  );

  // Свайп на touch, минимум 40px
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const delta = touchStartY.current - endY;
      if (Math.abs(delta) >= 40) {
        if (delta > 0) goTo(currentIndex + 1);
        else goTo(currentIndex - 1);
      }
    },
    [currentIndex, goTo]
  );

  // Стрелки и PageUp/PageDown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          goTo(currentIndex + 1);
          break;
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          goTo(currentIndex - 1);
          break;
        default:
          break;
      }
    },
    [currentIndex, goTo]
  );

  const value: FullPageScrollContextValue = {
    currentIndex,
    goTo,
    totalSlides,
  };

  return (
    <FullPageScrollContext.Provider value={value}>
      <div
        className="fullpage-scroll"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          outline: "none",
        }}
      >
        <AnimatePresence initial={false} mode="wait">
          {slides.map(
            (slide, i) =>
              i === currentIndex && (
                <motion.div
                  key={i}
                  initial={{ y: "100vh", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100vh", opacity: 0 }}
                  transition={slideTransition}
                  style={{
                    position: "fixed",
                    inset: 0,
                    width: "100vw",
                    height: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {slide}
                </motion.div>
              )
          )}
        </AnimatePresence>
        <SiteNav />
        <SlideNav />
      </div>
    </FullPageScrollContext.Provider>
  );
}
