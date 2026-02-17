'use client';

import React, { useState } from 'react';

interface PanoramasPanelProps {
  objectId: string;
  adminToken: string;
  onPanoramasUpdate: () => void;
}

export default function PanoramasPanel({ objectId, adminToken, onPanoramasUpdate }: PanoramasPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const handleFileUpload = async (files: FileList) => {
    if (!objectId || !adminToken) {
      setError('Ошибка: ID объекта или токен отсутствуют.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setStatusMessage(null);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`/api/admin/objects/${objectId}/panoramas`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            successCount++;
          } else {
            errorCount++;
            console.error('Ошибка загрузки панорамы:', data.message);
          }
        } else {
          errorCount++;
          const errorData = await response.json().catch(() => ({}));
          console.error('Ошибка сервера:', errorData.message || `Статус: ${response.status}`);
        }
      } catch (err) {
        errorCount++;
        console.error('Ошибка сети при загрузке панорамы:', err);
      }

      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    if (successCount > 0 && errorCount === 0) {
      setStatusMessage({ type: 'success', message: `Загружено панорам: ${successCount}` });
      onPanoramasUpdate();
    } else if (successCount > 0 && errorCount > 0) {
      setStatusMessage({ type: 'info', message: `Загружено: ${successCount}, ошибок: ${errorCount}` });
      onPanoramasUpdate();
    } else {
      setError(`Ошибка загрузки всех панорам (${errorCount})`);
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '24px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '24px',
      }}
    >
      <h3
        style={{
          fontFamily: 'ChinaCyr, sans-serif',
          fontSize: '1.25rem',
          color: 'white',
          margin: '0 0 16px 0',
        }}
      >
        Загрузить панорамы
      </h3>

      <div
        style={{
          border: `2px dashed ${dragOver ? 'rgba(34, 197, 94, 0.8)' : 'rgba(255, 255, 255, 0.3)'}`,
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          backgroundColor: dragOver ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('panorama-file-input')?.click()}
      >
        <div
          style={{
            fontSize: '3rem',
            marginBottom: '16px',
          }}
        >
          🌀
        </div>

        <p
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '1rem',
            color: 'white',
            margin: '0 0 8px 0',
          }}
        >
          {dragOver ? 'Отпустите файлы для загрузки' : 'Перетащите панорамы сюда или нажмите для выбора'}
        </p>

        <p
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: 0,
          }}
        >
          Поддерживаются изображения формата JPG, PNG, WEBP (360°).
        </p>

        <input
          id="panorama-file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div
          style={{
            marginTop: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '0.875rem',
              color: 'white',
              margin: '0 0 8px 0',
            }}
          >
            Загружаются панорамы... {uploadProgress}%
          </p>
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: 'rgba(34, 197, 94, 1)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '0.875rem',
              color: 'rgba(239, 68, 68, 1)',
              margin: 0,
            }}
          >
            {error}
          </p>
        </div>
      )}

      {statusMessage && (
        <div
          style={{
            marginTop: '16px',
            backgroundColor: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(59, 130, 246, 0.12)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}
        >
          <p
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '0.875rem',
              color: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 1)' : 'rgba(59, 130, 246, 1)',
              margin: 0
            }}
          >
            {statusMessage.message}
          </p>
        </div>
      )}
    </div>
  );
}

