import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useApp();
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nip || !password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(nip, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(245,197,24,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(245,197,24,0.08) 0%, transparent 50%)'
    }}>
      {/* Decorative */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
        background: 'linear-gradient(90deg, var(--yellow), var(--amber), var(--yellow-light), var(--yellow))',
        backgroundSize: '200% 100%',
        animation: 'shimmer 3s infinite'
      }} />

      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }} className="fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64,
            background: 'var(--yellow)',
            borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--shadow-yellow)',
            fontSize: 28
          }}>
               <img
            src="/logo.jpg"
            alt="Logo"
            style={{
              width: 80,
              height: 80,
              objectFit: 'contain',
              margin: '0 auto 16px',
            }}
          />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>E-Spec Admin</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 13 }}>Production Spec Control System</p>
        </div>
            
        {/* Form card */}
          <div style={{
          backdropFilter: 'blur(12px)',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 28,
          padding: 32,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.2) inset',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Employee ID (NIP)</label>
              <input
                className="form-input"
                placeholder="Enter your NIP"
                value={nip}
                onChange={e => setNip(e.target.value)}
                autoComplete="username"
                style={{ fontSize: 14 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ width: '100%', paddingRight: 40, fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Role hints */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Access levels: <span className="badge badge-admin" style={{ fontSize: 10 }}>Admin</span>{' '}
            <span className="badge badge-tech" style={{ fontSize: 10 }}>Tech</span>{' '}
            <span className="badge badge-ppc" style={{ fontSize: 10 }}>PPC</span>
          </p>
        </div>
      </div>
    </div>
  );
}
