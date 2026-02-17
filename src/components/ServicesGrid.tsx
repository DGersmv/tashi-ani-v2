"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

type Service = { id: string; title: string; subtitle?: string };
type GalleryItem = { file: string; type: "image" | "video"; captionRu?: string; captionEn?: string };
type Project = { name: string; items: GalleryItem[] };

const DEFAULT_SERVICES: Service[] = [
  { id: "s1", title: "Проектирование" },
  { id: "s2", title: "Визуализация" },
  { id: "s3", title: "Реализация" },
  { id: "s4", title: "Сопровождение" },
];

function normalizeSrc(src: string) {
  return src.startsWith("/") ? src : `/${src.replace(/^\.?\//, "")}`;
}

export default function ServicesGrid({ services = DEFAULT_SERVICES }: { services?: Service[] }) {
  const items = services.slice(0, 4);
  const [projects, setProjects] = useState<Project[]>([]);
  const [openProjectTitle, setOpenProjectTitle] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    fetch("/api/services/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!c && Array.isArray(d.projects)) setProjects(d.projects);
      })
      .catch(() => {});
    return () => { c = true; };
  }, []);

  const getProjectByTitle = (title: string) => projects.find((p) => p.name === title) ?? { name: title, items: [] };

  return (
    <section className="mt-40 md:mt-44" style={{ pointerEvents: "auto" }}>
      <div className="mx-auto max-w-screen-2xl px-4 md:px-6" style={{ pointerEvents: "auto" }}>
        <div className="servicesGrid" style={{ pointerEvents: "auto" }}>
          {items.map((svc, idx) => {
            const project = getProjectByTitle(svc.title);
            const firstImage = project.items.find((i) => i.type === "image");
            const coverFile = firstImage?.file ?? (project.items[0]?.type === "video" ? project.items[0].file : undefined);
            return (
              <div
                key={svc.id}
                className={`svc svc--${idx + 1}`}
                onClick={() => setOpenProjectTitle(svc.title)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenProjectTitle(svc.title);
                  }
                }}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
              >
                <ServiceCard
                  project={project}
                  title={svc.title}
                  subtitle={svc.subtitle}
                  itemCount={project.items.length}
                  coverFile={coverFile}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Модалка галереи — один раз в родителе, открывается по клику на div выше */}
      {openProjectTitle !== null && (
        <ServicesGalleryModal
          project={getProjectByTitle(openProjectTitle)}
          onClose={() => setOpenProjectTitle(null)}
        />
      )}

      <style jsx>{`
        .servicesGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }
        .svc {
          min-width: 0;
        }
        .svc-card {
          cursor: pointer !important;
        }
        .svc-card-title {
          font-weight: 800;
          line-height: 1.2;
          margin: 0;
          font-size: 0.82rem;
          max-width: 100%;
        }
        .svc-card-subtitle {
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.75rem;
          max-width: 100%;
        }
        @media (min-width: 640px) {
          .servicesGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }
          .svc { grid-column: auto / span 1; }
        }
        @media (min-width: 1024px) {
          .servicesGrid {
            grid-template-columns: repeat(13, minmax(0, 1fr));
            column-gap: 0;
            row-gap: 0;
          }
          .svc { grid-row: 1; }
          .svc--1 { grid-column: 2 / span 2; }
          .svc--2 { grid-column: 5 / span 2; }
          .svc--3 { grid-column: 8 / span 2; }
          .svc--4 { grid-column: 11 / span 2; }
        }
      `}</style>
      <style jsx global>{`
        .servicesGalleryOverlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.9);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; overflow: auto;
        }
        .servicesGalleryModal {
          background: rgba(30,30,35,0.98);
          border-radius: 16px;
          border: 1px solid rgba(211,163,115,0.4);
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow: auto;
        }
        .servicesGalleryHeader {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .servicesGalleryClose {
          background: rgba(0,0,0,0.5); color: white; border: none;
          width: 36px; height: 36px; border-radius: 50%;
          font-size: 20px; cursor: pointer; line-height: 1;
        }
        .servicesGalleryGrid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px; padding: 20px;
        }
        .servicesGalleryThumb {
          aspect-ratio: 1; border-radius: 12px; overflow: hidden;
          border: 2px solid rgba(211,163,115,0.4);
          padding: 0; cursor: pointer; background: #222;
        }
        .servicesGalleryThumb img,
        .servicesGalleryThumb video {
          width: 100%; height: 100%; object-fit: cover;
        }
        .servicesGalleryLightbox {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.95);
          display: flex; align-items: center; justify-content: center;
        }
        .servicesMedia {
          max-width: 92vw; max-height: 90vh;
          object-fit: contain; border-radius: 16px;
        }
        .servicesNav {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: rgba(0,0,0,0.5); color: white; border: none;
          border-radius: 999px; font-size: 28px; padding: 8px 14px;
          cursor: pointer;
        }
        .servicesNav.left { left: 16px; }
        .servicesNav.right { right: 16px; }
        .servicesGalleryCloseLightbox {
          position: absolute; top: 16px; right: 16px;
          background: rgba(0,0,0,0.5); color: white; border: none;
          width: 40px; height: 40px; border-radius: 50%;
          font-size: 22px; cursor: pointer;
        }
      `}</style>
    </section>
  );
}

/** Только визуал карточки; клик обрабатывает родительский div в сетке */
function ServiceCard({
  project,
  title,
  subtitle,
  itemCount,
  coverFile,
}: {
  project: Project;
  title: string;
  subtitle?: string;
  itemCount: number;
  coverFile?: string;
}) {
  const coverSrc = coverFile ? normalizeSrc(coverFile) : undefined;
  return (
    <div className="w-full" style={{ position: "relative", pointerEvents: "none" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.44, 0.13, 0.35, 1.08] }}
        style={{ position: "relative", width: "100%", borderRadius: 16 }}
      >
        <motion.div
          whileHover={{ y: -6, scale: 1.015, filter: "saturate(1.06)" }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1.41",
            borderRadius: 16,
          }}
        >
          <div
            className="group svc-card"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 16,
              overflow: "hidden",
              background: coverSrc ? undefined : "rgba(255,255,255,0.15)",
              backdropFilter: "blur(28px)",
              border: "2.5px solid rgba(211,163,115,0.6)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "stretch",
            }}
          >
            {coverSrc && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${coverSrc})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "saturate(1.05) brightness(0.85)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.2))",
                  }}
                />
              </>
            )}
            <div
              className="svc-card-inner"
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                minWidth: 0,
                maxWidth: "100%",
                padding: "14px 12px",
                color: "white",
                display: "grid",
                gap: 8,
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              <h3 className="svc-card-title" style={{ fontSize: "0.82rem", maxWidth: "100%", fontFamily: "var(--font-heading, ChinaCyr), sans-serif" }}>{title}</h3>
              {subtitle ? (
                <p className="svc-card-subtitle" style={{ fontSize: "0.75rem" }}>{subtitle}</p>
              ) : null}
              {itemCount > 0 && (
                <span style={{ fontSize: "0.7rem", opacity: 0.9 }}>Фото: {itemCount}</span>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Модалка галереи — рендер в портале, состояние внутри */
function ServicesGalleryModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const galleryItems = project.items ?? [];
  const currentItem = galleryItems[lightboxIdx];

  useEffect(() => {
    setLightboxIdx(0);
    setLightboxOpen(false);
  }, [project.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setLightboxIdx((k) => (k - 1 + galleryItems.length) % galleryItems.length);
      if (e.key === "ArrowRight") setLightboxIdx((k) => (k + 1) % galleryItems.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, galleryItems.length]);

  const overlay = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="servicesGalleryOverlay"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div className="servicesGalleryModal" onClick={(e) => e.stopPropagation()}>
          <div className="servicesGalleryHeader">
            <h2 style={{ fontFamily: "var(--font-heading, ChinaCyr), sans-serif", margin: 0, color: "white" }}>{project.name}</h2>
            <button type="button" className="servicesGalleryClose" aria-label="Закрыть" onClick={onClose}>✕</button>
          </div>
          {galleryItems.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.7)", padding: 24 }}>
              В этом разделе пока нет фото.
            </p>
          ) : (
            <>
              <div className="servicesGalleryGrid">
                {galleryItems.map((item, i) => (
                  <button
                    key={item.file}
                    type="button"
                    className="servicesGalleryThumb"
                    onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }}
                  >
                    {item.type === "video" ? (
                      <video src={normalizeSrc(item.file)} muted />
                    ) : (
                      <img src={normalizeSrc(item.file)} alt={item.captionRu || ""} />
                    )}
                  </button>
                ))}
              </div>
              {lightboxOpen && (
                <div className="servicesGalleryLightbox" onClick={() => setLightboxOpen(false)}>
                  <button type="button" className="servicesNav left" aria-label="Предыдущее" onClick={(e) => { e.stopPropagation(); setLightboxIdx((k) => (k - 1 + galleryItems.length) % galleryItems.length); }}>⟨</button>
                  {currentItem?.type === "video" ? (
                    <video src={normalizeSrc(currentItem.file)} className="servicesMedia" controls autoPlay loop playsInline onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <img src={normalizeSrc(currentItem?.file ?? "")} alt="" className="servicesMedia" onClick={(e) => e.stopPropagation()} />
                  )}
                  <button type="button" className="servicesNav right" aria-label="Следующее" onClick={(e) => { e.stopPropagation(); setLightboxIdx((k) => (k + 1) % galleryItems.length); }}>⟩</button>
                  <button type="button" className="servicesGalleryClose servicesGalleryCloseLightbox" aria-label="Закрыть" onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}>✕</button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
