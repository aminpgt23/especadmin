import React, { useRef, useEffect, useState } from 'react';
import { Bell, X, CheckCheck, Trash2, AlertTriangle, Upload, CheckCircle, Tag, Pen } from 'lucide-react';
import { useApp, API } from '../context/AppContext';
import { formatDistanceToNow } from 'date-fns';

const iconMap = {
  new_upload: <Upload size={14} />,
  unrelease: <AlertTriangle size={14} />,
  released: <CheckCircle size={14} />,
  coret: <Pen size={14} />,
  tag: <Tag size={14} />,
  default: <Bell size={14} />
};

const colorMap = {
  new_upload: 'var(--info)',
  unrelease: 'var(--danger)',
  released: 'var(--success)',
  coret: 'var(--yellow-dark)',
  tag: 'var(--amber)',
  default: 'var(--text-muted)'
};

const tabMap = {
  coret: 'coret',
  tag: 'chat',
  new_upload: 'info',
  unrelease: 'info',
  released: 'info',
  default: 'info'
};

export default function NotificationPanel({ open, onClose, onSpecClick }) {
  const { notifications, alerts, markNotifRead, markAllRead, unreadCount, fetchAlerts, API: api, clearAllNotifications } = useApp();
  const ref = useRef();
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  if (!open) return null;

  const allItems = [
    ...alerts.map(a => ({
      id: `db_${a.id}`,
      type: a.type,
      message: a.message,
      time: a.created_at,
      read: false,
      specId: a.spec_id,
      urgent: a.type === 'unrelease',
      itemcode: a.itemcode,
      speccode: a.speccode,
      dbId: a.id,
    })),
    ...notifications.map(n => ({
      ...n,
    }))
  ].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

  const handleItemClick = async (item) => {
    markNotifRead(item.id);
    if (item.dbId) {
      try {
        await api.put(`/chat/alerts/${item.dbId}/read`);
        fetchAlerts();
      } catch {}
    }
    if (item.specId || item.data?.id) {
      const tab = tabMap[item.type] || tabMap.default;
      onSpecClick?.(item.specId || item.data?.id, tab);
    }
    onClose();
  };

  const handleMarkAllRead = async () => {
    // Mark all database alerts as read
    for (const alert of alerts) {
      if (alert.dbId) {
        await api.put(`/chat/alerts/${alert.dbId}/read`).catch(console.error);
      }
    }
    // Mark all socket notifications as read
    markAllRead();
    // Refresh alerts
    fetchAlerts();
  };

  const handleClearAll = async () => {
    if (!window.confirm('Hapus semua notifikasi?')) return;
    setClearing(true);
    try {
      // Mark all database alerts as read
      for (const alert of alerts) {
        if (alert.dbId) {
          await api.put(`/chat/alerts/${alert.dbId}/read`).catch(console.error);
        }
      }
      // Clear all notifications from state
      if (clearAllNotifications) {
        clearAllNotifications();
      } else {
        // Fallback: mark all read and then manually clear arrays
        markAllRead();
        // Refresh alerts
        await fetchAlerts();
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <div ref={ref} className="notif-panel">
      <div style={{ padding: '14px 16px 10px', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={15} />
          <span style={{ fontWeight: 700, fontSize: 13 }}>Notifikasi</span>
          {unreadCount > 0 && (
            <span className="badge badge-danger" style={{ fontSize: 10 }}>{unreadCount}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {unreadCount > 0 && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead} title="Tandai semua dibaca" disabled={clearing}>
                <CheckCheck size={13} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleClearAll} title="Hapus semua" disabled={clearing}>
                <Trash2 size={13} />
              </button>
            </>
          )}
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {allItems.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <Bell size={32} />
            <span style={{ fontSize: 12 }}>Tidak ada notifikasi</span>
          </div>
        ) : (
          allItems.map((item, i) => (
            <div
              key={item.id || i}
              onClick={() => handleItemClick(item)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                background: !item.read ? 'rgba(245,197,24,0.04)' : 'transparent',
                transition: 'var(--transition)',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = !item.read ? 'rgba(245,197,24,0.04)' : 'transparent'}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${colorMap[item.type] || colorMap.default}18`,
                color: colorMap[item.type] || colorMap.default,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1
              }}>
                {iconMap[item.type] || iconMap.default}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {item.message}
                </p>
                {(item.itemcode || item.data?.itemcode) && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    #{item.itemcode || item.data?.itemcode} · {item.speccode || item.data?.speccode}
                  </p>
                )}
                {item.time && (
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                    {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                  </p>
                )}
                {item.urgent && (
                  <div className="alert alert-danger" style={{ marginTop: 6, padding: '4px 8px', fontSize: 11 }}>
                    <AlertTriangle size={11} /> Deadline: {item.deadline ? new Date(item.deadline).toLocaleString() : '24 jam'}
                  </div>
                )}
              </div>
              {!item.read && (
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0, marginTop: 5 }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}