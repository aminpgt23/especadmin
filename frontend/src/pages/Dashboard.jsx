import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, CheckCircle, XCircle, AlertTriangle,
  Pen, TrendingUp, RefreshCw, Eye, BarChart2, PieChart
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { API } from '../context/AppContext';
import SpecModal from '../components/modals/SpecModal';
import { formatDistanceToNow } from 'date-fns';

const COLORS = ['#F5C518', '#F59E0B', '#EF4444', '#3B82F6', '#22C55E', '#A855F7', '#F97316', '#06B6D4'];

function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div className="card" style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        background: `${color}10`, borderRadius: '50%'
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpec, setSelectedSpec] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/specs/stats/dashboard');
      setStats(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 80 }}>
      <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );

  if (!stats) return null;

  const activeRate = stats.total > 0 ? Math.round(stats.active / stats.total * 100) : 0;

  const pieData = [
    { name: 'Active', value: stats.active },
    { name: 'Inactive', value: stats.inactive }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Dashboard</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Production Spec Overview</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        <StatCard icon={<FileText size={16} />} label="Total Specs" value={stats.total} sub="All time" color="var(--yellow-dark)" />
        <StatCard icon={<CheckCircle size={16} />} label="Active" value={stats.active} sub={`${activeRate}% of total`} color="var(--success)" />
        <StatCard icon={<XCircle size={16} />} label="Inactive" value={stats.inactive} sub="Draft/unreleased" color="var(--text-muted)" />
        <StatCard icon={<AlertTriangle size={16} />} label="Duplicate Active" value={stats.duplicates?.length || 0} sub="Same speccode" color="var(--danger)" />
        <StatCard icon={<Pen size={16} />} label="Annotated" value={stats.recentCoret?.length || 0} sub="Recent coret" color="var(--amber)" />
      </div>

      {/* Active rate bar */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Active Rate</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow-dark)' }}>{activeRate}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${activeRate}%` }} />
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* By Type Bar */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChart2 size={16} style={{ color: 'var(--yellow-dark)' }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Specs by Type</span>
          </div>
          {stats.byType?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byType} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="typespec" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="cnt" fill="var(--yellow)" radius={[4, 4, 0, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: 30 }}><span>No data</span></div>}
        </div>

        {/* Active/Inactive Pie */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <PieChart size={16} style={{ color: 'var(--yellow-dark)' }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Active vs Inactive</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RechartPie>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                <Cell fill="var(--yellow)" />
                <Cell fill="var(--bg-tertiary)" />
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            </RechartPie>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By Process */}
      {stats.byProcess?.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={16} style={{ color: 'var(--yellow-dark)' }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Specs by Process</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.byProcess.slice(0, 10)} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="process" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={60} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="cnt" fill="var(--amber)" radius={[0, 4, 4, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Duplicate warnings - sekarang berdasarkan speccode */}
      {stats.duplicates?.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>Duplicate Active Specs</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.duplicates.map((d, idx) => (
              <div key={idx} className="alert alert-danger" style={{ alignItems: 'center' }}>
                <AlertTriangle size={13} />
                <div style={{ flex: 1 }}>
                  <strong>{d.itemcode}</strong> | {d.giticode} | {d.mesintype} | {d.mesinside} – <strong>{d.cnt}</strong> active specs.
                  <br />
                  <span style={{ fontSize: 11 }}>Consider unreleasing older versions.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Recent Annotations */}
      {stats.recentCoret?.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Pen size={16} style={{ color: 'var(--yellow-dark)' }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Recent Annotations (Coret)</span>
          </div>
          <div className="timeline">
            {stats.recentCoret.map(r => (
              <div key={r.no} className="timeline-item">
                <div className="timeline-dot" />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ fontSize: 13 }}>{r.itemcode}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }} className="mono">{r.speccode}</span>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedSpec(r.no)} title="View spec">
                      <Eye size={12} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Annotated by <strong>{r.coretby}</strong>
                    {r.datecoret && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                        · {formatDistanceToNow(new Date(r.datecoret), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSpec && (
        <SpecModal specId={selectedSpec} onClose={() => setSelectedSpec(null)} onRefresh={load} />
      )}
    </div>
  );
}