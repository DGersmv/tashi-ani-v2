"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useViewMode } from "./ui/ViewMode";

interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
}

interface AdminCustomerPanelsProps {
  adminToken: string;
}

export default function AdminCustomerPanels({ adminToken }: AdminCustomerPanelsProps) {
  const { setMode } = useViewMode();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    password: ""
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<{[key: number]: number}>({});
  const [unreadComments, setUnreadComments] = useState<{[key: number]: number}>({});
  const [totalMessages, setTotalMessages] = useState<{[key: number]: number}>({});
  const [totalComments, setTotalComments] = useState<{[key: number]: number}>({});
  const [userObjectCounts, setUserObjectCounts] = useState<{[key: number]: number}>({});

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        // Фильтруем только обычных пользователей (не мастер-админов)
        const regularUsers = data.users.filter((user: User) => user.role === 'USER');
        setUsers(regularUsers);
        // Загружаем статистику для каждого пользователя
        fetchUserStats(regularUsers);
      } else {
        setError(data.message || "Не удалось загрузить пользователей");
      }
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
      setError("Ошибка сети при загрузке пользователей");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (usersList: User[]) => {
    const unreadMsgs: {[key: number]: number} = {};
    const unreadComms: {[key: number]: number} = {};
    const totalMsgs: {[key: number]: number} = {};
    const totalComms: {[key: number]: number} = {};
    const objectCounts: {[key: number]: number} = {};
    
    for (const user of usersList) {
      try {
        const response = await fetch(`/api/admin/users/${user.id}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          unreadMsgs[user.id] = data.user.unreadMessagesCount || 0;
          unreadComms[user.id] = data.user.unreadCommentsCount || 0;
          totalMsgs[user.id] = data.user.totalMessagesCount || 0;
          totalComms[user.id] = data.user.totalCommentsCount || 0;
          objectCounts[user.id] = data.user.objects ? data.user.objects.length : 0;
        } else {
          unreadMsgs[user.id] = 0;
          unreadComms[user.id] = 0;
          totalMsgs[user.id] = 0;
          totalComms[user.id] = 0;
          objectCounts[user.id] = 0;
        }
      } catch (err) {
        console.error(`Ошибка загрузки статистики для пользователя ${user.id}:`, err);
        unreadMsgs[user.id] = 0;
        unreadComms[user.id] = 0;
        totalMsgs[user.id] = 0;
        totalComms[user.id] = 0;
        objectCounts[user.id] = 0;
      }
    }
    
    setUnreadMessages(unreadMsgs);
    setUnreadComments(unreadComms);
    setTotalMessages(totalMsgs);
    setTotalComments(totalComms);
    setUserObjectCounts(objectCounts);
  };

  useEffect(() => {
    if (adminToken) {
      fetchUsers();
    }
  }, [adminToken]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ 
          email: newUserEmail, 
          name: newUserName, 
          password: newUserPassword,
          role: "USER" 
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNewUserEmail("");
        setNewUserName("");
        setNewUserPassword("");
        setShowPassword(false);
        setShowAddForm(false);
        fetchUsers(); // Обновляем список
      } else {
        setError(data.message || "Не удалось добавить пользователя");
      }
    } catch (err) {
      setError("Ошибка сети при добавлении пользователя");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleEditUser = async (user: User) => {
    setEditingUser(user);
    
    // Загружаем полную информацию о пользователе
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        const userData = data.user;
        const metadata = userData.metadata ? JSON.parse(userData.metadata) : {};
        
        setEditForm({
          name: userData.name || "",
          email: userData.email,
          phone: metadata.phone || "",
          company: metadata.company || "",
          notes: metadata.notes || ""
        });
      } else {
        // Fallback к базовой информации
        setEditForm({
          name: user.name || "",
          email: user.email,
          phone: "",
          company: "",
          notes: ""
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
      // Fallback к базовой информации
      setEditForm({
        name: user.name || "",
        email: user.email,
        phone: "",
        company: "",
        notes: ""
      });
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...editForm,
          password: editForm.password || undefined
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEditingUser(null);
        setShowEditPassword(false);
        fetchUsers(); // Обновляем список
      } else {
        setError(data.message || "Не удалось обновить заказчика");
      }
    } catch (err) {
      setError("Ошибка сети при обновлении заказчика");
    }
  };

  const handleDeleteUser = async (id: number) => {
    const user = users.find(u => u.id === id);
    if (user) {
      setUserToDelete(user);
      setShowDeleteConfirm(true);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setError(null);
    try {
      const response = await fetch(`/api/admin/users?id=${userToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ id: userToDelete.id }),
      });
      const data = await response.json();
      if (data.success) {
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        fetchUsers(); // Обновляем список
      } else {
        setError(data.message || "Не удалось удалить пользователя");
      }
    } catch (err) {
      setError("Ошибка сети при удалении пользователя");
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleManageObjects = (customer: User) => {
    // Сохраняем информацию о заказчике для админского просмотра объектов
    localStorage.setItem('adminViewingCustomer', JSON.stringify({
      id: customer.id,
      email: customer.email,
      name: customer.name || 'Без имени'
    }));
    setMode("admin-objects");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: "white", padding: "40px" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(255,255,255,0.3)",
          borderTop: "3px solid white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 20px"
        }}></div>
        <p style={{ fontFamily: "Arial, sans-serif" }}>Загрузка заказчиков...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: "1200px", 
      margin: "0 auto",
      position: "relative",
      zIndex: 1,
      isolation: "isolate"
    }}>
      {/* Заголовок и кнопка добавления */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "32px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <h2 style={{
          fontFamily: "ChinaCyr, sans-serif",
          fontSize: "2rem",
          color: "white",
          margin: 0
        }}>
          Заказчики ({users.length})
        </h2>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: "12px 24px",
            borderRadius: "8px",
            border: "none",
            background: "rgba(34, 197, 94, 0.8)",
            color: "white",
            fontFamily: "ChinaCyr, sans-serif",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(34, 197, 94, 1)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(34, 197, 94, 0.8)";
          }}
        >
          + Добавить заказчика
        </button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 32,
            color: "white"
          }}
        >
          <h3 style={{
            fontFamily: "ChinaCyr, sans-serif",
            fontSize: "1.5rem",
            marginBottom: 20,
            textAlign: "center"
          }}>
            Добавить нового заказчика
          </h3>
          
          <form onSubmit={handleAddUser} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input
              type="email"
              placeholder="Email заказчика"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "1rem",
                fontFamily: "Arial, sans-serif"
              }}
            />
            <input
              type="text"
              placeholder="Имя заказчика (необязательно)"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "1rem",
                fontFamily: "Arial, sans-serif"
              }}
            />
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Пароль (минимум 6 символов)"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 50px 12px 16px",
                  borderRadius: 8,
                  border: "2px solid rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  fontSize: "1rem",
                  fontFamily: "Arial, sans-serif",
                  fontWeight: "bold"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  fontSize: "18px",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = "rgba(255,255,255,1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "transparent",
                  color: "white",
                  fontSize: "1rem",
                  cursor: "pointer"
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isAddingUser}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: isAddingUser ? "rgba(34, 197, 94, 0.5)" : "rgba(34, 197, 94, 0.8)",
                  color: "white",
                  fontSize: "1rem",
                  cursor: isAddingUser ? "not-allowed" : "pointer"
                }}
              >
                {isAddingUser ? "Добавляем..." : "Добавить"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Ошибки */}
      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          color: "#ef4444",
          fontFamily: "Arial, sans-serif"
        }}>
          {error}
        </div>
      )}

      {/* Сетка панелей заказчиков */}
      {users.length === 0 ? (
        <div style={{
          textAlign: "center",
          color: "rgba(255,255,255,0.6)",
          padding: "60px 20px",
          fontFamily: "Arial, sans-serif"
        }}>
          <p style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Заказчики не найдены</p>
          <p>Нажмите "Добавить заказчика" чтобы создать первого</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "20px",
          padding: "0 4px"
        }}>
          {users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.44, 0.13, 0.35, 1.08] }}
              whileHover={{ y: -6, scale: 1.015 }}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1.3 / 1",
                borderRadius: "1rem",
                overflow: "hidden",
                cursor: "pointer"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(32px)",
                  border: "2px solid rgba(211,163,115,0.6)",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "stretch"
                }}
              >
                {/* Фоновый градиент */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(135deg, 
                      rgba(211,163,115,0.3) 0%, 
                      rgba(34,197,94,0.2) 50%, 
                      rgba(59,130,246,0.2) 100%)`,
                    filter: "saturate(105%) brightness(0.9)"
                  }}
                />
                
                {/* Вуаль */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,.25))",
                  }}
                />
                

                {/* Информация о заказчике */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    width: "100%",
                    padding: "18px 20px",
                    color: "white",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <h3 style={{ 
                      fontWeight: 800, 
                      fontSize: "1.1rem", 
                      lineHeight: 1.2,
                      fontFamily: "ChinaCyr, sans-serif"
                    }}>
                      {user.name || "Без имени"}
                    </h3>
                  </div>
                  
                  <p style={{ 
                    fontSize: 14, 
                    color: "rgba(255,255,255,.9)",
                    fontFamily: "Arial, sans-serif",
                    margin: 0
                  }}>
                    {user.email}
                  </p>
                  
                  <div style={{ 
                    fontSize: 12, 
                    color: "rgba(255,255,255,.7)",
                    fontFamily: "Arial, sans-serif"
                  }}>
                    Регистрация: {formatDate(user.createdAt)}
                  </div>
                  
                  {user.lastLogin && (
                    <div style={{ 
                      fontSize: 12, 
                      color: "rgba(255,255,255,.6)",
                      fontFamily: "Arial, sans-serif"
                    }}>
                      Последний вход: {formatDate(user.lastLogin)}
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: 12, 
                    color: "rgba(255,255,255,.8)",
                    fontFamily: "Arial, sans-serif",
                    fontWeight: 500,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}>
                    <div>Объектов: {userObjectCounts[user.id] || 0}</div>
                    <div style={{
                      color: (unreadMessages[user.id] || 0) > 0 ? "#d3a373" : "rgba(255,255,255,.8)"
                    }}>
                      💬 Сообщений: {totalMessages[user.id] || 0} 
                      {(unreadMessages[user.id] || 0) > 0 && (
                        <span style={{ 
                          color: "#ef4444", 
                          fontWeight: 700,
                          marginLeft: "4px" 
                        }}>
                          ({unreadMessages[user.id]} новых)
                        </span>
                      )}
                    </div>
                    <div style={{
                      color: (unreadComments[user.id] || 0) > 0 ? "#d3a373" : "rgba(255,255,255,.8)"
                    }}>
                      📷 Комментариев: {totalComments[user.id] || 0}
                      {(unreadComments[user.id] || 0) > 0 && (
                        <span style={{ 
                          color: "#ef4444", 
                          fontWeight: 700,
                          marginLeft: "4px" 
                        }}>
                          ({unreadComments[user.id]} новых)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Кнопки действий */}
                  <div style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 12
                  }}>
                    <button
                      onClick={() => handleManageObjects(user)}
                      style={{
                        flex: 1,
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid rgba(211, 163, 115, 0.5)",
                        background: "rgba(211, 163, 115, 0.1)",
                        color: "rgba(211, 163, 115, 1)",
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontWeight: 600
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "rgba(211, 163, 115, 0.2)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "rgba(211, 163, 115, 0.1)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      Объекты
                    </button>
                    <button
                      onClick={() => handleEditUser(user)}
                      style={{
                        flex: 1,
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid rgba(34, 197, 94, 0.5)",
                        background: "rgba(34, 197, 94, 0.1)",
                        color: "rgba(34, 197, 94, 1)",
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontWeight: 600
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "rgba(34, 197, 94, 0.2)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "rgba(34, 197, 94, 0.1)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      Редактировать
                    </button>
                  </div>
                  
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Модальное окно редактирования заказчика */}
      {editingUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
          pointerEvents: "auto"
        }}>
          <div style={{
            backgroundColor: "rgba(30, 30, 30, 0.95)",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}>
              <h2 style={{
                color: "white",
                fontFamily: "ChinaCyr, sans-serif",
                fontSize: "1.5rem",
                margin: 0
              }}>
                Редактирование заказчика
              </h2>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setShowEditPassword(false);
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.8)",
                  border: "none",
                  borderRadius: "6px",
                  color: "white",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  fontWeight: "bold"
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{
                  display: "block",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.9rem",
                  marginBottom: "6px",
                  fontWeight: "600"
                }}>
                  Имя
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem"
                  }}
                  placeholder="Введите имя заказчика"
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.9rem",
                  marginBottom: "6px",
                  fontWeight: "600"
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem"
                  }}
                  placeholder="Введите email заказчика"
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.9rem",
                  marginBottom: "6px",
                  fontWeight: "600"
                }}>
                  Телефон
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem"
                  }}
                  placeholder="Введите телефон заказчика"
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.9rem",
                  marginBottom: "6px",
                  fontWeight: "600"
                }}>
                  Компания
                </label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem"
                  }}
                  placeholder="Введите название компании"
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.9rem",
                  marginBottom: "6px",
                  fontWeight: "600"
                }}>
                  Новый пароль (оставьте пустым, чтобы не менять)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 10px",
                      borderRadius: "6px",
                      border: "2px solid rgba(255, 255, 255, 0.5)",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      color: "white",
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.9rem",
                      fontWeight: "bold"
                    }}
                    placeholder="Введите новый пароль (минимум 6 символов)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.7)",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.2s ease"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,1)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    }}
                  >
                    {showEditPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.9rem",
                  marginBottom: "6px",
                  fontWeight: "600"
                }}>
                  Заметки
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem",
                    resize: "vertical"
                  }}
                  placeholder="Дополнительная информация о заказчике"
                />
              </div>

              <div style={{
                display: "flex",
                gap: "12px",
                justifyContent: "space-between",
                marginTop: "20px"
              }}>
                <button
                  type="button"
                  onClick={() => {
                    if (editingUser) {
                      setEditingUser(null);
                      setShowEditPassword(false);
                      handleDeleteUser(editingUser.id);
                    }
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "1px solid rgba(239, 68, 68, 0.5)",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    color: "rgba(239, 68, 68, 1)",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontWeight: "600"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Удалить
                </button>
                
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setShowEditPassword(false);
                    }}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "white",
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "10px 20px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: "rgba(34, 197, 94, 0.8)",
                      color: "white",
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontWeight: "600"
                    }}
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && userToDelete && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
          pointerEvents: "auto"
        }}>
          <div style={{
            backgroundColor: "rgba(30, 30, 30, 0.95)",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "400px",
            width: "100%",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{
              textAlign: "center",
              marginBottom: "20px"
            }}>
              <h3 style={{
                color: "white",
                fontFamily: "ChinaCyr, sans-serif",
                fontSize: "1.3rem",
                margin: "0 0 10px 0"
              }}>
                Подтверждение удаления
              </h3>
              <p style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontFamily: "Arial, sans-serif",
                fontSize: "0.9rem",
                margin: 0
              }}>
                Вы уверены, что хотите удалить заказчика <strong style={{ color: "white" }}>"{userToDelete.name || userToDelete.email}"</strong>?
              </p>
              <p style={{
                color: "rgba(239, 68, 68, 0.8)",
                fontFamily: "Arial, sans-serif",
                fontSize: "0.8rem",
                margin: "10px 0 0 0"
              }}>
                ⚠️ Это действие нельзя отменить
              </p>
            </div>

            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center"
            }}>
              <button
                onClick={cancelDeleteUser}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteUser}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  backgroundColor: "rgba(239, 68, 68, 0.8)",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontWeight: "600"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 1)";
                }}
                onMouseOut={(e) => {
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