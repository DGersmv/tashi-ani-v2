"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useOpenSiteSettings } from "@/components/ui/OpenSiteSettingsContext";
import AdminCustomerPanels from "./AdminCustomerPanels";
import AdminSiteSettings from "./AdminSiteSettings";

const PANEL_WIDTH = 720;
const MIN_TOP = 20;
const MIN_LEFT = 20;
const SETTINGS_OVERLAY_Z = 10050;
const SETTINGS_PANEL_Z = 10051;

interface AdminDashboardProps {
  userEmail: string;
  onLogout: () => void;
}

export default function AdminDashboard({ userEmail, onLogout }: AdminDashboardProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 80, y: 60 });
  const [projectStats, setProjectStats] = useState({ active: 0, completed: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const { openSiteSettings, setOpenSiteSettings } = useOpenSiteSettings();

  useEffect(() => {
    if (openSiteSettings) {
      setSettingsPanelOpen(true);
      setOpenSiteSettings(false);
    }
  }, [openSiteSettings, setOpenSiteSettings]);

  useEffect(() => {
    if (settingsPanelOpen && typeof window !== "undefined") {
      setPanelPos({
        x: Math.max(MIN_LEFT, (window.innerWidth - PANEL_WIDTH) / 2),
        y: Math.max(MIN_TOP, Math.min(80, window.innerHeight * 0.1)),
      });
    }
  }, [settingsPanelOpen]);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: panelPos.x,
      startTop: panelPos.y,
    };
  }, [panelPos.x, panelPos.y]);

  useEffect(() => {
    if (!settingsPanelOpen) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPanelPos({
        x: Math.max(MIN_LEFT, Math.min(window.innerWidth - PANEL_WIDTH - MIN_LEFT, dragRef.current.startLeft + dx)),
        y: Math.max(MIN_TOP, Math.min(window.innerHeight - 200, dragRef.current.startTop + dy)),
      });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [settingsPanelOpen]);

  useEffect(() => {
    const savedToken = localStorage.getItem("adminToken");
    if (savedToken) {
      setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProjectStats({
            active: data.activeProjectsCount ?? 0,
            completed: data.completedProjectsCount ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [token]);

  if (isLoading) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.8)",
        zIndex: 9999
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          border: "4px solid rgba(250, 247, 242, 0.3)",
          borderTop: "4px solid white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.8)",
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
          color: "white",
          backdropFilter: "blur(10px)"
        }}>
          <h2 style={{ fontFamily: "var(--font-jost), sans-serif", marginBottom: "16px" }}>
            Ошибка авторизации
          </h2>
          <p style={{ marginBottom: "20px", fontFamily: "Arial, sans-serif" }}>
            Токен не найден. Пожалуйста, войдите заново.
          </p>
          <button
            onClick={onLogout}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "rgba(201, 169, 110,  0.8)",
              color: "white",
              fontFamily: "var(--font-jost), sans-serif",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Выйти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "absolute",
      top: "200px",
      left: "0",
      right: "0",
      minHeight: "100vh",
      zIndex: 10,
      padding: "0 2rem",
      maxWidth: "1200px",
      margin: "0 auto"
    }}>
      {/* Заголовок */}
      <div style={{
        textAlign: "center",
        marginBottom: "32px",
        color: "white"
      }}>
        <h1 style={{
          fontFamily: "var(--font-jost), sans-serif",
          fontSize: "2.5rem",
          fontWeight: 800,
          marginBottom: "10px",
        }}>
          Админ панель
        </h1>
        <p style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "1.1rem",
          color: "rgba(250, 247, 242, 0.8)",
          marginBottom: "8px"
        }}>
          Добро пожаловать, {userEmail}
        </p>
        <p style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "0.9rem",
          color: "rgba(250, 247, 242, 0.6)"
        }}>
          Управление пользователями и проектами
        </p>
      </div>


      {/* Панели заказчиков */}
      <AdminCustomerPanels adminToken={token} />

      {/* Панель настроек сайта — перетаскиваемое окно (портал в body, чтобы быть поверх шапки) */}
      {settingsPanelOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: SETTINGS_OVERLAY_Z,
                background: "rgba(0,0,0,0.5)",
              }}
              onClick={() => setSettingsPanelOpen(false)}
              aria-hidden
            />
            <div
              role="dialog"
              aria-label="Настройки сайта"
              style={{
                position: "fixed",
                left: panelPos.x,
                top: panelPos.y,
                zIndex: SETTINGS_PANEL_Z,
                width: PANEL_WIDTH,
                maxWidth: "calc(100vw - 40px)",
                maxHeight: "calc(100vh - 40px)",
                background: "linear-gradient(180deg, rgba(25,28,35,0.98) 0%, rgba(18,20,26,0.98) 100%)",
                borderRadius: 16,
                border: "1px solid rgba(201, 169, 110,  0.4)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(250, 247, 242, 0.1)",
                  cursor: "grab",
                  userSelect: "none",
                  flexShrink: 0,
                }}
                onMouseDown={handleHeaderMouseDown}
                onMouseUp={() => { dragRef.current = null; }}
              >
                <h2 style={{ fontFamily: "var(--font-jost), sans-serif", fontSize: "1.25rem", color: "white", margin: 0, pointerEvents: "none" }}>
                  Настройки сайта
                </h2>
                <button
                  type="button"
                  onClick={() => setSettingsPanelOpen(false)}
                  aria-label="Закрыть"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(250, 247, 242, 0.1)",
                    color: "white",
                    fontSize: 18,
                    cursor: "pointer",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
                <AdminSiteSettings adminToken={token} panelMode />
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Статистика */}
      <div style={{
        marginTop: "32px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px"
      }}>

        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "20px",
          textAlign: "center",
          backdropFilter: "blur(10px)"
        }}>
          <h3 style={{
            fontFamily: "var(--font-jost), sans-serif",
            fontSize: "1.5rem",
            marginBottom: "8px",
            color: "white"
          }}>
            Активные проекты
          </h3>
          <p style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "2rem",
            fontWeight: "bold",
            color: "rgba(34, 197, 94, 1)"
          }}>
            {projectStats.active}
          </p>
        </div>

        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "20px",
          textAlign: "center",
          backdropFilter: "blur(10px)"
        }}>
          <h3 style={{
            fontFamily: "var(--font-jost), sans-serif",
            fontSize: "1.5rem",
            marginBottom: "8px",
            color: "white"
          }}>
            Завершенные проекты
          </h3>
          <p style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "2rem",
            fontWeight: "bold",
            color: "rgba(59, 130, 246, 1)"
          }}>
            {projectStats.completed}
          </p>
        </div>
      </div>
    </div>
  );
}
