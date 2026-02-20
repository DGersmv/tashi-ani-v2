"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useViewMode } from "./ui/ViewMode";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

interface Object {
  id: number;
  title: string;
  description?: string;
  address?: string;
  status: string;
  createdAt: string;
  projects: {
    id: number;
    title: string;
    status: string;
    createdAt: string;
  }[];
  _count: {
    photos: number;
    documents: number;
    messages: number;
  };
  unreadMessagesCount?: number;
  unreadCommentsCount?: number;
  totalMessagesCount?: number;
  totalCommentsCount?: number;
}

interface UserObjectsGridProps {
  userEmail: string;
}

export default function UserObjectsGrid({ userEmail }: UserObjectsGridProps) {
  const { setMode } = useViewMode();
  const [objects, setObjects] = useState<Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithRetry(`/api/user/objects?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      if (data.success) {
        setObjects(data.objects);
      } else {
        setError(data.message || "Не удалось загрузить объекты");
      }
    } catch (err) {
      console.error('Ошибка загрузки объектов:', err);
      setError("Ошибка сети при загрузке объектов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchObjects();
    }
  }, [userEmail]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'rgba(59, 130, 246, 0.8)';
      case 'INACTIVE':
        return 'rgba(239, 68, 68, 0.8)';
      case 'ARCHIVED':
        return 'rgba(156, 163, 175, 0.8)';
      default:
        return 'rgba(59, 130, 246, 0.8)';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: "white", padding: "40px" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(250, 247, 242, 0.3)",
          borderTop: "3px solid white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 20px"
        }}></div>
        <p style={{ fontFamily: "Arial, sans-serif" }}>Загрузка объектов...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderRadius: "12px",
        padding: "24px",
        textAlign: "center",
        color: "white",
        backdropFilter: "blur(10px)"
      }}>
        <p style={{ fontFamily: "Arial, sans-serif" }}>❌ {error}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: "1200px", 
      margin: "0 auto",
      paddingTop: "120px"
    }}>
      {/* Заголовок */}
      <div style={{
        marginBottom: "32px",
        color: "white"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px"
        }}>
          <button
            onClick={() => setMode("home")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(250, 247, 242, 0.8)",
              fontSize: "1.5rem",
              cursor: "pointer",
              marginRight: "16px",
              padding: "8px",
              borderRadius: "6px",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(250, 247, 242, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            ←
          </button>
          <h2 style={{
            fontFamily: "var(--font-jost), sans-serif",
            fontSize: "2rem",
            margin: 0
          }}>
            Мои объекты
          </h2>
        </div>
        <p style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "1rem",
          color: "rgba(250, 247, 242, 0.8)",
          margin: 0,
          marginLeft: "48px"
        }}>
          Управление вашими участками и домами
        </p>
      </div>

      {/* Сетка объектов */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: "24px",
        padding: "0 16px"
      }}>
        {objects.map((object, index) => (
          <motion.div
            key={object.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            whileHover={{
              scale: 1.02,
              backgroundColor: "rgba(255, 255, 255, 0.15)"
            }}
            onClick={() => {
              // Сохраняем ID объекта в localStorage и переходим к детальному просмотру
              localStorage.setItem('selectedObjectId', object.id.toString());
              setMode("object-detail");
            }}
          >
            {/* Заголовок объекта */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px"
            }}>
              <h3 style={{
                fontFamily: "var(--font-jost), sans-serif",
                fontSize: "1.25rem",
                color: "white",
                margin: 0,
                flex: 1
              }}>
                {object.title}
              </h3>
              <div style={{
                backgroundColor: getStatusColor(object.status),
                color: "white",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontFamily: "Arial, sans-serif",
                fontWeight: "600",
                textTransform: "uppercase"
              }}>
                {object.status === 'ACTIVE' ? 'Активен' : 
                 object.status === 'INACTIVE' ? 'Неактивен' : 'Архив'}
              </div>
            </div>

            {/* Описание и адрес */}
            {object.description && (
              <p style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "0.9rem",
                color: "rgba(250, 247, 242, 0.8)",
                marginBottom: "8px"
              }}>
                {object.description}
              </p>
            )}
            {object.address && (
              <p style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "0.85rem",
                color: "rgba(250, 247, 242, 0.6)",
                marginBottom: "16px"
              }}>
                📍 {object.address}
              </p>
            )}

            {/* Статистика */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
              marginBottom: "16px"
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: "rgba(59, 130, 246, 1)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  {object.projects.length}
                </div>
                <div style={{
                  fontSize: "0.75rem",
                  color: "rgba(250, 247, 242, 0.7)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  Проекты
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: "rgba(34, 197, 94, 1)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  {object.photos?.length || 0}
                </div>
                <div style={{
                  fontSize: "0.75rem",
                  color: "rgba(250, 247, 242, 0.7)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  Фото
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: "rgba(168, 85, 247, 1)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  {object._count.documents}
                </div>
                <div style={{
                  fontSize: "0.75rem",
                  color: "rgba(250, 247, 242, 0.7)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  Документы
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: (object.unreadMessagesCount || 0) > 0 ? "#ef4444" : "rgba(245, 158, 11, 1)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  {object.totalMessagesCount || object._count.messages}
                  {(object.unreadMessagesCount || 0) > 0 && (
                    <span style={{
                      fontSize: "0.75rem",
                      marginLeft: "4px",
                      color: "#ef4444"
                    }}>
                      (+{object.unreadMessagesCount})
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: "0.75rem",
                  color: "rgba(250, 247, 242, 0.7)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  Сообщения
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: (object.unreadCommentsCount || 0) > 0 ? "#ef4444" : "rgba(34, 197, 94, 1)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  {object.totalCommentsCount || 0}
                  {(object.unreadCommentsCount || 0) > 0 && (
                    <span style={{
                      fontSize: "0.75rem",
                      marginLeft: "4px",
                      color: "#ef4444"
                    }}>
                      (+{object.unreadCommentsCount})
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: "0.75rem",
                  color: "rgba(250, 247, 242, 0.7)",
                  fontFamily: "Arial, sans-serif"
                }}>
                  Комментарии
                </div>
              </div>
            </div>

            {/* Дата создания */}
            <div style={{
              fontSize: "0.75rem",
              color: "rgba(250, 247, 242, 0.5)",
              fontFamily: "Arial, sans-serif",
              textAlign: "center"
            }}>
              Создан: {formatDate(object.createdAt)}
            </div>

          </motion.div>
        ))}
      </div>

      {/* Сообщение если объектов нет */}
      {objects.length === 0 && (
        <div style={{
          textAlign: "center",
          color: "white",
          padding: "40px"
        }}>
          <h3 style={{
            fontFamily: "var(--font-jost), sans-serif",
            fontSize: "1.5rem",
            marginBottom: "8px"
          }}>
            Объекты не найдены
          </h3>
          <p style={{
            fontFamily: "Arial, sans-serif",
            color: "rgba(250, 247, 242, 0.8)"
          }}>
            У вас пока нет объектов. Обратитесь к Таше или Ане для добавления объектов.
          </p>
        </div>
      )}
    </div>
  );
}
