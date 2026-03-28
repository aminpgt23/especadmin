import React, { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, Eye, Trash2, X } from 'lucide-react';
import { useApp, API } from '../context/AppContext';
import toast from 'react-hot-toast';

export default function History() {
  const { user } = useApp();
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [imageBlobUrl, setImageBlobUrl] = useState(null);

  const canRestore = user?.role === 'tech' || user?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/history');
      setItems(data);
    } catch { toast.error('Gagal memuat history'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter berdasarkan pencarian
  useEffect(() => {
    if (!search) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(s =>
      s.itemcode?.toLowerCase().includes(q) ||
      s.speccode?.toLowerCase().includes(q) ||
      s.giticode?.toLowerCase().includes(q)
    ));
  }, [items, search]);

  const resetSearch = () => setSearch('');

  const handleView = async (id) => {
    setViewItem(id);
    setLoadingDetail(true);
    try {
      const { data } = await API.get(`/history/${id}`);
      setViewDetail(data);
      // Load gambar sebagai blob (agar token ikut)
      if (data.pic) {
        try {
          const response = await API.get(`/history/${id}/pic`, { responseType: 'blob' });
          if (response.data.size > 0) {
            const url = URL.createObjectURL(response.data);
            setImageBlobUrl(url);
          }
        } catch (err) {
          console.error('Gagal memuat gambar:', err);
        }
      }
    } catch { toast.error('Gagal memuat detail'); }
    finally { setLoadingDetail(false); }
  };

  // Bersihkan blob URL saat modal ditutup
  useEffect(() => {
    return () => {
      if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
    };
  }, [imageBlobUrl]);

  const handleRestore = async (id, itemcode) => {
    if (!window.confirm(`Pulihkan spec ${itemcode} kembali ke daftar aktif?`)) return;
    try {
      await API.post(`/history/${id}/restore`);
      toast.success('Spec berhasil dipulihkan!');
      load();
      setViewItem(null);
    } catch { toast.error('Gagal memulihkan'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Toolbar dengan search dan reset */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 200px', minWidth: 160 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            placeholder="Cari itemcode, speccode, giticode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={resetSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              ×
            </button>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} record</span>
      </div>

      {/* Alert info */}
      <div className="alert alert-warning" style={{ padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Trash2 size={14} />
        <span style={{ fontSize: 12 }}>
          Spec di sini telah dihapus dari Master. {canRestore ? 'Anda dapat memulihkannya.' : 'Hubungi TECH/Admin untuk memulihkan.'}
        </span>
      </div>

      {/* Tabel history */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Trash2 size={40} />
          <span>Tidak ada data history</span>
        </div>
      ) : (
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto' }}>
          <table className="table" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
              <tr>
                <th>#</th>
                <th>Item Code</th>
                <th>GITI Code</th>
                <th>Spec Code</th>
                <th>Type</th>
                <th>Process</th>
                <th>Was Active</th>
                <th>Created By</th>
                <th>Date Deleted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.no} className="fade-in">
                  <td><span className="mono">{s.no}</span></td>
                  <td><strong>{s.itemcode || '—'}</strong></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.giticode || '—'}</td>
                  <td><span className="mono" style={{ fontSize: 12 }}>{s.speccode || '—'}</span></td>
                  <td>{s.typespec ? <span className="badge badge-yellow" style={{ fontSize: 10 }}>{s.typespec}</span> : '—'}</td>
                  <td style={{ fontSize: 12 }}>{s.process || '—'}</td>
                  <td>
                    <span className={`badge ${s.active == 1 ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: 10 }}>
                      {s.active == 1 ? 'Was Active' : 'Was Draft'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{s.createdby || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--danger)' }}>{s.datedeleted || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleView(s.no)} title="Lihat detail">
                        <Eye size={13} />
                      </button>
                      {canRestore && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleRestore(s.no, s.itemcode)}
                          title="Pulihkan"
                          style={{ color: 'var(--success)' }}
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detail */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>📋 Detail History</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {canRestore && viewDetail && (
                  <button className="btn btn-primary btn-sm" onClick={() => handleRestore(viewItem, viewDetail.itemcode)}>
                    <RotateCcw size={13} /> Pulihkan
                  </button>
                )}
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewItem(null)}><X size={16} /></button>
              </div>
            </div>
            <div className="modal-body">
              {loadingDetail ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <span className="spinner" />
                </div>
              ) : viewDetail ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      ['Item Code', viewDetail.itemcode],
                      ['GITI Code', viewDetail.giticode],
                      ['Spec Code', viewDetail.speccode],
                      ['Type', viewDetail.typespec],
                      ['Process', viewDetail.process],
                      ['Machine Type', viewDetail.mesintype],
                      ['Machine Inside', viewDetail.mesinside],
                      ['Created By', viewDetail.createdby],
                      ['Date Created', viewDetail.datecreated],
                      ['Corrected By', viewDetail.coretby],
                      ['Date Corrected', viewDetail.datecoret],
                      ['Last Update', viewDetail.lastupdate],
                      ['Scheduled Release Date', viewDetail.schreleasedate],
                      ['Shift Release', viewDetail.shiftrelease],
                      ['Date Deleted', viewDetail.datedeleted],
                      ['Was Active', viewDetail.active == 1 ? 'Yes' : 'No']
                    ].map(([label, val]) => (
                      <div key={label} className="card" style={{ padding: '10px 14px' }}>
                        <p className="form-label" style={{ marginBottom: 3 }}>{label}</p>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{val || '—'}</p>
                      </div>
                    ))}
                  </div>
                  {imageBlobUrl && (
                    <div>
                      <p className="form-label" style={{ marginBottom: 8 }}>Gambar Spec</p>
                      <img
                        src={imageBlobUrl}
                        alt="Spec"
                        style={{ maxWidth: '100%', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)' }}
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}