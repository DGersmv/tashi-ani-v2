"use client";
import React from "react";
import { motion } from "framer-motion";
import OpenGlobusViewer from "./OpenGlobusViewer";
import { useViewMode } from "@/components/ui/ViewMode";
import { useLoginFlow } from "@/components/ui/LoginFlowContext";

export default function GlassMapPanel({ enteredHome = false, forceHidden = false }: { enteredHome?: boolean; forceHidden?: boolean }) {
  const { setMode } = useViewMode();
  const { loginRequested } = useLoginFlow();
  const pad = 5;
  const isHiding = loginRequested || forceHidden;
  const isRevealing = !loginRequested && !forceHidden;

  return (
    <div className="mapWrapper">
      {/* Та же анимация, что при закрытии панели входа: появление справа; при входе — улетание вправо */}
      <motion.div
        initial={enteredHome ? { x: "120%", opacity: 0 } : false}
        animate={{
          x: isHiding ? "120%" : 0,
          opacity: isHiding ? 0 : 1,
        }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: "100%",
          height: "100%",
          willChange: isHiding || isRevealing ? "transform, opacity" : "auto",
        }}
      >
      {/* Анимация появления без вертикального сдвига */}
      <motion.div
        className="gpu"                              // ← промоут в композитный слой
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.44, 0.13, 0.35, 1.08] }}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          // Скругление самой «стеклянной» панели карты
          borderRadius: 12,
          overflow: "hidden",
          pointerEvents: "auto",
          willChange: "opacity, transform",         // ← подсказка композитору
        }}
      >
        <motion.div
          className="group cursor-default gpu"      // ← композитный слой для hover
          
          // ВАЖНО: filter убрали (дорогие репейнты). Оставляем только transform/opacity.
          whileHover={{ y: -6, scale: 1.015 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          style={{
            position: "absolute",
            inset: pad,
            borderRadius: "inherit",
            overflow: "hidden",
            background: "rgba(250, 247, 242, 0.15)",
            backdropFilter: "blur(32px)",            // статичный blur ок; не анимируем
            border: "2.5px solid rgba(201, 169, 110,  0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            willChange: "transform, opacity",
            contain: "paint",                        // ограничим область перерисовки
          }}
        >
          {/* Контент карты */}
          <motion.div
            className="gpu"
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              // Внутренняя область карты повторяет тот же радиус
              borderRadius: 12,
              overflow: "hidden",
              opacity: 0.7,
            }}
            whileHover={{ opacity: 1 }}             // делаем прозрачноcть через Framer (дёшево)
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <OpenGlobusViewer />
          </motion.div>
        </motion.div>
      </motion.div>
      </motion.div>

      <style jsx>{`
        .mapWrapper {
          /* Вписываемся в контейнер — не вылезаем за экран, левая часть не срезается */
          width: 100%;
          max-width: 100%;
          aspect-ratio: 21 / 10;
          border-radius: 12px;
          margin: 0 auto;
          min-width: 0;
        }
        @media (min-width: 1024px) {
          .mapWrapper {
            width: 100%;
            max-width: 100%;
            aspect-ratio: 21 / 10;
            border-radius: 12px;
            margin: 0;
            z-index: 10;
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}
