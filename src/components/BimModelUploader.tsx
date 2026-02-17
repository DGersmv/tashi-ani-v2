'use client';

import { useState } from 'react';

interface BimModelUploaderProps {
  objectId: number;
  projectId?: number | null;
  stageId?: number | null;
  onUploadSuccess: () => void;
  onCancel: () => void;
}

export default function BimModelUploader({
  objectId,
  projectId,
  stageId,
  onUploadSuccess,
  onCancel,
}: BimModelUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '',
    isVisibleToCustomer: false,
  });
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [viewableFile, setViewableFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    if (!originalFile) {
      setError('Пожалуйста, выберите исходный файл');
      setUploading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Пожалуйста, введите название модели');
      setUploading(false);
      return;
    }

    try {
      // Получаем email из localStorage
      const userEmail = localStorage.getItem('userEmail');
      const adminToken = localStorage.getItem('adminToken');
      
      if (!userEmail && !adminToken) {
        setError('Необходимо войти в систему');
        setUploading(false);
        return;
      }

      const uploadFormData = new FormData();
      uploadFormData.append('originalFile', originalFile);
      if (viewableFile) {
        uploadFormData.append('viewableFile', viewableFile);
      }
      uploadFormData.append('name', formData.name);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('version', formData.version);
      uploadFormData.append('isVisibleToCustomer', formData.isVisibleToCustomer.toString());
      if (projectId) {
        uploadFormData.append('projectId', projectId.toString());
      }
      if (stageId) {
        uploadFormData.append('stageId', stageId.toString());
      }

      // Формируем URL с email или используем токен
      const url = `/api/user/objects/${objectId}/models?email=${encodeURIComponent(userEmail || '')}`;
      const headers: HeadersInit = {};
      
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки модели');
      }

      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки модели');
    } finally {
      setUploading(false);
    }
  };

  const handleOriginalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalFile(file);
    }
  };

  const handleViewableFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext !== 'ifc' && ext !== 'gltf' && ext !== 'glb') {
        setError('Файл для просмотра должен быть в формате IFC или glTF/glB');
        return;
      }
      setViewableFile(file);
      setError('');
    }
  };

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) {
          onCancel();
        }
      }}
    >
      <div 
        style={{
        backgroundColor: "rgba(30, 30, 30, 0.95)",
        borderRadius: "16px",
        padding: "32px",
        maxWidth: "600px",
        width: "90%",
        maxHeight: "90vh",
        overflowY: "auto",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        position: "relative"
      }}
      onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          disabled={uploading}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            color: "white",
            cursor: uploading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            transition: "all 0.3s ease",
            opacity: uploading ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }
          }}
        >
          ×
        </button>
        <h2 style={{
          fontFamily: "ChinaCyr, sans-serif",
          fontSize: "1.75rem",
          fontWeight: "bold",
          margin: "0 0 24px 0",
          color: "white",
          paddingRight: "40px"
        }}>
          Загрузить 3D модель
        </h2>

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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Исходный файл (обязательный) */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "8px"
            }}>
              Исходный файл <span style={{ color: "rgba(239, 68, 68, 1)" }}>*</span>
            </label>
            <input
              type="file"
              accept=".skp,.rvt,.pln,.pla,.ifc,.gltf,.glb,.obj,.3ds"
              onChange={handleOriginalFileChange}
              required
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "white",
                fontSize: "0.875rem"
              }}
            />
            <p style={{
              marginTop: "8px",
              fontSize: "0.75rem",
              color: "rgba(255, 255, 255, 0.6)"
            }}>
              Поддерживаемые форматы: SketchUp (.skp), Revit (.rvt), ArchiCAD (.pln, .pla), IFC, glTF, OBJ, 3DS
            </p>
            {originalFile && (
              <p style={{
                marginTop: "8px",
                fontSize: "0.875rem",
                color: "rgba(255, 255, 255, 0.8)"
              }}>
                Выбран: {originalFile.name} ({(originalFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Файл для просмотра (опциональный) */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "8px"
            }}>
              Файл для просмотра (опционально)
            </label>
            <input
              type="file"
              accept=".ifc,.gltf,.glb"
              onChange={handleViewableFileChange}
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "white",
                fontSize: "0.875rem"
              }}
            />
            <p style={{
              marginTop: "8px",
              fontSize: "0.75rem",
              color: "rgba(255, 255, 255, 0.6)"
            }}>
              IFC или glTF/glB файл для просмотра в браузере. Если не указан, модель можно будет только скачать.
            </p>
            {viewableFile && (
              <p style={{
                marginTop: "8px",
                fontSize: "0.875rem",
                color: "rgba(255, 255, 255, 0.8)"
              }}>
                Выбран: {viewableFile.name} ({(viewableFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Название */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "8px"
            }}>
              Название модели <span style={{ color: "rgba(239, 68, 68, 1)" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: Модель дома v1.0"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "white",
                fontSize: "0.875rem"
              }}
            />
          </div>

          {/* Описание */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "8px"
            }}>
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Описание модели..."
              style={{
                width: "100%",
                padding: "10px 12px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "white",
                fontSize: "0.875rem",
                resize: "vertical",
                fontFamily: "inherit"
              }}
            />
          </div>

          {/* Версия */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "8px"
            }}>
              Версия
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="Например: v1.0, v2.1"
              style={{
                width: "100%",
                padding: "10px 12px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "white",
                fontSize: "0.875rem"
              }}
            />
          </div>

          {/* Видимость для заказчика */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              id="isVisibleToCustomer"
              checked={formData.isVisibleToCustomer}
              onChange={(e) => setFormData({ ...formData, isVisibleToCustomer: e.target.checked })}
              style={{
                width: "18px",
                height: "18px",
                cursor: "pointer"
              }}
            />
            <label htmlFor="isVisibleToCustomer" style={{
              marginLeft: "8px",
              fontSize: "0.875rem",
              color: "rgba(255, 255, 255, 0.9)",
              cursor: "pointer"
            }}>
              Видно заказчику (для уведомлений/статистики)
            </label>
          </div>

          {/* Кнопки */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            paddingTop: "16px",
            marginTop: "8px"
          }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={uploading}
              style={{
                padding: "10px 20px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.5 : 1,
                transition: "all 0.3s ease",
                fontFamily: "Arial, sans-serif",
                fontSize: "0.875rem"
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading) {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                }
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={uploading}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: uploading ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.8)",
                color: "white",
                cursor: uploading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                fontFamily: "Arial, sans-serif",
                fontSize: "0.875rem",
                fontWeight: "500"
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading) {
                  e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.8)";
                }
              }}
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

