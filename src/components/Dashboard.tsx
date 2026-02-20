"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

interface DashboardProps {
  userEmail: string;
  onLogout: () => void;
}

export default function Dashboard({ userEmail, onLogout }: DashboardProps) {
  const [userStats, setUserStats] = useState({
    totalObjects: 0,
    totalPhotos: 0,
    totalDocuments: 0,
    totalMessages: 0
  });
  const [userProfile, setUserProfile] = useState<{
    name?: string;
    email: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Загружаем данные пользователя
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Загружаем профиль пользователя
        const profileResponse = await fetchWithRetry(`/api/user/profile?email=${encodeURIComponent(userEmail)}`);
        const profileData = await profileResponse.json();
        if (profileData.success) {
          setUserProfile({
            name: profileData.user.name,
            email: profileData.user.email
          });
        }

        // Загружаем статистику (с повтором при обрыве соединения)
        const statsResponse = await fetchWithRetry(`/api/user/objects?email=${encodeURIComponent(userEmail)}`);
        const statsData = await statsResponse.json();
        if (statsData.success) {
          const stats = statsData.objects.reduce((acc: any, obj: any) => ({
            totalObjects: acc.totalObjects + 1,
            totalPhotos: acc.totalPhotos + (obj._count?.photos || 0),
            totalDocuments: acc.totalDocuments + (obj._count?.documents || 0),
            totalMessages: acc.totalMessages + (obj._count?.messages || 0)
          }), { totalObjects: 0, totalPhotos: 0, totalDocuments: 0, totalMessages: 0 });
          setUserStats(stats);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      fetchUserData();
    }
  }, [userEmail]);

  const panels = [
    {
      id: "objects",
      title: "Мои объекты",
      icon: "🏠",
      description: "Управление участками и домами",
      count: userStats.totalObjects,
      color: "var(--sage)"
    },
    {
      id: "photos",
      title: "Фотогалерея",
      icon: "📸",
      description: "Просмотр фотографий объектов",
      count: userStats.totalPhotos,
      color: "var(--moss)"
    },
    {
      id: "documents",
      title: "Документы",
      icon: "📄",
      description: "Проекты и документы",
      count: userStats.totalDocuments,
      color: "var(--gold)"
    },
    {
      id: "messages",
      title: "Сообщения",
      icon: "💬",
      description: "Общение с командой",
      count: userStats.totalMessages,
      color: "var(--gold)"
    }
  ];

  return (
    <div className="min-h-screen relative">
      {/* Фон */}
      <div className="fixed inset-0 -z-20">
        <div 
          className="w-full h-full"
          style={{
            background: "linear-gradient(135deg, var(--ink) 0%, rgba(28, 27, 22, 0.8) 50%, rgba(28, 27, 22, 0.6) 100%)",
            backgroundAttachment: "fixed"
          }}
        />
      </div>

      {/* Контент */}
      <div className="relative z-10 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Приветствие */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-jost), sans-serif" }}
            >
              Добро пожаловать!
            </h1>
            <p className="text-xl text-gray-300 mb-2">
              Личный кабинет
            </p>
            <p className="text-lg text-gray-400">
              {userProfile?.name || userEmail}
            </p>
            {userProfile?.name && (
              <p className="text-sm text-gray-500">
                {userEmail}
              </p>
            )}
          </motion.div>

          {/* Статистика */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-8"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Объектов", value: userStats.totalObjects, color: "rgba(59, 130, 246, 0.8)" },
                  { label: "Фотографий", value: userStats.totalPhotos, color: "rgba(34, 197, 94, 0.8)" },
                  { label: "Документов", value: userStats.totalDocuments, color: "rgba(168, 85, 247, 0.8)" },
                  { label: "Сообщений", value: userStats.totalMessages, color: "rgba(245, 158, 11, 0.8)" }
                ].map((stat, index) => (
                  <div
                    key={stat.label}
                    className="text-center p-4 rounded-xl"
                    style={{
                      backgroundColor: "rgba(250, 247, 242, 0.08)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(201, 169, 110, 0.1)"
                    }}
                  >
                    <div 
                      className="text-2xl font-bold mb-1"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-300">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Панели */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {panels.map((panel, index) => (
              <motion.div
                key={panel.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1 
                }}
                className="group cursor-pointer"
                onClick={() => {
                  // Здесь будет логика перехода к разным разделам
                  console.log(`Переход к разделу: ${panel.id}`);
                }}
              >
                <div
                  className="
                    relative
                    w-full
                    aspect-square
                    rounded-2xl
                    overflow-hidden
                    transition-all
                    duration-300
                    group-hover:scale-105
                    group-hover:shadow-2xl
                  "
                  style={{
                    background: "rgba(250, 247, 242, 0.08)",
                    backdropFilter: "blur(20px)",
                    border: "2px solid rgba(201, 169, 110, 0.2)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
                  }}
                >
                  {/* Градиентный оверлей */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: "linear-gradient(135deg, rgba(201, 169, 110, 0.15), rgba(201, 169, 110, 0.08))"
                    }}
                  />

                  {/* Контент панели */}
                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-center">
                    {/* Счетчик */}
                    <div 
                      className="absolute top-4 right-4 text-2xl font-bold"
                      style={{ color: panel.color }}
                    >
                      {panel.count}
                    </div>

                    {/* Иконка */}
                    <div 
                      className="text-6xl mb-4 transition-transform duration-300 group-hover:scale-110"
                    >
                      {panel.icon}
                    </div>

                    {/* Заголовок */}
                    <h3 
                      className="text-xl font-bold text-white mb-2"
                      style={{ fontFamily: "var(--font-jost), sans-serif" }}
                    >
                      {panel.title}
                    </h3>

                    {/* Описание */}
                    <p className="text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {panel.description}
                    </p>
                  </div>

                  {/* Свечение при hover */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      boxShadow: "inset 0 0 20px rgba(201, 169, 110,  0.3)"
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Кнопка выхода */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center"
          >
            <button
              onClick={onLogout}
              className="
                px-8 py-3
                bg-transparent
                border-2
                border-red-400
                text-red-400
                rounded-xl
                font-semibold
                transition-all
                duration-300
                hover:bg-red-400
                hover:text-white
                hover:shadow-lg
              "
              style={{ fontFamily: "var(--font-jost), sans-serif" }}
            >
              Выйти
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}



