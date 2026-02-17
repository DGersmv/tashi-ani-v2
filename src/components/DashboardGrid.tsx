"use client";

import React, { useState, useEffect } from "react";
import DashboardPanel from "./DashboardPanel";
import { useViewMode } from "./ui/ViewMode";

interface DashboardItem {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  href?: string;
  status?: "active" | "inactive" | "pending";
  count?: number;
  onClick?: () => void;
}

interface UserStats {
  objectsCount: number;
  projectsCount: number;
  messagesCount: number;
  completedProjectsCount: number;
  activeProjectsCount: number;
}

export default function DashboardGrid() {
  const { setMode } = useViewMode();
  const [isLoaded, setIsLoaded] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    objectsCount: 0,
    projectsCount: 0,
    messagesCount: 0,
    completedProjectsCount: 0,
    activeProjectsCount: 0
  });
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Получаем email пользователя из localStorage
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
      // Загружаем профиль пользователя
      loadUserProfile(email);
      // Загружаем статистику пользователя
      loadUserStats(email);
    }
  }, []);

  const loadUserProfile = async (email: string) => {
    try {
      const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      
      if (result.success && result.user.name) {
        setUserName(result.user.name);
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    }
  };

  const loadUserStats = async (email: string) => {
    try {
      const response = await fetch(`/api/user/stats?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      
      if (result.success) {
        setUserStats({
          objectsCount: result.stats.objectsCount,
          projectsCount: result.stats.projectsCount,
          messagesCount: result.stats.messagesCount,
          completedProjectsCount: result.stats.completedProjectsCount,
          activeProjectsCount: result.stats.activeProjectsCount
        });
      } else {
        console.error('Ошибка загрузки статистики:', result.message);
        // Используем заглушки при ошибке
        setUserStats({
          objectsCount: 0,
          projectsCount: 0,
          messagesCount: 0,
          completedProjectsCount: 0,
          activeProjectsCount: 0
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      // Используем заглушки при ошибке
      setUserStats({
        objectsCount: 0,
        projectsCount: 0,
        messagesCount: 0,
        completedProjectsCount: 0,
        activeProjectsCount: 0
      });
    }
  };
  
  const dashboardItems: DashboardItem[] = [
    {
      id: "objects",
      title: "Мои объекты",
      description: "Участки, дома и другие объекты",
      status: "active",
      count: userStats.objectsCount,
      onClick: () => setMode("objects")
    }
  ];

  return (
    <section className="dashboard-section">
      <div className="mx-auto max-w-screen-2xl px-8 md:px-12">
        {/* Заголовок секции */}
        <div style={{ 
          marginBottom: "32px", 
          textAlign: "center",
          color: "white"
        }}>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            marginBottom: "8px",
            fontFamily: "var(--font-heading, ChinaCyr), sans-serif"
          }}>
            Личный кабинет
          </h1>
          <p style={{
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.8)",
            fontFamily: "Arial, sans-serif"
          }}>
            {userEmail ? `Добро пожаловать, ${userName || userEmail}` : "Управляйте своими проектами и настройками"}
          </p>
        </div>

        {/* Сетка панелей */}
        <div className={`dashboardGrid ${isLoaded ? 'loaded' : ''}`}>
          <div className="dashboard-row">
            {dashboardItems.map((item) => (
              <div key={item.id} className="dashboard-item">
                <DashboardPanel
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  status={item.status}
                  count={item.count}
                  href={item.href}
                  onClick={item.onClick}
                />
              </div>
            ))}
          </div>
        </div>

        <style jsx global>{`
          .dashboard-section {
            position: absolute !important;
            top: 200px !important;
            left: 0 !important;
            right: 0 !important;
            min-height: 100vh !important;
            z-index: 10 !important;
          }
          
          .dashboardGrid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            align-items: start !important;
          }
          
          @media (min-width: 640px) {
            .dashboardGrid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 16px !important;
            }
            .dashboard-item {
              grid-column: auto / span 1 !important;
            }
          }
          
          @media (min-width: 1024px) {
            .dashboardGrid {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              gap: 24px !important;
              padding: 0 4rem !important;
            }
            
            .dashboard-row {
              display: flex !important;
              gap: 24px !important;
              justify-content: center !important;
              width: 100% !important;
              max-width: 1200px !important;
            }
            
            .dashboard-item {
              flex: 0 0 auto !important;
              width: 400px !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
