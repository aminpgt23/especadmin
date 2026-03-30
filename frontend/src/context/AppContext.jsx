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
  const [alerts, setAlerts] = useState([]);
  // Notifications untuk sementara tidak digunakan (isi array kosong)
  const [notifications] = useState([]);

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
    setAlerts([]);
    toast('Berhasil logout');
  };

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

  // Jalankan polling hanya untuk alert setiap 10 detik
  useEffect(() => {
    if (!user) return;

    fetchAlerts(); // panggil sekali saat mount
    const interval = setInterval(fetchAlerts, 10000); // setiap 10 detik

    return () => clearInterval(interval);
  }, [user, fetchAlerts]);

  const markNotifRead = () => {}; // tidak digunakan, tapi tetap ada agar tidak error di komponen yang memanggil
  const markAllRead = () => {};
  const clearAllNotifications = useCallback(() => {
    setAlerts([]);
  }, []);

  // Notifikasi selalu kosong
  const unreadCount = alerts.length;

  return (
    <AppContext.Provider value={{
      user, login, logout,
      theme, toggleTheme,
      notifications, alerts, unreadCount,
      markNotifRead, markAllRead, clearAllNotifications,
      fetchAlerts,
      API
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
export { API };
