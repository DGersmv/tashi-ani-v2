"use client";

import React, { useEffect, useState } from "react";
import FullPageScroll from "@/components/FullPageScroll";
import HeroSlide from "@/components/slides/HeroSlide";
import AboutSlide from "@/components/slides/AboutSlide";
import PrinciplesSlide from "@/components/slides/PrinciplesSlide";
import ServicesSlide from "@/components/slides/ServicesSlide";
import PortfolioSlide from "@/components/slides/PortfolioSlide";
import CabinetSlide from "@/components/slides/CabinetSlide";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="fullpage-root" style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}>
      {mounted ? (
        <FullPageScroll>
          <HeroSlide index={0} />
          <AboutSlide index={1} />
          <PrinciplesSlide index={2} />
          <ServicesSlide index={3} />
          <PortfolioSlide index={4} />
          <CabinetSlide index={5} />
        </FullPageScroll>
      ) : (
        <div style={{ width: "100%", height: "100%", background: "var(--ink)" }} aria-hidden />
      )}
    </main>
  );
}
