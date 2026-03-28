import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Master from './pages/Master';
import History from './pages/History';
import KnowledgeBase from './pages/KnowledgeBase';
import './index.css';

function PrivateRoute({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useApp();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="master" element={<Master />} />
        <Route path="history" element={<History />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text)',
              border: '1.5px solid var(--border)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Sora, sans-serif',
              boxShadow: 'var(--shadow)',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: 'white' } },
            error: { iconTheme: { primary: '#EF4444', secondary: 'white' } },
          }}
        />
      </BrowserRouter>
    </AppProvider>
  );
}
