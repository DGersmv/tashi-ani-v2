'use client';

import { useState, useEffect } from 'react';
import BimModelUploader from './BimModelUploader';
import BimModelViewer from './BimModelViewer';

interface BimModel {
  id: number;
  name: string;
  description: string | null;
  version: string | null;
  originalFilename: string;
  originalFormat: string;
  viewableFilename: string | null;
  viewableFormat: string | null;
  isVisibleToCustomer: boolean;
  uploadedAt: string;
  uploadedByUser: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  project: {
    id: number;
    title: string;
  } | null;
  stage: {
    id: number;
    title: string;
  } | null;
  _count: {
    comments: number;
  };
}

interface BimModelsListProps {
  objectId: number;
  userEmail: string;
  canUpload?: boolean;
}

export default function BimModelsList({
  objectId,
  userEmail,
  canUpload = true,
}: BimModelsListProps) {
  const [models, setModels] = useState<BimModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<BimModel | null>(null);
  const [userRole, setUserRole] = useState<string>('USER');

  useEffect(() => {
    // Получаем роль пользователя из localStorage
    const adminToken = localStorage.getItem('adminToken');
    const isAdmin = !!(adminToken || localStorage.getItem('isAdmin') === 'true');
    setUserRole(isAdmin ? 'MASTER' : 'USER');
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      
      const adminToken = localStorage.getItem('adminToken');
      const url = `/api/user/objects/${objectId}/models?email=${encodeURIComponent(userEmail)}`;
      const headers: HeadersInit = {};
      
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
      
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки моделей');
      }

      setModels(data.models || []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки моделей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (objectId && userEmail) {
      loadModels();
    }
  }, [objectId, userEmail]);

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    loadModels();
  };

  const handleModelClick = (model: BimModel) => {
    setSelectedModel(model);
  };

  const handleDelete = () => {
    loadModels();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getFormatIcon = (format: string) => {
    const icons: Record<string, string> = {
      SKETCHUP: '📐',
      REVIT: '🏗️',
      ARCHICAD: '🏛️',
      IFC: '📦',
      GLTF: '🎨',
      OBJ: '📊',
      THREE_DS: '🎯',
      OTHER: '📄',
    };
    return icons[format] || '📄';
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px"
      }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "1rem" }}>Загрузка моделей...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "white" }}>
      {/* Заголовок и кнопка загрузки */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px"
      }}>
        <div>
          <h3 style={{
            fontFamily: "ChinaCyr, sans-serif",
            fontSize: "1.5rem",
            margin: 0,
            color: "white"
          }}>
            3D Модели ({models.length})
          </h3>
        </div>
        {canUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "rgba(59, 130, 246, 0.8)",
              color: "white",
              fontFamily: "Arial, sans-serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              fontSize: "0.9rem",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 1)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.8)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>+</span>
            <span>Загрузить 3D Модель</span>
          </button>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: "rgba(239, 68, 68, 0.2)",
          border: "1px solid rgba(239, 68, 68, 0.5)",
          color: "rgba(255, 255, 255, 0.9)",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "24px"
        }}>
          {error}
        </div>
      )}

      {/* Список моделей */}
      {models.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "48px 24px",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <p style={{ color: "rgba(255, 255, 255, 0.7)", marginBottom: "16px" }}>
            Пока нет загруженных моделей
          </p>
          {canUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "rgba(59, 130, 246, 0.8)",
                color: "white",
                fontFamily: "Arial, sans-serif",
                cursor: "pointer",
                transition: "all 0.3s ease",
                fontSize: "0.9rem",
                fontWeight: "500"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.8)";
              }}
            >
              Загрузить первую модель
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px"
        }}>
          {models.map((model) => (
            <div
              key={model.id}
              onClick={() => handleModelClick(model)}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "16px",
                padding: "20px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "2rem" }}>{getFormatIcon(model.originalFormat)}</span>
                  <div>
                    <h3 style={{
                      fontFamily: "Arial, sans-serif",
                      fontWeight: "600",
                      fontSize: "1.1rem",
                      margin: 0,
                      color: "white"
                    }}>
                      {model.name}
                    </h3>
                    {model.version && (
                      <p style={{
                        fontSize: "0.75rem",
                        color: "rgba(255, 255, 255, 0.6)",
                        margin: "4px 0 0 0"
                      }}>
                        v{model.version}
                      </p>
                    )}
                  </div>
                </div>
                {model.viewableFormat && (
                  <span style={{
                    padding: "4px 8px",
                    backgroundColor: "rgba(34, 197, 94, 0.2)",
                    color: "rgba(34, 197, 94, 1)",
                    fontSize: "0.75rem",
                    borderRadius: "4px",
                    fontWeight: "500"
                  }}>
                    {model.viewableFormat}
                  </span>
                )}
              </div>

              {model.description && (
                <p style={{
                  fontSize: "0.875rem",
                  color: "rgba(255, 255, 255, 0.7)",
                  marginBottom: "12px",
                  lineHeight: "1.4",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {model.description}
                </p>
              )}

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                color: "rgba(255, 255, 255, 0.6)",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)"
              }}>
                <div>
                  <p style={{ margin: 0 }}>{formatDate(model.uploadedAt)}</p>
                  {model.uploadedByUser && (
                    <p style={{ margin: "4px 0 0 0" }}>
                      {model.uploadedByUser.name || model.uploadedByUser.email}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: "500" }}>{model.originalFormat}</p>
                  {model._count.comments > 0 && (
                    <p style={{ margin: "4px 0 0 0" }}>💬 {model._count.comments}</p>
                  )}
                </div>
              </div>

              {model.project && (
                <div style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)"
                }}>
                  <p style={{
                    fontSize: "0.75rem",
                    color: "rgba(255, 255, 255, 0.6)",
                    margin: 0
                  }}>
                    Проект: {model.project.title}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно загрузки */}
      {showUploadModal && (
        <BimModelUploader
          objectId={objectId}
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadModal(false)}
        />
      )}

      {/* Модальное окно просмотра */}
      {selectedModel && (
        <BimModelViewer
          model={selectedModel}
          objectId={objectId}
          userEmail={userEmail}
          onClose={() => setSelectedModel(null)}
          canDelete={canUpload && (selectedModel.uploadedByUser?.email === userEmail || userRole === 'MASTER')}
          onDelete={handleDelete}
          userRole={userRole}
        />
      )}
    </div>
  );
}

