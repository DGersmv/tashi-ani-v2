"use client";

import React from "react";
import { motion } from "framer-motion";

interface DashboardPanelProps {
  title: string;
  description?: string;
  icon?: string;
  onClick?: () => void;
  href?: string;
  status?: "active" | "inactive" | "pending";
  count?: number;
}

export default function DashboardPanel({ 
  title, 
  description, 
  icon, 
  onClick, 
  href,
  status = "active",
  count 
}: DashboardPanelProps) {
  const handleClick = () => {
    if (href) {
      window.location.href = href;
    } else if (onClick) {
      onClick();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "active": return "rgba(34, 197, 94, 0.8)"; // green
      case "inactive": return "rgba(239, 68, 68, 0.8)"; // red
      case "pending": return "rgba(251, 191, 36, 0.8)"; // yellow
      default: return "rgba(211, 163, 115, 0.8)"; // default gold
    }
  };

  return (
    <div className="panelWrapper">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.44, 0.13, 0.35, 1.08] }}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "inherit",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        <motion.div
          className="group"
          onClick={handleClick}
          whileHover={{ y: -6, scale: 1.015, filter: "saturate(1.06)" }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          style={{
            position: "absolute",
            inset: 5,
            borderRadius: "inherit",
            overflow: "hidden",
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(32px)",
            border: `2.5px solid ${getStatusColor()}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "stretch",
          }}
        >
          {/* Декоративный фон */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(135deg, 
                ${getStatusColor()}20, 
                ${getStatusColor()}05, 
                rgba(255,255,255,0.05)
              )`,
              filter: "saturate(105%) brightness(0.9)",
              transform: "scale(1)",
              transition: "transform .6s",
            }}
            className="group-hover:scale-[1.03]"
          />
          
          {/* Вуаль */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,.25))",
            }}
          />
          
          {/* Иконка */}
          {icon && (
            <div
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,.3)",
                borderRadius: "8px",
                color: "white",
                fontSize: "18px",
                zIndex: 3,
              }}
            >
              {icon}
            </div>
          )}
          
          {/* Содержимое */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              padding: "16px 18px",
              color: "white",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{ 
                fontWeight: 800, 
                fontSize: "1.1rem", 
                lineHeight: 1.2,
                fontFamily: "var(--font-heading, ChinaCyr), sans-serif"
              }}>
                {title}
              </h3>
              {count !== undefined && (
                <span
                  style={{
                    background: "rgba(0,0,0,.45)",
                    padding: "4px 8px",
                    borderRadius: 999,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    fontFamily: "Arial, sans-serif"
                  }}
                >
                  {count}
                </span>
              )}
            </div>
            
            {description && (
              <p style={{ 
                fontSize: 14, 
                color: "rgba(255,255,255,.9)",
                fontFamily: "Arial, sans-serif"
              }}>
                {description}
              </p>
            )}
            
            <div style={{ 
              justifySelf: "end", 
              opacity: .9, 
              fontSize: 14,
              fontFamily: "Arial, sans-serif"
            }}>
              {status === "active" ? "Нажмите, чтобы открыть →" : 
               status === "pending" ? "Ожидает активации" : 
               "Недоступно"}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <style jsx>{`
        .panelWrapper {
          width: 100%;
          border-radius: 1.2rem;
          aspect-ratio: 1.41 / 1;
        }
      `}</style>
    </div>
  );
}

