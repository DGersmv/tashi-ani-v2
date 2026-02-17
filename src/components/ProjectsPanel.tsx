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
  documentType: string;
}

interface ProjectsPanelProps {
  projectId: number;
  documents: Document[];
  adminToken: string;
  onDocumentsUpdate: () => void;
}

export default function ProjectsPanel({
  projectId,
  documents,
  adminToken,
  onDocumentsUpdate
}: ProjectsPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPDF, setSelectedPDF] = useState<{ id: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setUploadProgress(100);
        onDocumentsUpdate();
        // Очищаем input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        alert(`Ошибка загрузки файлов: ${result.message}`);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      alert('Ошибка загрузки файлов');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
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

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      default:
        return '📎';
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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const result = await response.json();

      if (result.success) {
        onDocumentsUpdate();
      } else {
        alert(`Ошибка удаления: ${result.message}`);
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления документа');
    }
  };

  const togglePaymentStatus = async (documentId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${documentId}/payment`, {
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

  return (
    <div className="space-y-6">
      {/* Загрузка файлов */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          📁 Загрузка документов проекта
        </h3>
        
        <div
          className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-white/50 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-4xl mb-4">📤</div>
          <p className="text-white/80 mb-2">
            Перетащите файлы сюда или нажмите для выбора
          </p>
          <p className="text-sm text-white/60">
            Поддерживаются: PDF, изображения, документы
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {isUploading && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-white/80 mb-2">
              <span>Загрузка...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Список документов */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          📋 Документы проекта ({documents.length})
        </h3>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <div className="text-4xl mb-4">📄</div>
            <p>Документы не загружены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getFileIcon(document.originalName)}</span>
                    <div>
                      <h4 className="font-medium text-white text-sm truncate" title={document.originalName}>
                        {document.originalName}
                      </h4>
                      <p className="text-xs text-white/60">
                        {formatFileSize(document.fileSize)} • {formatDate(document.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Статус оплаты */}
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      document.isPaid 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {document.isPaid ? '✅ Оплачен' : '❌ Не оплачен'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {document.mimeType === 'application/pdf' && (
                    <button
                      onClick={() => openPDF(document)}
                      className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      👁️ Просмотр
                    </button>
                  )}
                  
                  <button
                    onClick={() => togglePaymentStatus(document.id, document.isPaid)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      document.isPaid
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                        : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                    }`}
                  >
                    {document.isPaid ? '❌ Снять оплату' : '✅ Оплатить'}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteDocument(document.id)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      {selectedPDF && (
        <SecurePDFViewer
          documentId={selectedPDF.id}
          fileName={selectedPDF.name}
          onClose={() => setSelectedPDF(null)}
          source="projects"
          isAdmin={true}
        />
      )}
    </div>
  );
}
