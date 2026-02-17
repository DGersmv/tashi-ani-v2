"use client";

import React, { useState, useEffect } from "react";

interface User {
  id: number;
  email: string;
  name?: string;
  role: "MASTER" | "USER";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  lastLogin?: string;
}

interface AdminUserListProps {
  token: string;
}

export default function AdminUserList({ token }: AdminUserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"USER" | "MASTER">("USER");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState<"USER" | "MASTER">("USER");
  const [editUserStatus, setEditUserStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [editUserMetadata, setEditUserMetadata] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Ошибка загрузки пользователей");
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.message || "Ошибка загрузки пользователей");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    if (!newUserEmail.trim()) {
      setError("Email обязателен");
      return;
    }

    if (!newUserPassword.trim()) {
      setError("Пароль обязателен");
      return;
    }

    if (newUserPassword.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    try {
      setIsAddingUser(true);
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          name: newUserName || undefined,
          role: newUserRole
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewUserEmail("");
        setNewUserName("");
        setNewUserPassword("");
        setNewUserRole("USER");
        await fetchUsers(); // Обновляем список
        setError(null);
      } else {
        setError(data.message || "Ошибка добавления пользователя");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsAddingUser(false);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      if (data.success) {
        await fetchUsers(); // Обновляем список
        setError(null);
      } else {
        setError(data.message || "Ошибка удаления пользователя");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserEmail(user.email);
    setEditUserName(user.name || "");
    setEditUserRole(user.role);
    setEditUserStatus(user.status);
    setEditUserMetadata(user.metadata || "");
    setNewPassword("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditUserEmail("");
    setEditUserName("");
    setEditUserRole("USER");
    setEditUserStatus("ACTIVE");
    setEditUserMetadata("");
    setNewPassword("");
    setIsEditing(false);
  };

  const saveUser = async () => {
    if (!editingUser) return;

    try {
      setIsEditing(true);
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: editUserEmail,
          name: editUserName || undefined,
          role: editUserRole,
          status: editUserStatus,
          metadata: editUserMetadata || undefined,
          password: newPassword || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchUsers();
        cancelEdit();
        setError(null);
      } else {
        setError(data.message || "Ошибка обновления пользователя");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsEditing(false);
    }
  };

  const resetUserPassword = async (userId: number) => {
    const newPassword = prompt("Введите новый пароль (минимум 6 символов):");
    if (!newPassword) return;

    if (newPassword.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();
      if (data.success) {
        setError(null);
        alert("Пароль успешно изменен");
      } else {
        setError(data.message || "Ошибка сброса пароля");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const viewUserDetails = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      if (data.success) {
        setUserDetails(data.user);
        setSelectedUser(user);
        setShowUserDetails(true);
      } else {
        setError(data.message || "Ошибка загрузки данных пользователя");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "200px",
        color: "white"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "4px solid rgba(255,255,255,0.3)",
          borderTop: "4px solid white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
      </div>
    );
  }

  return (
    <div style={{ color: "white" }}>
      <h2 style={{
        fontFamily: "ChinaCyr, sans-serif",
        fontSize: "2rem",
        marginBottom: "24px",
        textAlign: "center"
      }}>
        Управление пользователями
      </h2>

      {error && (
        <div style={{
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "20px",
          color: "#fca5a5"
        }}>
          {error}
        </div>
      )}

      {/* Форма добавления пользователя */}
      <div style={{
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        backdropFilter: "blur(10px)"
      }}>
        <h3 style={{
          fontFamily: "ChinaCyr, sans-serif",
          fontSize: "1.2rem",
          marginBottom: "16px"
        }}>
          Добавить пользователя
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input
              type="email"
              placeholder="Email пользователя"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              style={{
                flex: "1",
                minWidth: "200px",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                fontFamily: "Arial, sans-serif"
              }}
            />
            <input
              type="text"
              placeholder="Имя (необязательно)"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              style={{
                flex: "1",
                minWidth: "200px",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                fontFamily: "Arial, sans-serif"
              }}
            />
          </div>
          
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input
              type="password"
              placeholder="Пароль (минимум 6 символов)"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              style={{
                flex: "1",
                minWidth: "200px",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "2px solid rgba(255, 255, 255, 0.5)",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                fontFamily: "Arial, sans-serif",
                fontSize: "14px",
                fontWeight: "bold"
              }}
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as "USER" | "MASTER")}
              style={{
                flex: "1",
                minWidth: "150px",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                fontFamily: "Arial, sans-serif"
              }}
            >
              <option value="USER">Пользователь</option>
              <option value="MASTER">Администратор</option>
            </select>
          </div>
          
          <button
            onClick={addUser}
            disabled={isAddingUser || !newUserEmail.trim() || !newUserPassword.trim()}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: isAddingUser ? "rgba(255, 255, 255, 0.3)" : "rgba(211, 163, 115, 0.8)",
              color: "white",
              fontFamily: "ChinaCyr, sans-serif",
              fontWeight: "600",
              cursor: isAddingUser ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              alignSelf: "flex-start"
            }}
          >
            {isAddingUser ? "Добавление..." : "Добавить пользователя"}
          </button>
        </div>
      </div>

      {/* Список пользователей */}
      <div style={{
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: "12px",
        padding: "20px",
        backdropFilter: "blur(10px)"
      }}>
        <h3 style={{
          fontFamily: "ChinaCyr, sans-serif",
          fontSize: "1.2rem",
          marginBottom: "16px"
        }}>
          Пользователи ({users.length})
        </h3>

        {users.length === 0 ? (
          <p style={{ color: "rgba(255, 255, 255, 0.6)", textAlign: "center" }}>
            Пользователи не найдены
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                <div style={{ flex: "1" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "8px"
                  }}>
                    <span style={{
                      fontFamily: "ChinaCyr, sans-serif",
                      fontWeight: "600",
                      fontSize: "1.1rem"
                    }}>
                      {user.name || user.email}
                    </span>
                    <span style={{
                      backgroundColor: user.role === "MASTER" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                      color: user.role === "MASTER" ? "#fca5a5" : "#86efac",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      fontFamily: "Arial, sans-serif"
                    }}>
                      {user.role === "MASTER" ? "Админ" : "Пользователь"}
                    </span>
                    <span style={{
                      backgroundColor: user.status === "ACTIVE" ? "rgba(34, 197, 94, 0.2)" : "rgba(107, 114, 128, 0.2)",
                      color: user.status === "ACTIVE" ? "#86efac" : "#9ca3af",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      fontFamily: "Arial, sans-serif"
                    }}>
                      {user.status === "ACTIVE" ? "Активен" : "Неактивен"}
                    </span>
                  </div>
                  <div style={{
                    fontSize: "0.9rem",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontFamily: "Arial, sans-serif"
                  }}>
                    <div>Email: {user.email}</div>
                    <div>Создан: {formatDate(user.createdAt)}</div>
                    {user.lastLogin && (
                      <div>Последний вход: {formatDate(user.lastLogin)}</div>
                    )}
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => viewUserDetails(user)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: "rgba(59, 130, 246, 0.8)",
                      color: "white",
                      fontFamily: "Arial, sans-serif",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontSize: "0.9rem"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 1)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.8)";
                    }}
                  >
                    Детали
                  </button>
                  
                  <button
                    onClick={() => startEditUser(user)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: "rgba(34, 197, 94, 0.8)",
                      color: "white",
                      fontFamily: "Arial, sans-serif",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontSize: "0.9rem"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 1)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.8)";
                    }}
                  >
                    Редактировать
                  </button>
                  
                  <button
                    onClick={() => resetUserPassword(user.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: "rgba(168, 85, 247, 0.8)",
                      color: "white",
                      fontFamily: "Arial, sans-serif",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontSize: "0.9rem"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(168, 85, 247, 1)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(168, 85, 247, 0.8)";
                    }}
                  >
                    Пароль
                  </button>
                  
                  {user.role !== "MASTER" && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "rgba(239, 68, 68, 0.8)",
                        color: "white",
                        fontFamily: "Arial, sans-serif",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontSize: "0.9rem"
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
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно редактирования пользователя */}
      {editingUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "24px",
            width: "90%",
            maxWidth: "500px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}>
            <h3 style={{
              fontFamily: "ChinaCyr, sans-serif",
              fontSize: "1.5rem",
              marginBottom: "20px",
              textAlign: "center"
            }}>
              Редактировать пользователя
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <input
                type="email"
                placeholder="Email"
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontFamily: "Arial, sans-serif"
                }}
              />
              
              <input
                type="text"
                placeholder="Имя"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontFamily: "Arial, sans-serif"
                }}
              />
              
              <div style={{ display: "flex", gap: "12px" }}>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as "USER" | "MASTER")}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif"
                  }}
                >
                  <option value="USER">Пользователь</option>
                  <option value="MASTER">Администратор</option>
                </select>
                
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif"
                  }}
                >
                  <option value="ACTIVE">Активен</option>
                  <option value="INACTIVE">Неактивен</option>
                </select>
              </div>
              
              <input
                type="password"
                placeholder="Новый пароль (оставьте пустым, чтобы не менять)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "2px solid rgba(255, 255, 255, 0.5)",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "14px",
                  fontWeight: "bold"
                }}
              />
              
              <textarea
                placeholder="Дополнительная информация (JSON)"
                value={editUserMetadata}
                onChange={(e) => setEditUserMetadata(e.target.value)}
                rows={3}
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontFamily: "Arial, sans-serif",
                  resize: "vertical"
                }}
              />
              
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    backgroundColor: "transparent",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    cursor: "pointer"
                  }}
                >
                  Отмена
                </button>
                <button
                  onClick={saveUser}
                  disabled={isEditing}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: isEditing ? "rgba(255, 255, 255, 0.3)" : "rgba(34, 197, 94, 0.8)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    cursor: isEditing ? "not-allowed" : "pointer"
                  }}
                >
                  {isEditing ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно деталей пользователя */}
      {showUserDetails && userDetails && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "24px",
            width: "90%",
            maxWidth: "600px",
            maxHeight: "80vh",
            overflow: "auto",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{
                fontFamily: "ChinaCyr, sans-serif",
                fontSize: "1.5rem",
                margin: 0
              }}>
                Детали пользователя
              </h3>
              <button
                onClick={() => setShowUserDetails(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "24px",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Email:</label>
                  <div style={{ color: "white", fontWeight: "600" }}>{userDetails.email}</div>
                </div>
                <div>
                  <label style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Имя:</label>
                  <div style={{ color: "white", fontWeight: "600" }}>{userDetails.name || "Не указано"}</div>
                </div>
                <div>
                  <label style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Роль:</label>
                  <div style={{ color: "white", fontWeight: "600" }}>
                    {userDetails.role === "MASTER" ? "Администратор" : "Пользователь"}
                  </div>
                </div>
                <div>
                  <label style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Статус:</label>
                  <div style={{ color: "white", fontWeight: "600" }}>
                    {userDetails.status === "ACTIVE" ? "Активен" : "Неактивен"}
                  </div>
                </div>
                <div>
                  <label style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Создан:</label>
                  <div style={{ color: "white", fontWeight: "600" }}>{formatDate(userDetails.createdAt)}</div>
                </div>
                <div>
                  <label style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Последний вход:</label>
                  <div style={{ color: "white", fontWeight: "600" }}>
                    {userDetails.lastLogin ? formatDate(userDetails.lastLogin) : "Никогда"}
                  </div>
                </div>
              </div>
              
              <div>
                <label style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Объекты ({userDetails.objects?.length || 0}):</label>
                <div style={{ color: "white", maxHeight: "100px", overflow: "auto" }}>
                  {userDetails.objects?.length > 0 ? (
                    userDetails.objects.map((obj: any, index: number) => (
                      <div key={index} style={{ padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                        {obj.title} - {obj.status}
                      </div>
                    ))
                  ) : (
                    "Нет объектов"
                  )}
                </div>
              </div>
              
              <div>
                <label style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Статистика:</label>
                <div style={{ color: "white" }}>
                  Сообщений: {userDetails.messagesCount || 0} | 
                  Комментариев к фото: {userDetails.photoCommentsCount || 0}
                </div>
              </div>
              
              {userDetails.metadata && (
                <div>
                  <label style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Дополнительная информация:</label>
                  <div style={{ 
                    color: "white", 
                    backgroundColor: "rgba(0,0,0,0.3)", 
                    padding: "8px", 
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "0.9rem"
                  }}>
                    {userDetails.metadata}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


