import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, AtSign, X } from 'lucide-react';
import { useApp, API } from '../context/AppContext';
import { formatDistanceToNow } from 'date-fns';

export default function SpecChat({ specId, specInfo }) {
  const { user, socket } = useApp();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [users, setUsers] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [showTagList, setShowTagList] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef();
  const inputRef = useRef();
  const messagesContainerRef = useRef();

  const loadMessages = useCallback(async () => {
    if (!specId) return;
    setLoading(true);
    try {
      const { data } = await API.get(`/chat/spec/${specId}`);
      setMessages(data);
    } catch {} finally { setLoading(false); }
  }, [specId]);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await API.get('/auth/users');
      setUsers(data);
    } catch {}
  }, []);

  useEffect(() => {
    loadMessages();
    loadUsers();
  }, [loadMessages, loadUsers]);

  useEffect(() => {
    if (!socket || !specId) return;
    socket.emit('join_spec', specId);
    socket.on('new_message', (msg) => {
      if (String(msg.spec_id) === String(specId)) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
    return () => {
      socket.off('new_message');
      socket.emit('leave_spec', specId);
    };
  }, [socket, specId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      const { data } = await API.post(`/chat/spec/${specId}`, {
        message: text.trim(),
        tagged_users: taggedUsers.map(u => u.nip)
      });
      setMessages(prev => [...prev, data]);
      socket?.emit('spec_message', { ...data, spec_id: specId });
      setText('');
      setTaggedUsers([]);
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === '@') { setShowTagList(true); setTagSearch(''); }
    if (e.key === 'Escape') setShowTagList(false);
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    const atIdx = val.lastIndexOf('@');
    if (atIdx !== -1 && atIdx === val.length - 1) { setShowTagList(true); setTagSearch(''); }
    else if (atIdx !== -1 && atIdx < val.length - 1) {
      const search = val.slice(atIdx + 1);
      if (!search.includes(' ')) { setShowTagList(true); setTagSearch(search); }
      else setShowTagList(false);
    } else setShowTagList(false);
  };

  const tagUser = (u) => {
    if (!taggedUsers.find(t => t.nip === u.nip)) {
      setTaggedUsers(prev => [...prev, u]);
    }
    const atIdx = text.lastIndexOf('@');
    setText(text.slice(0, atIdx) + `@${u.name} `);
    setShowTagList(false);
    inputRef.current?.focus();
  };

  const filteredUsers = users.filter(u =>
    u.nip !== user?.nip &&
    (u.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
      u.dept?.toLowerCase().includes(tagSearch.toLowerCase()))
  );

  const getRoleBadge = (role) => {
    const cls = { admin: 'badge-admin', tech: 'badge-tech', ppc: 'badge-ppc' }[role] || '';
    return <span className={`badge ${cls}`} style={{ fontSize: 9 }}>{role?.toUpperCase()}</span>;
  };

  const renderMessage = (msg, idx) => {
    const isMe = msg.sender_nip === user?.nip;
    const parts = msg.message.split(/(@\w[\w\s]*)/g);
    // Key unik untuk setiap pesan: gabungkan id (jika ada) dan index, atau fallback
    const uniqueKey = msg.id ? `${msg.id}_${idx}` : `${msg.sender_nip}_${msg.created_at}_${idx}`;

    return (
      <div key={uniqueKey} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
        {!isMe && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, background: 'var(--yellow)', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {msg.sender_name?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{msg.sender_name}</span>
            {getRoleBadge(msg.sender_role)}
          </div>
        )}
        <div className={`chat-bubble ${isMe ? 'me' : 'other'}`}>
          {parts.map((part, i) => (
            part.startsWith('@') ? (
              <span key={`${uniqueKey}_tag_${i}`} style={{ fontWeight: 700, color: isMe ? 'var(--amber-dark)' : 'var(--yellow-dark)' }}>{part}</span>
            ) : (
              <span key={`${uniqueKey}_text_${i}`}>{part}</span>
            )
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
          {msg.created_at ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }) : ''}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
      <div
        ref={messagesContainerRef}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', minHeight: 0 }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <span className="spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 10px' }}>
            <AtSign size={28} />
            <span style={{ fontSize: 12 }}>Belum ada pesan. Mulai percakapan!</span>
          </div>
        ) : (
          messages.map((msg, idx) => renderMessage(msg, idx))
        )}
        <div ref={bottomRef} />
      </div>

      {taggedUsers.length > 0 && (
        <div style={{ padding: '4px 12px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {taggedUsers.map(u => (
            <span key={u.nip} className="tag">
              @{u.name}
              <button
                onClick={() => setTaggedUsers(prev => prev.filter(t => t.nip !== u.nip))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 1 }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ padding: '10px 12px', borderTop: '1.5px solid var(--border)', position: 'relative' }}>
        {showTagList && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 12, right: 12,
            background: 'var(--bg-card)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow)',
            maxHeight: 160, overflowY: 'auto', zIndex: 10
          }}>
            {filteredUsers.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Tidak ada pengguna ditemukan</div>
            ) : filteredUsers.map(u => (
              <div
                key={u.nip}
                onClick={() => tagUser(u)}
                style={{
                  padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'var(--transition)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--yellow)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {u.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{u.dept}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pesan... (@ untuk tag)"
            rows={1}
            className="form-textarea"
            style={{ flex: 1, resize: 'none', minHeight: 36, maxHeight: 100, fontSize: 13 }}
          />
          <button
            className="btn btn-primary btn-icon"
            onClick={handleSend}
            disabled={!text.trim()}
          >
            <Send size={14} />
          </button>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          Enter untuk kirim · Shift+Enter baris baru · @ untuk tag pengguna
        </p>
      </div>
    </div>
  );
}