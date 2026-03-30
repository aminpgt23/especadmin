import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AppContext = createContext(null);

const API = axios.create({ baseURL: 'https://especadminbackend.vercel.app/api' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const login = async (nip, password) => {
    try {
      const { data } = await API.post('/auth/login', { nip, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success(`Selamat datang, ${data.user.name}!`);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login gagal';
      toast.error(msg);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setNotifications([]);
    setAlerts([]);
    toast('Berhasil logout');
  };

  // Fungsi untuk mengambil notifikasi dari API (yang akan dibuat di backend)
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/notifications'); // <-- buat endpoint ini
      setNotifications(data);
    } catch (err) {
      console.error("Gagal mengambil notifikasi:", err);
    }
  }, [user]);

  // Fungsi untuk mengambil alert dari API (sudah ada)
  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/chat/alerts');
      setAlerts(data);
    } catch (err) {
      console.error("Gagal mengambil alert:", err);
    }
  }, [user]);

  // Jalankan polling setiap 10 detik untuk notifikasi dan alert
  useEffect(() => {
    if (!user) return;

    // Panggil sekali saat mount
    fetchNotifications();
    fetchAlerts();

    // Interval polling
    const interval = setInterval(() => {
      fetchNotifications();
      fetchAlerts();
    }, 10000); // 10 detik

    return () => clearInterval(interval);
  }, [user, fetchNotifications, fetchAlerts]);

  const markNotifRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setAlerts([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length + alerts.length;

  return (
    <AppContext.Provider value={{
      user, login, logout,
      theme, toggleTheme,
      notifications, alerts, unreadCount,
      markNotifRead, markAllRead, clearAllNotifications,
      fetchAlerts,   // jika masih diperlukan
      API
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
export { API };
