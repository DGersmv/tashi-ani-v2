"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Folder {
  id: number;
  name: string;
  orderIndex: number;
  photoCount: number;
  createdAt: string;
}

interface Photo {
  id: number;
  filename: string;
  originalName: string;
  uploadedAt: string;
  url?: string;
}

interface CustomerPhotosPanelProps {
  objectId: number;
  adminToken: string;
  onPhotosUpdate: () => void;
  onFolderSelect?: (folderId: number | null) => void;
  selectedFolder?: number | null;
}

export default function CustomerPhotosPanel({ objectId, adminToken, onPhotosUpdate, onFolderSelect, selectedFolder }: CustomerPhotosPanelProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderPhotos, setFolderPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  // Загрузка папок
  useEffect(() => {
    loadFolders();
  }, [objectId]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/objects/${objectId}/folders`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error("Ошибка загрузки папок:", error);
    } finally {
      setLoading(false);
    }
  };

  // Создание папки
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert("Введите название папки");
      return;
    }

    try {
      const response = await fetch(`/api/admin/objects/${objectId}/folders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setFolders([...folders, data.folder]);
        setNewFolderName("");
        setCreatingFolder(false);
        onPhotosUpdate();
      } else {
        alert(data.message || "Ошибка создания папки");
      }
    } catch (error) {
      console.error("Ошибка создания папки:", error);
      alert("Ошибка создания папки");
    }
  };

  // Переименование папки
  const handleRenameFolder = async (folder: Folder) => {
    if (!editFolderName.trim()) {
      alert("Введите новое название папки");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/objects/${objectId}/folders/${folder.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: editFolderName.trim() }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setFolders(folders.map((f) => (f.id === folder.id ? data.folder : f)));
        setEditingFolder(null);
        setEditFolderName("");
        onPhotosUpdate();
      } else {
        alert(data.message || "Ошибка переименования папки");
      }
    } catch (error) {
      console.error("Ошибка переименования папки:", error);
      alert("Ошибка переименования папки");
    }
  };

  // Удаление папки
  const handleDeleteFolder = async (folder: Folder) => {
    if (!confirm(`Удалить папку "${folder.name}"? Фото останутся в объекте.`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/objects/${objectId}/folders/${folder.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setFolders(folders.filter((f) => f.id !== folder.id));
        if (selectedFolder?.id === folder.id) {
          setSelectedFolder(null);
        }
        onPhotosUpdate();
      } else {
        alert(data.message || "Ошибка удаления папки");
      }
    } catch (error) {
      console.error("Ошибка удаления папки:", error);
      alert("Ошибка удаления папки");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#a0a0a0" }}>
        Загрузка папок...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Заголовок и кнопка создания */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#e5e5e5" }}>
          Папки для заказчика
        </h3>
        <button
          onClick={() => setCreatingFolder(true)}
          style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg, #d3a373 0%, #b8895f 100%)",
            border: "none",
            borderRadius: "8px",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          + Создать папку
        </button>
      </div>

      {/* Форма создания папки */}
      <AnimatePresence>
        {creatingFolder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Название папки"
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "6px",
                color: "white",
                marginBottom: "12px",
              }}
              onKeyPress={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCreateFolder}
                style={{
                  padding: "8px 16px",
                  background: "#22c55e",
                  border: "none",
                  borderRadius: "6px",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Создать
              </button>
              <button
                onClick={() => {
                  setCreatingFolder(false);
                  setNewFolderName("");
                }}
                style={{
                  padding: "8px 16px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "6px",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Отмена
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Описание */}
      <div
        style={{
          padding: "16px",
          background: "rgba(211, 163, 115, 0.1)",
          borderRadius: "8px",
          marginBottom: "24px",
          color: "#d3a373",
          fontSize: "0.9rem",
        }}
      >
        <p style={{ margin: 0 }}>
          📁 Здесь вы управляете папками для организации фотографий заказчика.
          <br />
          💡 Чтобы добавить фото в папку, перейдите во вкладку "Фото" и назначьте
          фотографии в нужные папки.
        </p>
      </div>

      {/* Список папок */}
      {folders.length === 0 ? (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            color: "#808080",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "8px",
          }}
        >
          Папок пока нет. Создайте первую папку для организации фотографий.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Кнопка "Показать все фото" */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => {
              if (onFolderSelect) {
                onFolderSelect(null);
              }
            }}
            style={{
              background: selectedFolder === null 
                ? "rgba(211, 163, 115, 0.2)" 
                : "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(10px)",
              border: selectedFolder === null 
                ? "1.5px solid rgba(211, 163, 115, 0.8)" 
                : "1.5px solid rgba(211, 163, 115, 0.3)",
              borderRadius: "12px",
              padding: "20px",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            whileHover={{ scale: 1.02, borderColor: "rgba(211, 163, 115, 0.6)" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <h4
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "#e5e5e5",
                  margin: 0,
                }}
              >
                📷 Все фото
              </h4>
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "#a0a0a0",
              }}
            >
              Показать все видимые фото
            </div>
          </motion.div>

          {folders.map((folder) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => {
                if (onFolderSelect) {
                  onFolderSelect(folder.id);
                }
              }}
              style={{
                background: selectedFolder === folder.id 
                  ? "rgba(211, 163, 115, 0.2)" 
                  : "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(10px)",
                border: selectedFolder === folder.id 
                  ? "1.5px solid rgba(211, 163, 115, 0.8)" 
                  : "1.5px solid rgba(211, 163, 115, 0.3)",
                borderRadius: "12px",
                padding: "20px",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              whileHover={{ scale: 1.02, borderColor: "rgba(211, 163, 115, 0.6)" }}
            >
              {editingFolder?.id === folder.id ? (
                <div>
                  <input
                    type="text"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "6px",
                      color: "white",
                      marginBottom: "8px",
                    }}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleRenameFolder(folder)
                    }
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleRenameFolder(folder)}
                      style={{
                        padding: "6px 12px",
                        background: "#22c55e",
                        border: "none",
                        borderRadius: "6px",
                        color: "white",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setEditingFolder(null);
                        setEditFolderName("");
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        borderRadius: "6px",
                        color: "white",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        color: "#e5e5e5",
                        margin: 0,
                      }}
                    >
                      📁 {folder.name}
                    </h4>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder);
                          setEditFolderName(folder.name);
                        }}
                        style={{
                          padding: "4px 8px",
                          background: "rgba(255, 255, 255, 0.1)",
                          border: "none",
                          borderRadius: "4px",
                          color: "#d3a373",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                        title="Переименовать"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                        style={{
                          padding: "4px 8px",
                          background: "rgba(239, 68, 68, 0.2)",
                          border: "none",
                          borderRadius: "4px",
                          color: "#ef4444",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                        title="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: "#a0a0a0",
                    }}
                  >
                    {folder.photoCount === 0
                      ? "Пока нет фото"
                      : `${folder.photoCount} ${
                          folder.photoCount === 1
                            ? "фотография"
                            : folder.photoCount < 5
                            ? "фотографии"
                            : "фотографий"
                        }`}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
