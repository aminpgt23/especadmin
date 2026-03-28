import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Clock, Bell, Sun, Moon,
  LogOut, Zap, User, ChevronDown, Users, Menu, X, BookOpen   
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import NotificationPanel from '../components/NotificationPanel';
import SpecModal from '../components/modals/SpecModal';
// import logo from '/logo.jpg';

export default function Layout() {
  const { user, logout, theme, toggleTheme, unreadCount } = useApp();
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [viewSpec, setViewSpec] = useState(null);
  const [viewSpecTab, setViewSpecTab] = useState('info'); // tab untuk spec modal
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleBadge = { admin: 'badge-admin', tech: 'badge-tech', ppc: 'badge-ppc' }[user?.role] || '';

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { to: '/master', icon: <FileText size={16} />, label: 'Master Spec' },
    { to: '/history', icon: <Clock size={16} />, label: 'History' },
    { to: '/knowledge', icon: <BookOpen size={16} />, label: 'Knowledge Base' },
  ];

  // Fungsi untuk membuka spec dengan tab tertentu (misal dari notifikasi)
  const handleSpecClick = (id, tab = 'info') => {
    setViewSpec(id);
    setViewSpecTab(tab);
    setShowNotif(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside className="sidebar" style={{
        width: sidebarOpen ? 220 : 0,
        minWidth: sidebarOpen ? 220 : 0,
        overflow: 'hidden',
        transition: 'width 0.25s ease, min-width 0.25s ease'
      }}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
             <img
            src="/logo.jpg"
            alt="Logo"
            style={{
              width: 30,
              height: 30,
              objectFit: 'contain',
              margin: '0 auto 0',
            }}
          />
            {/* <Zap size={18} fill="currentColor" /> */}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>E-Spec Admin</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Production Control</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 12px 4px', marginBottom: 2 }}>
            Navigation
          </div>
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: 'var(--yellow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, flexShrink: 0
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <span className={`badge ${roleBadge}`} style={{ fontSize: 9, marginTop: 2 }}>{user?.role?.toUpperCase()}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div style={{ height: 20, width: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme toggle */}
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowNotif(!showNotif)}
                style={{ position: 'relative' }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: 'var(--danger)', color: 'white',
                    fontSize: 9, fontWeight: 800, minWidth: 16, height: 16,
                    borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--bg-card)',
                    animation: 'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1)'
                  }} className="badge-pop">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel
                open={showNotif}
                onClose={() => setShowNotif(false)}
                onSpecClick={(id, tab) => handleSpecClick(id, tab)}
              />
            </div>

            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

            {/* User avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, background: 'var(--yellow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 12, cursor: 'default'
              }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{user?.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user?.dept}</div>
              </div>
              <span className={`badge ${roleBadge}`} style={{ fontSize: 10 }}>{user?.role?.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>

      {/* View spec from notification click */}
      {viewSpec && (
        <SpecModal specId={viewSpec} onClose={() => setViewSpec(null)} onRefresh={() => {}} initialTab={viewSpecTab} />
      )}
    </div>
  );
}