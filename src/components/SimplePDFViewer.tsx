"use client";

import React, { useState } from 'react';

interface SimplePDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

export default function SimplePDFViewer({ fileUrl, fileName, onClose }: SimplePDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    setLoading(false);
    setError('Ошибка загрузки PDF файла');
    setShowFallback(true);
  };

  const openInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10000,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Заголовок и панель управления */}
      <div style={{
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h2 style={{
            fontFamily: "ChinaCyr, sans-serif",
            fontSize: "1.5rem",
            color: "white",
            margin: 0,
            maxWidth: "400px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            📄 {fileName}
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Кнопка открыть в новой вкладке */}
          <button
            onClick={openInNewTab}
            style={{
              padding: "8px 12px",
              backgroundColor: "rgba(59, 130, 246, 0.8)",
              border: "none",
              borderRadius: "6px",
              color: "white",
              cursor: "pointer",
              fontFamily: "Arial, sans-serif",
              fontSize: "0.9rem"
            }}
          >
            📄 Открыть в новой вкладке
          </button>

          {/* Кнопка скачивания */}
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = fileUrl;
              link.download = fileName;
              link.click();
            }}
            style={{
              padding: "8px 12px",
              backgroundColor: "rgba(34, 197, 94, 0.8)",
              border: "none",
              borderRadius: "6px",
              color: "white",
              cursor: "pointer",
              fontFamily: "Arial, sans-serif",
              fontSize: "0.9rem"
            }}
          >
            ⬇️ Скачать
          </button>

          {/* Кнопка закрытия */}
          <button
            onClick={onClose}
            style={{
              padding: "8px 12px",
              backgroundColor: "rgba(239, 68, 68, 0.8)",
              border: "none",
              borderRadius: "6px",
              color: "white",
              cursor: "pointer",
              fontFamily: "Arial, sans-serif",
              fontSize: "0.9rem"
            }}
          >
            ✕ Закрыть
          </button>
        </div>
      </div>

      {/* Область просмотра PDF */}
      <div style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        overflow: "auto"
      }}>
        {loading && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            color: "white"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "3px solid rgba(255,255,255,0.3)",
              borderTop: "3px solid white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}></div>
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: "1rem" }}>
              Загрузка PDF...
            </p>
          </div>
        )}

        {error && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            color: "white",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "3rem" }}>❌</div>
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: "1.2rem" }}>
              {error}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => window.open(fileUrl, '_blank')}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "rgba(34, 197, 94, 0.8)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "1rem"
                }}
              >
                📄 Открыть в новой вкладке
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "rgba(59, 130, 246, 0.8)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "1rem"
                }}
              >
                🔄 Попробовать снова
              </button>
            </div>
          </div>
        )}

        {!loading && !error && !showFallback && (
          <div style={{
            width: "100%",
            height: "100%",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            overflow: "hidden"
          }}>
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: "8px"
              }}
              onLoad={handleLoad}
              onError={handleError}
              title={fileName}
            />
          </div>
        )}

        {showFallback && (
          <div style={{
            width: "100%",
            height: "100%",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>📄</div>
            <h3 style={{ 
              fontFamily: "ChinaCyr, sans-serif", 
              fontSize: "1.5rem", 
              color: "#333", 
              margin: "0 0 16px 0" 
            }}>
              {fileName}
            </h3>
            <p style={{ 
              fontFamily: "Arial, sans-serif", 
              fontSize: "1rem", 
              color: "#666", 
              margin: "0 0 24px 0" 
            }}>
              PDF не может быть отображен в этом окне.<br />
              Нажмите кнопку выше, чтобы открыть в новой вкладке.
            </p>
            <button
              onClick={openInNewTab}
              style={{
                padding: "12px 24px",
                backgroundColor: "#3b82f6",
                border: "none",
                borderRadius: "8px",
                color: "white",
                cursor: "pointer",
                fontFamily: "Arial, sans-serif",
                fontSize: "1rem",
                fontWeight: "bold"
              }}
            >
              📄 Открыть PDF в новой вкладке
            </button>
          </div>
        )}
      </div>

      {/* Стили для анимации */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
