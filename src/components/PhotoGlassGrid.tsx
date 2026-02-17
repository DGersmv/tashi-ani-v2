// src/components/PhotoGlassGrid.tsx
"use client";

import React, { useEffect, useState } from "react";
import PhotoGlassPanel from "./PhotoGlassPanel";

type Item = { file: string; type: "image" | "video"; captionRu?: string; captionEn?: string };
type Project = { name: string; description?: string; items: Item[] };

export default function PhotoGlassGrid({ projects: initial }: { projects?: Project[] }) {
  const [projects, setProjects] = useState<Project[] | null>(initial ?? null);

  useEffect(() => {
    if (initial) return;
    let c = false;
    (async () => {
      try {
        const r = await fetch("/api/portfolio/projects", { cache: "no-store" });
        const j = await r.json();
        if (!c) setProjects(Array.isArray(j.projects) ? j.projects : []);
      } catch {
        if (!c) setProjects([]);
      }
    })();
    return () => { c = true; };
  }, [initial]);

  if (!projects) {
    return (
      <section className="mt-40 md:mt-44">
        <div className="mx-auto max-w-screen-2xl px-4 md:px-6">
          <div className="w-full h-[200px] rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl grid place-items-center">
            <div className="w-10 h-10 border-4 border-t-transparent border-white rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (!projects.length) {
    return (
      <section className="mt-40 md:mt-44">
        <div className="mx-auto max-w-screen-2xl px-4 md:px-6 text-gray-300">
          Нет проектов в /public/portfolio.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-40 md:mt-44">
      <div className="mx-auto max-w-screen-2xl px-4 md:px-6">
        <div className="portfolioGrid">
          {projects.map((p, idx) => (
            <div key={p.name} className={`portfolio-item portfolio-item--${idx + 1}`}>
              <PhotoGlassPanel project={p} />
            </div>
          ))}
        </div>

        <style jsx>{`
          .portfolioGrid {
            display: grid;
            grid-template-columns: 1fr; /* мобильные: одна колонка */
            gap: 16px;
            align-items: start;
          }
          @media (min-width: 640px) { /* узкие экраны: по 2 панели */
            .portfolioGrid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 16px;
            }
            .portfolio-item { grid-column: auto / span 1; }
          }
          @media (min-width: 1024px) { /* широкие экраны: 13 колонок, 2 панели по 5 колонок с отступами */
            .portfolioGrid {
              grid-template-columns: repeat(13, minmax(0, 1fr));
              column-gap: 0; /* зазоры формируем пустыми колонками */
              row-gap: 0;
            }
            .portfolio-item { grid-row: 1; }
            .portfolio-item--1 { grid-column: 2 / span 5; }
            .portfolio-item--2 { grid-column: 8 / span 5; }
          }
        `}</style>
      </div>
    </section>
  );
}
