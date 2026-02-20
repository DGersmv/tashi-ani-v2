"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/components/ui/SiteSettingsContext";

interface ContactsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactsPanel({ isOpen, onClose }: ContactsPanelProps) {
  const settings = useSiteSettings();
  const whatsAppUrl = settings.contactWhatsApp ?? "https://wa.me/79219526117";
  const telegramUrl = settings.contactTelegram ?? "https://t.me/tashiani";
  const email = settings.contactEmail ?? "info@tashi-ani.ru";

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const linkStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    borderRadius: 12,
    background: "rgba(250, 247, 242, 0.08)",
    border: "1px solid rgba(211,163,115,0.4)",
    color: "white",
    textDecoration: "none",
    fontSize: "1rem",
    fontWeight: 600,
    fontFamily: "var(--font-menu, ChinaCyr), var(--font-montserrat), sans-serif",
    transition: "background 0.2s, border-color 0.2s",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.4,
            }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "400px",
              margin: "0 16px",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                borderRadius: 16,
                overflow: "hidden",
                background: "rgba(250, 247, 242, 0.15)",
                backdropFilter: "blur(28px)",
                border: "2.5px solid rgba(211,163,115,0.6)",
                boxShadow: "0 8px 24px rgba(0,0,0,.25), inset 0 0 0 1px rgba(250, 247, 242, .22)",
                padding: "28px 24px",
              }}
            >
              <button
                onClick={onClose}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(250, 247, 242, 0.7)",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  zIndex: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.backgroundColor = "rgba(250, 247, 242, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(250, 247, 242, 0.7)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <h2
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "white",
                  fontFamily: "var(--font-heading, ChinaCyr), var(--font-montserrat), sans-serif",
                }}
              >
                Контакты
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(250, 247, 242, 0.15)";
                    e.currentTarget.style.borderColor = "rgba(211,163,115,0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(250, 247, 242, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(211,163,115,0.4)";
                  }}
                >
                  WhatsApp
                </a>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(250, 247, 242, 0.15)";
                    e.currentTarget.style.borderColor = "rgba(211,163,115,0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(250, 247, 242, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(211,163,115,0.4)";
                  }}
                >
                  Telegram
                </a>
                <a
                  href={`mailto:${email}`}
                  style={linkStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(250, 247, 242, 0.15)";
                    e.currentTarget.style.borderColor = "rgba(211,163,115,0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(250, 247, 242, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(211,163,115,0.4)";
                  }}
                >
                  {email}
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
