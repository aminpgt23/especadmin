import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Filter, LayoutGrid, List, RefreshCw,
  Eye, Edit2, Trash2, CheckCircle, XCircle, ChevronDown, Download,
  FileText, Calendar, User, Settings, Cpu, Hash, Barcode, X, Printer
} from 'lucide-react';
import { useApp, API } from '../context/AppContext';
import SpecModal from '../components/modals/SpecModal';
import SpecForm from '../components/modals/SpecForm';
import DigitalSpecViewer from '../components/modals/DigitalSpecViewer';
import toast from 'react-hot-toast';

export default function Master() {
  const { user } = useApp();
  const [specs, setSpecs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table');
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMachineType, setFilterMachineType] = useState('all');
  const [filterMachineInside, setFilterMachineInside] = useState('all');
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editSpecId, setEditSpecId] = useState(null);
  const [sortBy, setSortBy] = useState('no');
  const [sortDir, setSortDir] = useState('desc');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, itemcode: null, isActive: false });
  const [showDigitalSpec, setShowDigitalSpec] = useState(false);
  const [digitalSpecId, setDigitalSpecId] = useState(null);

  const canEdit = user?.role === 'tech' || user?.role === 'admin';
  const canRelease = user?.role === 'ppc' || user?.role === 'admin';

  const loadSpecs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/specs');
      setSpecs(data);
    } catch { toast.error('Gagal memuat spec'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSpecs(); }, [loadSpecs]);

  const machineTypes = [...new Set(specs.map(s => s.mesintype).filter(Boolean))];
  const machineInsides = [...new Set(specs.map(s => s.mesinside).filter(Boolean))];
  const types = [...new Set(specs.map(s => s.typespec).filter(Boolean))];

  useEffect(() => {
    let res = [...specs];
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(s =>
        s.itemcode?.toLowerCase().includes(q) ||
        s.speccode?.toLowerCase().includes(q) ||
        s.giticode?.toLowerCase().includes(q) ||
        s.process?.toLowerCase().includes(q) ||
        s.typespec?.toLowerCase().includes(q)
      );
    }
    if (filterActive !== 'all') res = res.filter(s => String(s.active) === filterActive);
    if (filterType !== 'all') res = res.filter(s => s.typespec === filterType);
    if (filterMachineType !== 'all') res = res.filter(s => s.mesintype === filterMachineType);
    if (filterMachineInside !== 'all') res = res.filter(s => s.mesinside === filterMachineInside);
    res.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (sortDir === 'asc') return String(va || '').localeCompare(String(vb || ''));
      return String(vb || '').localeCompare(String(va || ''));
    });
    setFiltered(res);
  }, [specs, search, filterActive, filterType, filterMachineType, filterMachineInside, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const handleQuickRelease = async (e, id, current) => {
    e.stopPropagation();
    try {
      await API.put(`/specs/${id}/${current == 1 ? 'unrelease' : 'release'}`);
      toast.success(current == 1 ? 'Dibatalkan rilis' : 'Dirilis!');
      loadSpecs();
    } catch { toast.error('Gagal'); }
  };

  const handleDelete = async () => {
    const { id, itemcode, isActive } = deleteConfirm;
    if (user?.role === 'tech' && isActive) {
      toast.error('Spec aktif tidak dapat dihapus! Batalkan rilis terlebih dahulu.');
      setDeleteConfirm({ open: false, id: null, itemcode: null, isActive: false });
      return;
    }
    try {
      await API.delete(`/specs/${id}`);
      toast.success('Dipindahkan ke history');
      loadSpecs();
    } catch { toast.error('Gagal'); }
    setDeleteConfirm({ open: false, id: null, itemcode: null, isActive: false });
  };

  const resetFilters = () => {
    setSearch('');
    setFilterActive('all');
    setFilterType('all');
    setFilterMachineType('all');
    setFilterMachineInside('all');
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronDown size={10} style={{ opacity: 0.3 }} />;
    return <ChevronDown size={10} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none', color: 'var(--yellow-dark)' }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 200px', minWidth: 160 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            placeholder="Cari itemcode, speccode, process..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              ×
            </button>
          )}
        </div>

        <select className="form-select" value={filterActive} onChange={e => setFilterActive(e.target.value)} style={{ width: 130 }}>
          <option value="all">Semua Status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>

        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 150 }}>
          <option value="all">Semua Tipe</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select className="form-select" value={filterMachineType} onChange={e => setFilterMachineType(e.target.value)} style={{ width: 150 }}>
          <option value="all">Semua Machine Type</option>
          {machineTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select className="form-select" value={filterMachineInside} onChange={e => setFilterMachineInside(e.target.value)} style={{ width: 150 }}>
          <option value="all">Semua Machine Inside</option>
          {machineInsides.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <div className="view-toggle">
          <button className={`view-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')} title="Table view">
            <List size={14} />
          </button>
          <button className={`view-btn ${view === 'card' ? 'active' : ''}`} onClick={() => setView('card')} title="Card view">
            <LayoutGrid size={14} />
          </button>
        </div>

        <button className="btn btn-ghost btn-icon" onClick={loadSpecs} title="Refresh">
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>

        {canEdit && (
          <button className="btn btn-primary" onClick={() => { setEditSpecId(null); setShowForm(true); }}>
            <Plus size={15} /> New Spec
          </button>
        )}

        {(search || filterActive !== 'all' || filterType !== 'all' || filterMachineType !== 'all' || filterMachineInside !== 'all') && (
          <button className="btn btn-secondary btn-sm" onClick={resetFilters} style={{ gap: 4 }}>
            <X size={12} /> Reset Filter
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Menampilkan <strong>{filtered.length}</strong> dari <strong>{specs.length}</strong> spec
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="badge badge-active">{specs.filter(s => s.active == 1).length} Active</span>
          <span className="badge badge-inactive">{specs.filter(s => s.active != 1).length} Inactive</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 60 }}>
          <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Search size={40} />
          <span>Tidak ada spec ditemukan</span>
          {canEdit && <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add First Spec</button>}
        </div>
      ) : view === 'table' ? (
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto' }}>
          <table className="table" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
              <tr>
                {[['no', '#'], ['itemcode', 'Item Code'], ['giticode', 'GITI'], ['speccode', 'Spec Code'], ['typespec', 'Type'], ['process', 'Process'], ['active', 'Status'], ['datecreated', 'Created'], ['lastupdate', 'Updated']].map(([col, label]) => (
                  <th key={col} onClick={() => handleSort(col)} style={{ cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, background: 'var(--bg-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {label} <SortIcon col={col} />
                    </span>
                  </th>
                ))}
                <th style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)' }}>Actions</th>
               </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.no} onClick={() => setSelectedSpec(s.no)} style={{ cursor: 'pointer' }} className="fade-in">
                  <td><span className="mono">{s.no}</span></td>
                  <td><strong style={{ fontSize: 13 }}>{s.itemcode}</strong></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.giticode || '—'}</td>
                  <td><span className="mono" style={{ fontSize: 12 }}>{s.speccode}</span></td>
                  <td>{s.typespec ? <span className="badge badge-yellow" style={{ fontSize: 10 }}>{s.typespec}</span> : '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{s.process || '—'}</td>
                  <td>
                    <span className={`badge ${s.active == 1 ? 'badge-active' : 'badge-inactive'}`}>
                      {s.active == 1 ? '● Active' : '○ Draft'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.datecreated}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.lastupdate}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedSpec(s.no)} title="View">
                        <Eye size={13} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setDigitalSpecId(s.no); setShowDigitalSpec(true); }} title="Digital Spec">
                        <Printer size={13} />
                      </button>
                      {canEdit && (
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); setEditSpecId(s.no); setShowForm(true); }} title="Edit">
                          <Edit2 size={13} />
                        </button>
                      )}
                      {canRelease && (
                        <button
                          className={`btn btn-icon btn-sm ${s.active == 1 ? 'btn-secondary' : 'btn-ghost'}`}
                          onClick={e => handleQuickRelease(e, s.no, s.active)}
                          title={s.active == 1 ? 'Unrelease' : 'Release'}
                          style={{ color: s.active == 1 ? 'var(--success)' : 'var(--text-muted)' }}
                        >
                          {s.active == 1 ? <XCircle size={13} /> : <CheckCircle size={13} />}
                        </button>
                      )}
                      {canEdit && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={e => { e.stopPropagation(); setDeleteConfirm({ open: true, id: s.no, itemcode: s.itemcode, isActive: s.active }); }}
                          title="Delete"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="spec-grid" style={{ overflowY: 'auto', flex: 1, paddingBottom: 16 }}>
          {filtered.map(s => (
            <div
              key={s.no}
              className="card card-hover spec-card fade-in"
              onClick={() => setSelectedSpec(s.no)}
              style={{ cursor: 'pointer', overflow: 'visible', height: 'auto' }}
            >
              <div className="img-preview" style={{ background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
                <FileText size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              </div>
              <div style={{ padding: '12px 0 0' }}>
                {/* Kode-kode utama */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{s.itemcode || '—'}</p>
                    <div style={{ marginTop: 2 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-word' }} className="mono">
                        <Hash size={10} style={{ display: 'inline', marginRight: 2 }} /> {s.speccode || '—'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-word' }} className="mono">
                        <Barcode size={10} style={{ display: 'inline', marginRight: 2 }} /> {s.giticode || '—'}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${s.active == 1 ? 'badge-active' : 'badge-inactive'}`} style={{ flexShrink: 0 }}>
                    {s.active == 1 ? 'Active' : 'Draft'}
                  </span>
                </div>

                {/* Informasi tambahan */}
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    <span className="badge badge-yellow" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{s.typespec || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    <Cpu size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{s.process || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    <Settings size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>MT: {s.mesintype || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    <Settings size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>MI: {s.mesinside || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    <User size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{s.createdby || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    <Calendar size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{s.datecreated || '—'}</span>
                  </div>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedSpec(s.no)}><Eye size={13} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setDigitalSpecId(s.no); setShowDigitalSpec(true); }}><Printer size={13} /></button>
                  {canEdit && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditSpecId(s.no); setShowForm(true); }}><Edit2 size={13} /></button>}
                  {canRelease && (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={e => handleQuickRelease(e, s.no, s.active)} style={{ color: s.active == 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {s.active == 1 ? <XCircle size={13} /> : <CheckCircle size={13} />}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={e => { e.stopPropagation(); setDeleteConfirm({ open: true, id: s.no, itemcode: s.itemcode, isActive: s.active }); }}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Konfirmasi Delete */}
      {deleteConfirm.open && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm({ open: false, id: null, itemcode: null, isActive: false })}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, color: 'var(--danger)' }}>⚠️ Konfirmasi Hapus</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteConfirm({ open: false, id: null, itemcode: null, isActive: false })}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>
                Apakah Anda yakin ingin menghapus spec <strong>{deleteConfirm.itemcode}</strong>?
                <br />Spec akan dipindahkan ke history dan dapat dipulihkan nanti.
              </p>
              {deleteConfirm.isActive && user?.role === 'tech' && (
                <div className="alert alert-danger" style={{ marginTop: 12 }}>
                  <AlertTriangle size={14} />
                  <span>Spec aktif tidak dapat dihapus! Batalkan rilis terlebih dahulu.</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm({ open: false, id: null, itemcode: null, isActive: false })}>
                Batal
              </button>
              {(!deleteConfirm.isActive || user?.role !== 'tech') && (
                <button className="btn btn-danger" onClick={handleDelete}>
                  Hapus Spec
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedSpec && (
        <SpecModal specId={selectedSpec} onClose={() => setSelectedSpec(null)} onRefresh={loadSpecs} />
      )}
      {showForm && (
        <SpecForm specId={editSpecId} onClose={() => { setShowForm(false); setEditSpecId(null); }} onSuccess={loadSpecs} />
      )}
      {showDigitalSpec && (
        <DigitalSpecViewer specId={digitalSpecId} onClose={() => setShowDigitalSpec(false)} />
      )}
    </div>
  );
}