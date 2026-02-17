"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationToastProps {
  unreadMessages: number;
  unreadComments: number;
  onClose: () => void;
}

export default function NotificationToast({
  unreadMessages,
  unreadComments,
  onClose
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Автоматически закрываем через 5 секунд
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Даем время на анимацию закрытия
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const total = unreadMessages + unreadComments;

  if (total === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            top: "100px",
            right: "20px",
            zIndex: 9999,
            background: "linear-gradient(135deg, rgba(211, 163, 115, 0.95) 0%, rgba(211, 163, 115, 0.85) 100%)",
            backdropFilter: "blur(20px)",
            border: "2px solid rgba(211, 163, 115, 0.8)",
            borderRadius: "12px",
            padding: "20px 24px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            minWidth: "300px",
            maxWidth: "400px"
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px"
          }}>
            <div style={{
              fontSize: "2rem",
              flexShrink: 0
            }}>
              🔔
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{
                margin: "0 0 8px 0",
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "white",
                fontFamily: "Arial, sans-serif"
              }}>
                Новые уведомления!
              </h4>
              <div style={{
                fontSize: "0.9rem",
                color: "rgba(255, 255, 255, 0.95)",
                fontFamily: "Arial, sans-serif",
                lineHeight: "1.5"
              }}>
                {unreadMessages > 0 && (
                  <div>💬 Сообщений: {unreadMessages}</div>
                )}
                {unreadComments > 0 && (
                  <div>📷 Комментариев: {unreadComments}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                color: "white",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              }}
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



