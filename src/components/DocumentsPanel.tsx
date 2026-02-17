"use client";

import React, { useState, useRef } from 'react';
import SecurePDFViewer from './SecurePDFViewer';

interface Document {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  isPaid: boolean;
}

interface DocumentsPanelProps {
  objectId: number;
  documents: Document[];
  adminToken: string;
  onDocumentsUpdate: () => void;
  requirePaymentCheck?: boolean; // Для проектов - обязательная проверка оплаты
}

export default function DocumentsPanel({
  objectId,
  documents,
  adminToken,
  onDocumentsUpdate,
  requirePaymentCheck = false
}: DocumentsPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPDF, setSelectedPDF] = useState<{ id: number; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(`/api/admin/objects/${objectId}/documents?documentId=${documentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const result = await response.json();
      if (result.success) {
        onDocumentsUpdate();
        setShowDeleteConfirm(false);
        setDocumentToDelete(null);
      } else {
        alert('Ошибка удаления: ' + result.message);
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления документа');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDocumentToDelete(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Симуляция прогресса загрузки
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Создаем FormData для загрузки
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('documentType', 'OTHER');

      console.log('Uploading documents with token:', adminToken ? adminToken.substring(0, 20) + '...' : 'No token');

      const apiEndpoint = requirePaymentCheck 
        ? `/api/admin/objects/${objectId}/project-documents`
        : `/api/admin/objects/${objectId}/documents`;
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          onDocumentsUpdate(); // Обновляем список документов
        }, 500);
      } else {
        throw new Error(result.message || 'Ошибка загрузки');
      }
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
      setIsUploading(false);
      setUploadProgress(0);
      alert('Ошибка загрузки файлов: ' + (error as Error).message);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload({ target: { files } } as any);
    }
  };

  const openPDF = (document: Document) => {
    setSelectedPDF({
      id: document.id,
      name: document.originalName
    });
  };

  const togglePaymentStatus = async (documentId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/objects/${objectId}/documents/${documentId}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isPaid: !currentStatus })
      });

      const result = await response.json();

      if (result.success) {
        onDocumentsUpdate();
      } else {
        alert(`Ошибка изменения статуса: ${result.message}`);
      }
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
      alert('Ошибка изменения статуса оплаты');
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'DOC';
      case 'xls':
      case 'xlsx':
        return 'XLS';
      case 'ppt':
      case 'pptx':
        return 'PPT';
      case 'txt':
        return 'TXT';
      case 'zip':
      case 'rar':
        return 'ZIP';
      default:
        return 'FILE';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      color: "white",
      padding: "24px"
    }}>
      {/* Заголовок - только для обычных документов, не для проектов */}
      {!requirePaymentCheck && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px"
        }}>
          <h3 style={{
            fontFamily: "ChinaCyr, sans-serif",
            fontSize: "1.5rem",
            margin: 0,
            color: "white"
          }}>
            Документы ({documents.length})
          </h3>
        </div>
      )}

      {/* Область загрузки */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: "2px dashed rgba(255, 255, 255, 0.3)",
          borderRadius: "12px",
          padding: "32px",
          textAlign: "center",
          marginBottom: "24px",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />
        
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}></div>
        <h4 style={{
          fontFamily: "ChinaCyr, sans-serif",
          fontSize: "1.2rem",
          margin: "0 0 8px 0",
          color: "white"
        }}>
          Загрузить документы
        </h4>
        <p style={{
          color: "rgba(255, 255, 255, 0.7)",
          margin: "0 0 16px 0",
          fontSize: "0.9rem"
        }}>
          Перетащите файлы сюда или нажмите для выбора
        </p>
        <p style={{
          color: "rgba(255, 255, 255, 0.5)",
          margin: 0,
          fontSize: "0.8rem"
        }}>
          Поддерживаются: PDF, DOC, XLS, PPT, TXT, ZIP, RAR
        </p>

        {/* Прогресс загрузки */}
        {isUploading && (
          <div style={{
            marginTop: "16px",
            width: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: "6px",
              backgroundColor: "#3b82f6",
              transition: "width 0.3s ease"
            }}></div>
            <p style={{
              margin: "8px 0 0 0",
              fontSize: "0.9rem",
              color: "white"
            }}>
              Загрузка... {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      {/* Список документов */}
      {documents.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px",
          color: "rgba(255, 255, 255, 0.5)"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}></div>
          <p style={{ fontFamily: "ChinaCyr, sans-serif", fontSize: "1.1rem" }}>
            Документы не загружены
          </p>
          <p style={{ fontSize: "0.9rem" }}>
            Загрузите документы для отображения в этом списке
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "16px"
        }}>
          {documents.map((document) => (
            <div
              key={document.id}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Заголовок документа */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px"
              }}>
                <div style={{ fontSize: "1.5rem" }}>
                  {getFileIcon(document.filename)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    fontFamily: "ChinaCyr, sans-serif",
                    fontSize: "1rem",
                    margin: "0 0 4px 0",
                    color: "white",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {document.originalName}
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "rgba(255, 255, 255, 0.6)"
                  }}>
                    {formatFileSize(document.fileSize)} • {formatDate(document.uploadedAt)}
                  </p>
                </div>
              </div>

              {/* Статус оплаты для проектов */}
              {requirePaymentCheck && (
                <div style={{
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontFamily: "Arial, sans-serif",
                    backgroundColor: document.isPaid ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    color: document.isPaid ? "#22c55e" : "#ef4444",
                    border: `1px solid ${document.isPaid ? "#22c55e" : "#ef4444"}`
                  }}>
                    {document.isPaid ? "Оплачен" : "Не оплачен"}
                  </span>
                </div>
              )}

              {/* Действия - в две строки */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                {/* Первая строка - основные действия */}
                <div style={{
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap"
                }}>
                  {/* Просмотр PDF */}
                  {document.mimeType === 'application/pdf' && (
                    <button
                      onClick={() => openPDF(document)}
                      style={{
                        padding: "6px 10px",
                        backgroundColor: "rgba(59, 130, 246, 0.8)",
                        border: "none",
                        borderRadius: "6px",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontFamily: "Arial, sans-serif",
                        flex: "1",
                        minWidth: "80px"
                      }}
                    >
                      Просмотр
                    </button>
                  )}

                  {/* Скачать */}
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/uploads/objects/${objectId}/${document.filename}`;
                      link.download = document.originalName;
                      link.click();
                    }}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "rgba(34, 197, 94, 0.8)",
                      border: "none",
                      borderRadius: "6px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontFamily: "Arial, sans-serif",
                      flex: "1",
                      minWidth: "80px"
                    }}
                  >
                    Скачать
                  </button>
                </div>

                {/* Вторая строка - управление оплатой и удаление */}
                <div style={{
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap"
                }}>
                  {/* Кнопка изменения статуса оплаты для проектов */}
                  {requirePaymentCheck && (
                    <button
                      onClick={() => togglePaymentStatus(document.id, document.isPaid)}
                      style={{
                        padding: "6px 10px",
                        backgroundColor: document.isPaid ? "rgba(239, 68, 68, 0.8)" : "rgba(34, 197, 94, 0.8)",
                        border: "none",
                        borderRadius: "6px",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontFamily: "Arial, sans-serif",
                        flex: "1",
                        minWidth: "100px"
                      }}
                    >
                      {document.isPaid ? "Снять оплату" : "Оплачено"}
                    </button>
                  )}

                  {/* Удалить */}
                  <button
                    onClick={() => {
                      setDocumentToDelete(document.id);
                      setShowDeleteConfirm(true);
                    }}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "rgba(239, 68, 68, 0.8)",
                      border: "none",
                      borderRadius: "6px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontFamily: "Arial, sans-serif",
                      flex: "1",
                      minWidth: "80px"
                    }}
                    title="Удалить документ"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Viewer */}
      {selectedPDF && (
        <SecurePDFViewer
          documentId={selectedPDF.id}
          fileName={selectedPDF.name}
          onClose={() => setSelectedPDF(null)}
          source={requirePaymentCheck ? "projects" : "documents"}
          isAdmin={true}
          adminToken={adminToken}
        />
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div style={{
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
          pointerEvents: "auto"
        }}>
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            padding: "32px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            maxWidth: "400px",
            width: "90%",
            textAlign: "center"
          }}>
            <h3 style={{
              fontFamily: "ChinaCyr, sans-serif",
              fontSize: "1.5rem",
              color: "white",
              margin: "0 0 20px 0"
            }}>
              Подтверждение удаления
            </h3>
            <p style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "1rem",
              color: "rgba(255, 255, 255, 0.8)",
              margin: "0 0 24px 0",
              lineHeight: "1.5"
            }}>
              Вы уверены, что хотите удалить этот документ?
            </p>
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center"
            }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  backgroundColor: "rgba(107, 114, 128, 0.8)",
                  border: "none",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontFamily: "Arial, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(107, 114, 128, 1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(107, 114, 128, 0.8)";
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.8)",
                  border: "none",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontFamily: "Arial, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.8)";
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
