"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useViewMode } from "./ui/ViewMode";
import SecurePDFViewer from "./SecurePDFViewer";
import CustomerPanoramasSection from "./CustomerPanoramasSection";
import BimModelsList from "./BimModelsList";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

interface Project {
  id: number;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  _count: {
    photos: number;
    documents: number;
    messages: number;
  };
}

interface Photo {
  id: number;
  filename: string;
  originalName: string;
  uploadedAt: string;
  folder?: { id: number; name: string } | null;
}

interface Document {
  id: number;
  filename: string;
  originalName: string;
  documentType: string;
  uploadedAt: string;
}

interface Message {
  id: number;
  content: string;
  isAdminMessage: boolean;
  createdAt: string;
  user: {
    name?: string;
    email: string;
  };
}

interface PanoramaComment {
  id: number;
  content: string;
  createdAt: string;
  yaw: number | null;
  pitch: number | null;
  isAdminComment: boolean;
  user: {
    name?: string | null;
    email: string;
  };
}

interface Panorama {
  id: number;
  filename: string;
  originalName: string;
  uploadedAt: string;
  mimeType?: string | null;
  url?: string;
  unreadCommentsCount?: number;
  comments?: PanoramaComment[];
}

interface BimModel {
  id: number;
  name: string;
  originalFormat: string;
  viewableFormat?: string | null;
  uploadedAt: string;
  uploadedByUser?: {
    id: number;
    email: string;
    name?: string | null;
  } | null;
}

interface ObjectDetail {
  id: number;
  title: string;
  description?: string;
  address?: string;
  status: string;
  createdAt: string;
  projects: Project[];
  photos: Photo[];
  panoramas: Panorama[];
  documents: Document[];
  messages: Message[];
  bimModels?: BimModel[];
}

interface ObjectDetailViewProps {
  userEmail: string;
}

export default function ObjectDetailView({ userEmail }: ObjectDetailViewProps) {
  const { setMode } = useViewMode();
  const [object, setObject] = useState<ObjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'photos' | 'panoramas' | 'documents' | 'messages' | 'models'>('projects');
  const [selectedPDF, setSelectedPDF] = useState<{ id: number; name: string } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [photoComments, setPhotoComments] = useState<any[]>([]);
  const [newPhotoComment, setNewPhotoComment] = useState('');
  const [sendingPhotoComment, setSendingPhotoComment] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [photoOriginalUrls, setPhotoOriginalUrls] = useState<{ [key: string]: string }>({});
  const photoOriginalUrlsRef = useRef<{ [key: string]: string }>({});
  const [photoLoadingIds, setPhotoLoadingIds] = useState<Set<number>>(new Set());
  const photoLoadingIdsRef = useRef<Set<number>>(new Set());

  const objectId = localStorage.getItem('selectedObjectId');

  const fetchObjectDetail = async () => {
    if (!objectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithRetry(`/api/user/objects/${objectId}?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      if (data.success) {
        setObject(data.object);
      } else {
        setError(data.message || "Не удалось загрузить объект");
      }
    } catch (err) {
      console.error('Ошибка загрузки объекта:', err);
      setError("Ошибка сети при загрузке объекта");
    } finally {
      setLoading(false);
    }
  };

  const handlePanoramaCommentsRead = useCallback((panoramaId: number) => {
    setObject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        panoramas: prev.panoramas.map((panorama) =>
          panorama.id === panoramaId
            ? {
                ...panorama,
                unreadCommentsCount: 0,
              }
            : panorama
        ),
      };
    });
  }, []);

  useEffect(() => {
    if (objectId && userEmail) {
      fetchObjectDetail();
    }
  }, [objectId, userEmail]);

  // Помечаем сообщения как прочитанные при открытии вкладки
  useEffect(() => {
    if (activeTab === 'messages' && objectId && userEmail) {
      markMessagesAsRead();
    }
  }, [activeTab, objectId, userEmail]);

  // Загружаем комментарии при открытии фото
  useEffect(() => {
    if (selectedPhoto) {
      fetchPhotoComments(selectedPhoto.id);
    }
  }, [selectedPhoto]);

  useEffect(() => {
    photoOriginalUrlsRef.current = photoOriginalUrls;
  }, [photoOriginalUrls]);

  useEffect(() => {
    photoLoadingIdsRef.current = photoLoadingIds;
  }, [photoLoadingIds]);

  useEffect(() => {
    return () => {
      Object.values(photoOriginalUrlsRef.current).forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!object?.photos) return;
    const keep = new Set(object.photos.map((photo) => photo.filename));
    setPhotoOriginalUrls((prev) => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([filename, url]) => {
        if (keep.has(filename)) {
          next[filename] = url;
        } else if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      return next;
    });
  }, [object?.photos]);

  const photoThumbnailUrls = useMemo(() => {
    const map: Record<string, string> = {};
    if (object?.photos) {
      object.photos.forEach((photo) => {
        if ((photo as any).mimeType?.startsWith('image/')) {
          if ((photo as any).thumbnailUrl) {
            map[photo.filename] = (photo as any).thumbnailUrl as string;
          } else if ((photo as any).url) {
            map[photo.filename] = (photo as any).url as string;
          } else if (object.id) {
            map[photo.filename] = `/api/uploads/objects/${object.id}/${photo.filename}?email=${encodeURIComponent(userEmail)}`;
          }
        }
      });
    }
    return map;
  }, [object?.photos, object?.id, userEmail]);

  const fetchPhotoOriginalUrl = useCallback(async (photo: Photo) => {
    if (!photo) return;
    if (!(photo as any).mimeType?.startsWith('image/')) return;
    if (!object?.id) return;
    if (photoOriginalUrlsRef.current[photo.filename]) return;
    if (photoLoadingIdsRef.current.has(photo.id)) return;

    photoLoadingIdsRef.current.add(photo.id);
    setPhotoLoadingIds(new Set(photoLoadingIdsRef.current));

    try {
      const response = await fetch(`/api/uploads/objects/${object.id}/${photo.filename}?email=${encodeURIComponent(userEmail)}`, {
        method: 'GET',
        cache: 'force-cache',
      });

      if (!response.ok) {
        console.warn(`Не удалось загрузить фото ${photo.filename}:`, response.statusText);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setPhotoOriginalUrls((prev) => {
        const existing = prev[photo.filename];
        if (existing && existing.startsWith('blob:')) {
          URL.revokeObjectURL(existing);
        }
        return { ...prev, [photo.filename]: url };
      });
    } catch (error) {
      console.error('Ошибка загрузки фото:', error);
    } finally {
      photoLoadingIdsRef.current.delete(photo.id);
      setPhotoLoadingIds(new Set(photoLoadingIdsRef.current));
    }
  }, [object?.id, userEmail]);

  useEffect(() => {
    if (selectedPhoto) {
      fetchPhotoOriginalUrl(selectedPhoto);
    }
  }, [selectedPhoto, fetchPhotoOriginalUrl]);

  const markMessagesAsRead = async () => {
    if (!objectId || !userEmail) return;
    
    try {
      await fetch(`/api/messages/mark-read?email=${encodeURIComponent(userEmail)}&isAdmin=false&objectId=${objectId}`, {
        method: 'PATCH'
      });
    } catch (error) {
      console.error("Ошибка пометки сообщений:", error);
    }
  };

  // Подготовим список папок из видимых фото
  const availableFolders = React.useMemo(() => {
    if (!object) return [] as { id: number; name: string; count: number }[];
    const folderIdToInfo = new Map<number, { id: number; name: string; count: number }>();
    for (const p of object.photos) {
      // Показываем только видимые фото
      // В пользовательском объекте уже приходят только видимые фото
      const folder = (p as any).folder as { id: number; name: string } | undefined | null;
      if (folder && typeof folder.id === 'number') {
        const prev = folderIdToInfo.get(folder.id);
        if (prev) {
          prev.count += 1;
        } else {
          folderIdToInfo.set(folder.id, { id: folder.id, name: folder.name, count: 1 });
        }
      }
    }
    return Array.from(folderIdToInfo.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [object]);

  // Получаем отфильтрованные фото для навигации
  const filteredPhotos = React.useMemo(() => {
    if (!object) return [];
    return object.photos.filter(photo => {
      if (selectedFolderId === null) return true;
      const folder = (photo as any).folder as { id: number } | null | undefined;
      return !!folder && folder.id === selectedFolderId;
    });
  }, [object, selectedFolderId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !objectId) return;
    
    setSendingMessage(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          objectId: parseInt(objectId),
          isAdminMessage: false,
          userEmail: userEmail
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        // Обновляем список сообщений
        await fetchObjectDetail();
      } else {
        console.error('Ошибка отправки сообщения:', data.message);
      }
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchPhotoComments = async (photoId: number) => {
    try {
      const response = await fetch(`/api/photo-comments?photoId=${photoId}`);
      const data = await response.json();
      if (data.success) {
        setPhotoComments(data.comments);
        // Помечаем комментарии к этому фото как прочитанные заказчиком
        markPhotoCommentsAsRead(photoId);
      }
    } catch (err) {
      console.error('Ошибка загрузки комментариев к фото:', err);
    }
  };

  const markPhotoCommentsAsRead = async (photoId: number) => {
    if (!userEmail) return;
    
    try {
      await fetch(`/api/photo-comments/mark-read?email=${encodeURIComponent(userEmail)}&isAdmin=false&photoId=${photoId}`, {
        method: 'PATCH'
      });
    } catch (error) {
      console.error("Ошибка пометки комментариев:", error);
    }
  };

  const sendPhotoComment = async () => {
    if (!newPhotoComment.trim() || !selectedPhoto) return;
    
    setSendingPhotoComment(true);
    try {
      const userToken = localStorage.getItem('userToken');
      const response = await fetch('/api/photo-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          photoId: selectedPhoto.id,
          content: newPhotoComment.trim()
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewPhotoComment('');
        // Обновляем список комментариев
        await fetchPhotoComments(selectedPhoto.id);
      } else {
        console.error('Ошибка отправки комментария:', data.message);
      }
    } catch (err) {
      console.error('Ошибка отправки комментария:', err);
    } finally {
      setSendingPhotoComment(false);
    }
  };

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
      case 'IN_PROGRESS':
        return 'rgba(59, 130, 246, 0.8)';
      case 'COMPLETED':
        return 'rgba(34, 197, 94, 0.8)';
      case 'PLANNING':
        return 'rgba(245, 158, 11, 0.8)';
      case 'ON_HOLD':
        return 'rgba(239, 68, 68, 0.8)';
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
        <p style={{ fontFamily: "Arial, sans-serif" }}>Загрузка объекта...</p>
      </div>
    );
  }

  if (error || !object) {
    return (
      <div style={{
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderRadius: "12px",
        padding: "24px",
        textAlign: "center",
        color: "white",
        backdropFilter: "blur(10px)"
      }}>
        <p style={{ fontFamily: "Arial, sans-serif" }}>❌ {error || "Объект не найден"}</p>
        <button
          onClick={() => setMode("objects")}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            color: "white",
            fontFamily: "Arial, sans-serif",
            cursor: "pointer"
          }}
        >
          ← Назад к объектам
        </button>
      </div>
    );
  }

  return (
    <div className="object-detail-container" style={{ 
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
            onClick={() => setMode("objects")}
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
            fontFamily: "ChinaCyr, sans-serif",
            fontSize: "2rem",
            margin: 0
          }}>
            {object.title}
          </h2>
        </div>
        {object.description && (
          <p style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "1rem",
            color: "rgba(250, 247, 242, 0.8)",
            margin: 0,
            marginLeft: "48px"
          }}>
            {object.description}
          </p>
        )}
        {object.address && (
          <p style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "0.9rem",
            color: "rgba(250, 247, 242, 0.6)",
            margin: 0,
            marginLeft: "48px",
            marginTop: "4px"
          }}>
            📍 {object.address}
          </p>
        )}
      </div>

      {/* Табы */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "24px",
        marginLeft: "48px"
      }}>
        {[
          { key: 'projects', label: 'Проекты', count: object.projects.reduce((total, project) => total + (project.documents?.length || 0), 0) },
          { key: 'photos', label: 'Фото', count: object.photos.length },
          { key: 'panoramas', label: 'Панорамы', count: object.panoramas?.length || 0 },
          { key: 'models', label: '3D Модели', count: object.bimModels?.length || 0 },
          { key: 'documents', label: 'Документы', count: object.documents.length },
          { key: 'messages', label: 'Сообщения', count: object.messages.length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: activeTab === tab.key ? "rgba(59, 130, 246, 0.8)" : "rgba(255, 255, 255, 0.1)",
              color: "white",
              fontFamily: "Arial, sans-serif",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Контент табов */}
      <div style={{ marginLeft: "48px" }}>
        {activeTab === 'projects' && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}>
            {object.projects.map((project) => (
              <div
                key={project.id}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  padding: "20px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                {/* Заголовок проекта */}
                <div style={{
                  marginBottom: "16px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                }}>
                  <h4 style={{
                    fontFamily: "ChinaCyr, sans-serif",
                    fontSize: "1.3rem",
                    color: "white",
                    margin: "0 0 8px 0"
                  }}>
                    {project.title}
                  </h4>
                  {project.description && (
                    <p style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.9rem",
                      color: "rgba(250, 247, 242, 0.7)",
                      margin: "0 0 12px 0"
                    }}>
                      {project.description}
                    </p>
                  )}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div style={{
                      backgroundColor: getStatusColor(project.status),
                      color: "white",
                      padding: "4px 12px",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      fontFamily: "Arial, sans-serif",
                      fontWeight: "600"
                    }}>
                      {project.status === 'PLANNING' ? 'Планирование' :
                       project.status === 'IN_PROGRESS' ? 'В работе' :
                       project.status === 'COMPLETED' ? 'Завершен' : project.status}
                    </div>
                    <div style={{
                      fontSize: "0.8rem",
                      color: "rgba(250, 247, 242, 0.6)",
                      fontFamily: "Arial, sans-serif"
                    }}>
                      {formatDate(project.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Документы проекта */}
                {project.documents && project.documents.length > 0 && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "12px"
                  }}>
                    {project.documents.map((document: any) => (
                      <div
                        key={document.id}
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "12px",
                          border: "1px solid rgba(255, 255, 255, 0.1)"
                        }}
                      >
                        <div style={{
                          fontFamily: "Arial, sans-serif",
                          fontSize: "0.9rem",
                          color: "white",
                          marginBottom: "8px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {document.originalName}
                        </div>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px"
                        }}>
                          <span style={{
                            fontSize: "0.75rem",
                            color: "rgba(250, 247, 242, 0.6)",
                            fontFamily: "Arial, sans-serif"
                          }}>
                            {(document.fileSize / 1024).toFixed(1)} KB
                          </span>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontSize: "0.7rem",
                            fontFamily: "Arial, sans-serif",
                            backgroundColor: document.isPaid ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            color: document.isPaid ? "#22c55e" : "#ef4444",
                            border: `1px solid ${document.isPaid ? "#22c55e" : "#ef4444"}`
                          }}>
                            {document.isPaid ? "Оплачен" : "Не оплачен"}
                          </span>
                        </div>
                        {document.mimeType === 'application/pdf' && (
                          <button
                            onClick={() => {
                              // Открываем PDF в модальном окне с водяным знаком для неоплаченных
                              setSelectedPDF({
                                id: document.id,
                                name: document.originalName
                              });
                            }}
                            style={{
                              width: "100%",
                              padding: "6px",
                              backgroundColor: "rgba(59, 130, 246, 0.8)",
                              border: "none",
                              borderRadius: "4px",
                              color: "white",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontFamily: "Arial, sans-serif"
                            }}
                          >
                            Просмотр
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Сообщение если нет документов */}
                {(!project.documents || project.documents.length === 0) && (
                  <div style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "rgba(250, 247, 242, 0.5)",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem"
                  }}>
                    Документы не загружены
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'photos' && (
          <div>
            {/* Фильтр по папкам */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              flexWrap: 'wrap',
              marginLeft: '48px'
            }}>
              <button
                onClick={() => setSelectedFolderId(null)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: selectedFolderId === null ? 'rgba(211,163,115,0.35)' : 'rgba(250, 247, 242, 0.1)',
                  color: 'white',
                  fontFamily: 'Arial, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Все фото
              </button>
              {availableFolders.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: selectedFolderId === f.id ? 'rgba(211,163,115,0.35)' : 'rgba(250, 247, 242, 0.1)',
                    color: 'white',
                    fontFamily: 'Arial, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📁 {f.name} ({f.count})
                </button>
              ))}
            </div>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px"
            }}>
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "16px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                }}
              >
                <div style={{
                  width: "100%",
                  height: "120px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  marginBottom: "12px",
                  backgroundColor: "rgba(250, 247, 242, 0.1)",
                  position: "relative"
                }}>
                  <img
                    src={photoThumbnailUrls[photo.filename] || (photo as any).url || `/api/uploads/objects/${object.id}/${photo.filename}?email=${encodeURIComponent(userEmail)}`}
                    alt={photo.originalName}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextSibling) nextSibling.style.display = "flex";
                    }}
                  />
                  <div style={{
                    display: "none",
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(250, 247, 242, 0.1)",
                    color: "rgba(250, 247, 242, 0.7)",
                    fontSize: "2rem"
                  }}>
                    📷
                  </div>

                  {/* Бейдж с новыми комментариями */}
                  {((photo as any).unreadCommentsCount || 0) > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      backgroundColor: "rgba(239, 68, 68, 0.95)",
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: "16px",
                      fontSize: "0.75rem",
                      fontFamily: "Arial, sans-serif",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.5)"
                    }}>
                      💬 {(photo as any).unreadCommentsCount}
                    </div>
                  )}
                </div>
                <p style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.85rem",
                  color: "white",
                  margin: "0 0 4px 0"
                }}>
                  {photo.originalName}
                </p>
                {photo.folder && (
                  <p style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.75rem",
                    color: "#d3a373",
                    margin: 0
                  }}>
                    📁 {photo.folder.name}
                  </p>
                )}
                <p style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.75rem",
                  color: "rgba(250, 247, 242, 0.6)",
                  margin: 0
                }}>
                  {formatDate(photo.uploadedAt)}
                </p>
              </div>
            ))}
            </div>
          </div>
        )}

        {activeTab === 'panoramas' && (
          <CustomerPanoramasSection
            objectId={object.id}
            userEmail={userEmail}
            panoramas={object.panoramas || []}
            onCommentsRead={handlePanoramaCommentsRead}
          />
        )}

        {activeTab === 'models' && object && (
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "24px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <BimModelsList
              objectId={object.id}
              userEmail={userEmail}
              canUpload={true}
            />
          </div>
        )}

        {activeTab === 'documents' && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "16px"
          }}>
            {object.documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "16px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px"
                }}>
                  <div style={{
                    fontSize: "1.5rem",
                    marginRight: "12px"
                  }}>
                    📄
                  </div>
                  <div>
                    <p style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.9rem",
                      color: "white",
                      margin: 0
                    }}>
                      {doc.originalName}
                    </p>
                    <p style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.75rem",
                      color: "rgba(250, 247, 242, 0.6)",
                      margin: 0
                    }}>
                      {doc.documentType}
                    </p>
                  </div>
                </div>
                <p style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.75rem",
                  color: "rgba(250, 247, 242, 0.5)",
                  margin: "0 0 12px 0"
                }}>
                  {formatDate(doc.uploadedAt)}
                </p>
                {doc.mimeType === 'application/pdf' && (
                  <button
                    onClick={() => {
                      // Открываем PDF в модальном окне - документы всегда считаются оплаченными
                      setSelectedPDF({
                        id: doc.id,
                        name: doc.originalName
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      backgroundColor: "rgba(59, 130, 246, 0.8)",
                      border: "none",
                      borderRadius: "6px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontFamily: "Arial, sans-serif"
                    }}
                  >
                    Просмотр
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            {/* Панель отправки сообщения */}
            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: "24px"
            }}>
              <h3 style={{
                fontFamily: "ChinaCyr, sans-serif",
                fontSize: "1.5rem",
                color: "white",
                margin: "0 0 20px 0",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                Сообщения
              </h3>
              <div style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-end"
              }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  style={{
                    flex: 1,
                    minHeight: "80px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem",
                    resize: "vertical"
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  style={{
                    backgroundColor: (!newMessage.trim() || sendingMessage) ? "rgba(107, 114, 128, 0.5)" : "rgba(34, 197, 94, 0.8)",
                    border: "none",
                    color: "white",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontFamily: "Arial, sans-serif",
                    cursor: (!newMessage.trim() || sendingMessage) ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    opacity: (!newMessage.trim() || sendingMessage) ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (newMessage.trim() && !sendingMessage) {
                      e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 1)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newMessage.trim() && !sendingMessage) {
                      e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.8)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {sendingMessage ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </div>

            {/* Список сообщений */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              {object.messages.map((message) => (
              <div
                key={message.id}
                style={{
                  backgroundColor: message.isAdminMessage ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "16px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "8px"
                }}>
                  <p style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.85rem",
                    color: message.isAdminMessage ? "rgba(59, 130, 246, 1)" : "rgba(34, 197, 94, 1)",
                    margin: 0,
                    fontWeight: "600"
                  }}>
                    {message.isAdminMessage ? "Команда" : (message.user.name || message.user.email)}
                  </p>
                  <p style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.75rem",
                    color: "rgba(250, 247, 242, 0.6)",
                    margin: 0
                  }}>
                    {formatDate(message.createdAt)}
                  </p>
                </div>
                <p style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.9rem",
                  color: "white",
                  margin: 0
                }}>
                  {message.content}
                </p>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Сообщение если нет данных */}
        {(activeTab === 'projects' && object.projects.length === 0) ||
         (activeTab === 'photos' && object.photos.length === 0) ||
         (activeTab === 'panoramas' && object.panoramas.length === 0) ||
         (activeTab === 'documents' && object.documents.length === 0) ||
         (activeTab === 'messages' && object.messages.length === 0) ? (
          <div style={{
            textAlign: "center",
            color: "rgba(250, 247, 242, 0.6)",
            padding: "40px",
            fontFamily: "Arial, sans-serif"
          }}>
            <p>Пока нет данных в этой категории</p>
          </div>
        ) : null}
      </div>

      {/* PDF Viewer */}
      {selectedPDF && (
        <SecurePDFViewer
          documentId={selectedPDF.id}
          fileName={selectedPDF.name}
          onClose={() => setSelectedPDF(null)}
          source={activeTab === 'projects' ? "projects" : "documents"}
          isAdmin={false} // Заказчик - не админ, поэтому будут водяные знаки для неоплаченных
          userEmail={userEmail}
        />
      )}

      {/* Photo Viewer */}
      {selectedPhoto && (
        <div style={{
          position: "fixed",
          top: "120px",
          left: "20px",
          right: "20px",
          bottom: "20px",
          backgroundColor: "rgba(0,0,0,0.9)",
          borderRadius: "12px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(250, 247, 242, 0.1)",
            padding: "20px",
            display: "flex",
            gap: "20px",
            overflow: "hidden"
          }}>
            {/* Левая часть - Фото */}
            <div style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}>
              {/* Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h2 style={{
                  color: "white",
                  fontSize: "1.5rem",
                  fontFamily: "Arial, sans-serif",
                  margin: 0
                }}>
                  {selectedPhoto.originalName}
                </h2>
                <button
                  onClick={() => {
                    setSelectedPhoto(null);
                    setPhotoComments([]);
                    setNewPhotoComment('');
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    fontSize: "2rem",
                    cursor: "pointer",
                    padding: "0",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ×
                </button>
              </div>

              {/* Photo */}
              <div style={{
                flex: "1",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "400px",
                position: "relative"
              }}>
                <img
                  src={photoOriginalUrls[selectedPhoto.filename] || (selectedPhoto as any).url || photoThumbnailUrls[selectedPhoto.filename] || `/api/uploads/objects/${object.id}/${selectedPhoto.filename}?email=${encodeURIComponent(userEmail)}`}
                  alt={selectedPhoto.originalName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: "8px"
                  }}
                />
                {photoLoadingIds.has(selectedPhoto.id) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "20px",
                      right: "20px",
                      backgroundColor: "rgba(17,24,39,0.7)",
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "999px",
                      fontSize: "0.8rem",
                      fontFamily: "Arial, sans-serif"
                    }}
                  >
                    Загрузка фото…
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px"
              }}>
                <button
                  onClick={() => {
                    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredPhotos.length - 1;
                    setSelectedPhoto(filteredPhotos[prevIndex]);
                    fetchPhotoComments(filteredPhotos[prevIndex].id);
                  }}
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.8)",
                    border: "none",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    fontFamily: "Arial, sans-serif",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  ← Предыдущее
                </button>
                <button
                  onClick={() => {
                    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
                    const nextIndex = currentIndex < filteredPhotos.length - 1 ? currentIndex + 1 : 0;
                    setSelectedPhoto(filteredPhotos[nextIndex]);
                    fetchPhotoComments(filteredPhotos[nextIndex].id);
                  }}
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.8)",
                    border: "none",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    fontFamily: "Arial, sans-serif",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  Следующее →
                </button>
              </div>
            </div>

            {/* Правая часть - Комментарии */}
            <div style={{
              width: "350px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              backgroundColor: "rgba(250, 247, 242, 0.05)",
              borderRadius: "8px",
              padding: "16px",
              maxHeight: "80vh",
              overflow: "hidden"
            }}>
              {/* Заголовок комментариев */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(250, 247, 242, 0.2)",
                paddingBottom: "12px"
              }}>
                <h3 style={{
                  color: "white",
                  fontSize: "1.1rem",
                  fontFamily: "Arial, sans-serif",
                  margin: 0
                }}>
                  Комментарии ({photoComments.length})
                </h3>
              </div>

              {/* Список комментариев */}
              <div style={{
                flex: "1",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                {photoComments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      backgroundColor: comment.isAdminComment ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      padding: "12px",
                      border: `1px solid ${comment.isAdminComment ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)"}`
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px"
                    }}>
                      <p style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.85rem",
                        color: comment.isAdminComment ? "rgba(59, 130, 246, 1)" : "rgba(34, 197, 94, 1)",
                        margin: 0,
                        fontWeight: "600"
                      }}>
                        {comment.isAdminComment ? "Команда" : (comment.user.name || comment.user.email)}
                      </p>
                      <p style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.75rem",
                        color: "rgba(250, 247, 242, 0.6)",
                        margin: 0
                      }}>
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                    <p style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.9rem",
                      color: "white",
                      margin: 0,
                      lineHeight: "1.4"
                    }}>
                      {comment.content}
                    </p>
                  </div>
                ))}
                
                {photoComments.length === 0 && (
                  <div style={{
                    textAlign: "center",
                    color: "rgba(250, 247, 242, 0.5)",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem",
                    padding: "20px"
                  }}>
                    Пока нет комментариев
                  </div>
                )}
              </div>

              {/* Форма добавления комментария */}
              <div style={{
                borderTop: "1px solid rgba(250, 247, 242, 0.2)",
                paddingTop: "12px"
              }}>
                <textarea
                  value={newPhotoComment}
                  onChange={(e) => setNewPhotoComment(e.target.value)}
                  placeholder="Добавить комментарий..."
                  style={{
                    width: "100%",
                    minHeight: "60px",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem",
                    resize: "vertical",
                    marginBottom: "8px"
                  }}
                />
                <button
                  onClick={sendPhotoComment}
                  disabled={!newPhotoComment.trim() || sendingPhotoComment}
                  style={{
                    width: "100%",
                    backgroundColor: (!newPhotoComment.trim() || sendingPhotoComment) ? "rgba(107, 114, 128, 0.5)" : "rgba(34, 197, 94, 0.8)",
                    border: "none",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    fontFamily: "Arial, sans-serif",
                    cursor: (!newPhotoComment.trim() || sendingPhotoComment) ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    opacity: (!newPhotoComment.trim() || sendingPhotoComment) ? 0.6 : 1
                  }}
                >
                  {sendingPhotoComment ? "Отправка..." : "Отправить комментарий"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
