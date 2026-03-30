import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const AppContext = createContext(null);

const API = axios.create({ baseURL: 'https://especadminbackend-oeamynts-projects.vercel.app/api' });

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
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

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
    if (socket) socket.disconnect();
    setUser(null);
    setSocket(null);
    setNotifications([]);
    setAlerts([]);
    toast('Berhasil logout');
  };

  useEffect(() => {
    if (!user) return;

    const s = io('http://localhost:5000', { 
      transports: ['polling', 'websocket'],
      reconnection: true 
    });

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    s.on('connect', () => {
      console.log('Socket connected');
      s.emit('register', { nip: user.nip, role: user.role, name: user.name });
    });

    s.on('new_spec_alert', (data) => {
      if (user.role === 'ppc' || user.role === 'admin') {
        setNotifications(prev => [{ ...data, id: Date.now(), read: false }, ...prev]);
        toast(`📋 ${data.message}`, { duration: 6000 });
      }
    });

    s.on('unrelease_alert', (data) => {
      if (user.role === 'tech' || user.role === 'admin') {
        setNotifications(prev => [{ ...data, id: Date.now(), read: false, urgent: true }, ...prev]);
        toast.error(`⚠️ ${data.message}`, { duration: 8000 });
      }
    });

    s.on('release_notification', (data) => {
      if (user.role === 'tech' || user.role === 'admin') {
        setNotifications(prev => [{ ...data, id: Date.now(), read: false }, ...prev]);
        toast.success(`✅ ${data.message}`);
      }
    });

    s.on('coret_notification', (data) => {
      if (user.role === 'ppc' || user.role === 'admin') {
        setNotifications(prev => [{ ...data, id: Date.now(), read: false }, ...prev]);
        toast(`🎨 ${data.message}`);
      }
    });

    s.on('tagged_in_message', (data) => {
      setNotifications(prev => [
        { type: 'tag', message: `Anda ditandai dalam spec #${data.spec_id}`, id: Date.now(), read: false, data },
        ...prev
      ]);
      toast(`🏷️ Anda ditandai dalam pesan`, { icon: '📌' });
    });

    s.on('users_online', setOnlineUsers);

    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/chat/alerts');
      setAlerts(data);
    } catch (err) {
      console.error("Gagal mengambil alert:", err);
    }
  }, [user]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

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
      socket, notifications, alerts, unreadCount,
      markNotifRead, markAllRead, clearAllNotifications,
      fetchAlerts,
      onlineUsers, API
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
export { API };
