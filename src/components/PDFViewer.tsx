"use client";

import React, { useState, useRef, useEffect } from 'react';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

export default function PDFViewer({ fileUrl, fileName, onClose }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Симуляция загрузки
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [fileUrl]);

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const openInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  if (loading) {
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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white"
      }}>
        <div style={{
          width: "50px",
          height: "50px",
          border: "4px solid rgba(255,255,255,0.3)",
          borderTop: "4px solid white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <p style={{ marginTop: "20px", fontSize: "1.2rem" }}>Загрузка PDF...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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
              fontSize: "0.9rem"
            }}
          >
            📄 Открыть в новой вкладке
          </button>

          {/* Кнопка скачивания */}
          <button
            onClick={downloadPDF}
            style={{
              padding: "8px 12px",
              backgroundColor: "rgba(34, 197, 94, 0.8)",
              border: "none",
              borderRadius: "6px",
              color: "white",
              cursor: "pointer",
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
        overflow: "auto",
        backgroundColor: "#f5f5f5"
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Информация о файле */}
          <div style={{
            padding: "12px 16px",
            backgroundColor: "#f8f9fa",
            borderBottom: "1px solid #dee2e6",
            fontSize: "0.9rem",
            color: "#495057",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>📄 {fileName}</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={zoomOut}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#e9ecef",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem"
                }}
              >
                🔍-
              </button>
              <span style={{ fontSize: "0.8rem", minWidth: "50px", textAlign: "center" }}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#e9ecef",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem"
                }}
              >
                🔍+
              </button>
            </div>
          </div>
          
          {/* PDF в iframe */}
          <div style={{ flex: 1, position: "relative" }}>
            <iframe
              ref={iframeRef}
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=${Math.round(scale * 100)}`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: "0 0 8px 8px"
              }}
              title={fileName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
