import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Edit2, Trash2, CheckCircle, XCircle, Image, FileText,
  MessageSquare, Pen, ChevronDown, AlertTriangle, Eye
} from 'lucide-react';
import { useApp, API } from '../../context/AppContext';
import CoretCanvas from '../CoretCanvas';
import SpecChat from '../SpecChat';
import toast from 'react-hot-toast';
import DigitalSpec from '../DigitalSpec';

export default function SpecModal({ specId, onClose, onRefresh, initialTab = 'info' }) {
  const { user, socket } = useApp();
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(initialTab);
  const [showCoret, setShowCoret] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [imageBlobUrl, setImageBlobUrl] = useState(null);
  const [memoBlobUrl, setMemoBlobUrl] = useState(null);

  const canEdit = user?.role === 'tech' || user?.role === 'admin';
  const canRelease = user?.role === 'ppc' || user?.role === 'admin';

  // Fetch spec data
  const loadSpec = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/specs/${specId}`);
      setSpec(data);
      // Check duplicate active specs berdasarkan itemcode, giticode, mesintype, mesinside
      if (data.active === 1 || data.active === '1') {
        const { data: all } = await API.get('/specs');
        const dups = all.filter(s => 
          s.active == 1 && 
          s.no !== data.no &&
          s.itemcode === data.itemcode &&
          s.giticode === data.giticode &&
          s.mesintype === data.mesintype &&
          s.mesinside === data.mesinside
        );
        if (dups.length > 0) setDuplicateWarning(dups);
      }
    } catch (err) {
      toast.error('Gagal memuat spec');
    } finally {
      setLoading(false);
    }
  }, [specId]);

  // Fetch image as blob
  const loadImage = useCallback(async () => {
    try {
      const response = await API.get(`/specs/${specId}/pic`, { responseType: 'blob' });
      if (response.data.size > 0) {
        const url = URL.createObjectURL(response.data);
        setImageBlobUrl(url);
      } else {
        setImgError(true);
      }
    } catch (err) {
      setImgError(true);
    }
  }, [specId]);

  // Fetch memo as blob
  const loadMemo = useCallback(async () => {
    try {
      const response = await API.get(`/specs/${specId}/memo`, { responseType: 'blob' });
      if (response.data.size > 0) {
        const url = URL.createObjectURL(response.data);
        setMemoBlobUrl(url);
      }
    } catch (err) {
      // Memo may not exist, ignore
    }
  }, [specId]);

  useEffect(() => {
    if (!specId) return;
    loadSpec();
    loadImage();
    loadMemo();
    // Cleanup blob URLs on unmount or spec change
    return () => {
      if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
      if (memoBlobUrl) URL.revokeObjectURL(memoBlobUrl);
    };
  }, [specId, loadSpec, loadImage, loadMemo]);

  const handleRelease = async () => {
    try {
      await API.put(`/specs/${specId}/release`);
      toast.success('Spec dirilis!');
      socket?.emit('spec_released', { id: specId, itemcode: spec?.itemcode, speccode: spec?.speccode });
      await API.post('/chat/alerts', {
        spec_id: specId, type: 'released',
        message: `Spec ${spec?.itemcode} - ${spec?.speccode} telah dirilis oleh PPC`,
        target_role: 'tech'
      });
      loadSpec(); onRefresh?.();
    } catch { toast.error('Gagal merilis'); }
  };

  const handleUnrelease = async () => {
    try {
      await API.put(`/specs/${specId}/unrelease`);
      toast.success('Spec dibatalkan rilis');
      socket?.emit('spec_unreleased', { id: specId, itemcode: spec?.itemcode, speccode: spec?.speccode });
      await API.post('/chat/alerts', {
        spec_id: specId, type: 'unrelease',
        message: `⚠️ Spec ${spec?.itemcode} telah DIBATALKAN RILIS. Harap hapus dalam 24 jam!`,
        target_role: 'tech', expires_hours: 24
      });
      loadSpec(); onRefresh?.();
    } catch { toast.error('Gagal membatalkan rilis'); }
  };

  const handleDelete = async () => {
    // Cek jika user TECH dan spec aktif
    if (user?.role === 'tech' && spec.active == 1) {
      toast.error('Spec aktif tidak dapat dihapus! Batalkan rilis terlebih dahulu.');
      return;
    }
    try {
      await API.delete(`/specs/${specId}`);
      toast.success('Spec dipindahkan ke history');
      onClose(); onRefresh?.();
    } catch { toast.error('Gagal menghapus'); }
  };

  const handleSaveCoret = async (dataUrl) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append('pic', blob, 'annotation.jpg');
      await API.put(`/specs/${specId}/coret`, fd);
      toast.success('Anotasi tersimpan!');
      socket?.emit('coret_saved', { id: specId, itemcode: spec?.itemcode, coretby: user?.name });
      setShowCoret(false); 
      loadSpec();
      loadImage(); // refresh gambar
    } catch { toast.error('Gagal menyimpan anotasi'); }
  };

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }} onClick={e => e.stopPropagation()}>
        <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    </div>
  );

  if (!spec) return null;

  const isActive = spec.active == 1;
  const canDelete = user?.role === 'admin' || (user?.role === 'tech' && !isActive);

  // Format pesan duplikat
  const duplicateMessage = duplicateWarning && duplicateWarning.length > 0 ? (
    <div className="alert alert-warning" style={{ margin: '0 24px', marginTop: 12 }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      <div>
        <strong>Duplicate Active Spec!</strong> There {duplicateWarning.length === 1 ? 'is' : 'are'} {duplicateWarning.length} other active spec(s) with the same:
        <ul style={{ margin: '4px 0 0 20px', fontSize: 12 }}>
          <li>Item Code: <strong>{spec.itemcode}</strong></li>
          <li>GITI Code: <strong>{spec.giticode}</strong></li>
          <li>Machine Type: <strong>{spec.mesintype}</strong></li>
          <li>MCN Side: <strong>{spec.mesinside}</strong></li>
        </ul>
        <span style={{ fontSize: 11 }}>Consider unreleasing older specs: {duplicateWarning.map(d => d.speccode).join(', ')}</span>
      </div>
    </div>
  ) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800 }}>{spec.itemcode || 'N/A'}</h2>
                <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
                  {isActive ? '● Active' : '○ Inactive'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {spec.speccode} · {spec.typespec} · {spec.process}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {canRelease && !isActive && (
              <button className="btn btn-primary btn-sm" onClick={handleRelease}>
                <CheckCircle size={13} /> Release
              </button>
            )}
            {canRelease && isActive && (
              <button className="btn btn-secondary btn-sm" onClick={handleUnrelease}>
                <XCircle size={13} /> Unrelease
              </button>
            )}
            {canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCoret(true)}>
                <Pen size={13} /> Annotate
              </button>
            )}
            {canEdit && (
              <button
                className={`btn btn-danger btn-sm ${!canDelete ? 'disabled' : ''}`}
                onClick={() => setConfirmDelete(true)}
                disabled={!canDelete}
                title={!canDelete ? 'Spec aktif tidak dapat dihapus' : 'Hapus spec'}
                style={{ opacity: !canDelete ? 0.5 : 1, cursor: !canDelete ? 'not-allowed' : 'pointer' }}
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Duplicate warning */}
        {duplicateMessage}

        {/* Tabs */}
        <div style={{ padding: '0 24px' }}>
          <div className="tabs">
            <button className={`tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
              <Eye size={13} style={{ marginRight: 5 }} />Info
            </button>
            <button className={`tab ${tab === 'spec' ? 'active' : ''}`} onClick={() => setTab('spec')}>
              <Image size={13} style={{ marginRight: 5 }} />Spec Image
            </button>
            <button className={`tab ${tab === 'memo' ? 'active' : ''}`} onClick={() => setTab('memo')}>
              <FileText size={13} style={{ marginRight: 5 }} />Memo Doc
            </button>
            <button className={`tab ${tab === 'coret' ? 'active' : ''}`} onClick={() => setTab('coret')}>
              <Pen size={13} style={{ marginRight: 5 }} />Annotation
            </button>
            <button className={`tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
              <MessageSquare size={13} style={{ marginRight: 5 }} />Chat
            </button>
            <button className={`tab ${tab === 'digital' ? 'active' : ''}`} onClick={() => setTab('digital')}>
              <FileText size={13} style={{ marginRight: 5 }} /> Digital Spec
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {tab === 'info' && (
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['Item Code', spec.itemcode], ['GITI Code', spec.giticode],
                  ['Spec Code', spec.speccode], ['Type', spec.typespec],
                  ['Process', spec.process], ['Machine Type', spec.mesintype],
                  ['MCN', spec.mcn], ['MCN Side', spec.mesinside],
                  ['Created By', spec.createdby], ['Date Created', spec.datecreated],
                  ['Corrected By', spec.coretby], ['Date Corrected', spec.datecoret],
                  ['Last Update', spec.lastupdate], ['Sch. Release Date', spec.schreleasedate],
                  ['Shift Release', spec.shiftrelease], ['Image Name', spec.imagename],
                ].map(([label, val]) => (
                  <div key={label} className="card" style={{ padding: '12px 16px' }}>
                    <p className="form-label" style={{ marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{val || <span style={{ color: 'var(--text-muted)' }}>—</span>}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'spec' && (
            <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {imageBlobUrl ? (
                <img
                  src={imageBlobUrl}
                  alt="Spec"
                  style={{ maxWidth: '100%', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow)' }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="empty-state">
                  <Image size={40} />
                  <span>No spec image uploaded</span>
                </div>
              )}
            </div>
          )}

          {tab === 'memo' && (
            <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
              {memoBlobUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                  <div className="alert alert-info" style={{ width: '100%' }}>
                    <FileText size={14} />
                    <span>Document: <strong>{spec.memoname || 'Memo file'}</strong></span>
                  </div>
                  {spec.memoname?.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={memoBlobUrl}
                      style={{ width: '100%', height: 500, borderRadius: 'var(--radius)', border: '1.5px solid var(--border)' }}
                      title="Memo PDF"
                    />
                  ) : (
                    <img
                      src={memoBlobUrl}
                      alt="Memo"
                      style={{ maxWidth: '100%', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)' }}
                    />
                  )}
                  <a href={memoBlobUrl} download={spec.memoname} className="btn btn-secondary">
                    Download Memo
                  </a>
                </div>
              ) : (
                <div className="empty-state">
                  <FileText size={40} />
                  <span>No memo document attached</span>
                </div>
              )}
            </div>
          )}

          {tab === 'coret' && (
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              {imageBlobUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                  <div className="alert alert-info" style={{ width: '100%' }}>
                    <Pen size={14} />
                    <span>Annotated by <strong>{spec.coretby || '—'}</strong> on {spec.datecoret ? new Date(spec.datecoret).toLocaleString() : '—'}</span>
                  </div>
                  <img
                    src={imageBlobUrl}
                    alt="Annotation"
                    style={{ maxWidth: '100%', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)' }}
                  />
                  {canEdit && (
                    <button className="btn btn-secondary" onClick={() => setShowCoret(true)}>
                      <Pen size={13} /> Edit Annotation
                    </button>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <Pen size={40} />
                  <span>No annotations yet</span>
                  {canEdit && (
                    <button className="btn btn-primary" onClick={() => setShowCoret(true)}>
                      <Pen size={13} /> Create Annotation
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <SpecChat specId={specId} specInfo={spec} />
            </div>
          )}
          
          {tab === 'digital' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <DigitalSpec specId={specId} specInfo={spec} />
            </div>
          )}
        </div>
      </div>

      {/* Coret modal */}
      {showCoret && (
        <div className="modal-overlay" onClick={() => setShowCoret(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>✏️ Annotate Spec: {spec.itemcode}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCoret(false)}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
              <CoretCanvas
                imageUrl={imageBlobUrl || null}
                onSave={handleSaveCoret}
                onClose={() => setShowCoret(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, color: 'var(--danger)' }}>⚠️ Confirm Delete</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirmDelete(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>
                Are you sure you want to delete spec <strong>{spec.itemcode} - {spec.speccode}</strong>?
                <br />It will be moved to history and can be restored later.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete Spec</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}