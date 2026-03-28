import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Image } from 'lucide-react';
import { useApp, API } from '../../context/AppContext';
import toast from 'react-hot-toast';

export default function SpecForm({ specId, onClose, onSuccess }) {
  const { user, socket } = useApp();
  const [form, setForm] = useState({
    itemcode: '', giticode: '', imagename: '', speccode: '',
    typespec: '', process: '', mesintype: '', mcn: '',
    mesinside: '', memoname: '', schreleasedate: '', shiftrelease: ''
  });
  const [picFile, setPicFile] = useState(null);
  const [memoFile, setMemoFile] = useState(null);
  const [picPreview, setPicPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSpec, setLoadingSpec] = useState(false);
  const [machineTypes, setMachineTypes] = useState([]);
  const [machineInsides, setMachineInsides] = useState([]);
  const [imageBlobUrl, setImageBlobUrl] = useState(null);
  // state untuk data dari mastermcn
  const [mcnData, setMcnData] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [mcnOptions, setMcnOptions] = useState([]);

  const isEdit = !!specId;

  // Ambil daftar distinct machine type dan machine inside dari database (untuk fallback)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { data } = await API.get('/specs');
        const types = [...new Set(data.map(s => s.mesintype).filter(Boolean))];
        const insides = [...new Set(data.map(s => s.mesinside).filter(Boolean))];
        setMachineTypes(types);
        setMachineInsides(insides);
      } catch (err) {
        console.error('Gagal mengambil opsi machine type/inside', err);
      }
    };
    fetchOptions();
  }, []);

  // Ambil semua data mastermcn (untuk dropdown dinamis)
  useEffect(() => {
    const fetchMasterMcn = async () => {
      try {
        const { data } = await API.get('/mastermcn');
        setMcnData(data);
      } catch (err) {
        console.error('Gagal mengambil data master MCN', err);
      }
    };
    fetchMasterMcn();
  }, []);

  // Saat process berubah, filter options
  useEffect(() => {
    if (!form.process || !mcnData.length) {
      setTypeOptions([]);
      setMcnOptions([]);
      return;
    }
    const filtered = mcnData.filter(item => item.process === form.process);
    // Ambil unique type
    const types = [...new Set(filtered.map(item => item.type).filter(Boolean))];
    setTypeOptions(types);
    // Jika type sudah dipilih, filter mcn berdasarkan type
    if (form.mesintype) {
      const mcnFiltered = filtered.filter(item => item.type === form.mesintype);
      const mcnUnique = [...new Set(mcnFiltered.map(item => item.mcn).filter(Boolean))];
      setMcnOptions(mcnUnique);
    } else {
      setMcnOptions([]);
    }
  }, [form.process, form.mesintype, mcnData]);

  // Saat type berubah, reset mcn
  useEffect(() => {
    if (form.mesintype && form.process && mcnData.length) {
      const filtered = mcnData.filter(item => item.process === form.process && item.type === form.mesintype);
      const mcnUnique = [...new Set(filtered.map(item => item.mcn).filter(Boolean))];
      setMcnOptions(mcnUnique);
    } else {
      setMcnOptions([]);
    }
  }, [form.mesintype, form.process, mcnData]);

  useEffect(() => {
    if (!specId) return;
    setLoadingSpec(true);
    API.get(`/specs/${specId}`).then(({ data }) => {
      setForm({
        itemcode: data.itemcode || '', giticode: data.giticode || '',
        imagename: data.imagename || '', speccode: data.speccode || '',
        typespec: data.typespec || '', process: data.process || '',
        mesintype: data.mesintype || '', mcn: data.mcn || '',
        mesinside: data.mesinside || '', memoname: data.memoname || '',
        schreleasedate: data.schreleasedate || '', shiftrelease: data.shiftrelease || ''
      });
      if (data.pic) {
        API.get(`/specs/${specId}/pic`, { responseType: 'blob' })
          .then(res => {
            if (res.data.size > 0) {
              const url = URL.createObjectURL(res.data);
              setImageBlobUrl(url);
              setPicPreview(url);
            }
          })
          .catch(() => {});
      }
    }).finally(() => setLoadingSpec(false));
  }, [specId]);

  useEffect(() => {
    return () => {
      if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
    };
  }, [imageBlobUrl]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePic = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setPicFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPicPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemcode || !form.speccode) {
      toast.error('Item code dan spec code wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (picFile) fd.append('pic', picFile);
      if (memoFile) fd.append('memo', memoFile);

      if (isEdit) {
        await API.put(`/specs/${specId}`, fd);
        toast.success('Spec berhasil diperbarui!');
      } else {
        const { data } = await API.post('/specs', fd);
        toast.success('Spec berhasil dibuat!');
        socket?.emit('spec_uploaded', { id: data.id, itemcode: form.itemcode, speccode: form.speccode });
        await API.post('/chat/alerts', {
          spec_id: data.id, type: 'new_upload',
          message: `Spec baru diupload oleh TECH: ${form.itemcode} - ${form.speccode}`,
          target_role: 'ppc'
        });
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan spec');
    } finally { setLoading(false); }
  };

  const TYPES = ['Regular', 'Temporary', 'Testing'];
  const SHIFTS = ['I', 'II', 'III', 'All'];

  if (loadingSpec) return (
    <div className="modal-overlay">
      <div className="modal modal-md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 800 }}>{isEdit ? '✏️ Edit Spec' : '➕ New Spec'}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Item Code *</label>
                <input className="form-input" value={form.itemcode} onChange={e => setField('itemcode', e.target.value)} placeholder="e.g. TY-001" required />
              </div>
              <div className="form-group">
                <label className="form-label">GITI Code</label>
                <input className="form-input" value={form.giticode} onChange={e => setField('giticode', e.target.value)} placeholder="GITI Code" />
              </div>
              <div className="form-group">
                <label className="form-label">Spec Code *</label>
                <input className="form-input" value={form.speccode} onChange={e => setField('speccode', e.target.value)} placeholder="e.g. SP-2024-001" required />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.typespec} onChange={e => setField('typespec', e.target.value)}>
                  <option value="">Select Type</option>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Process</label>
                <select className="form-select" value={form.process} onChange={e => setField('process', e.target.value)}>
                  <option value="">Select Process</option>
                  {/* Ambil daftar process unik dari mastermcn */}
                  {[...new Set(mcnData.map(item => item.process).filter(Boolean))].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Machine Type</label>
                <select
                  className="form-select"
                  value={form.mesintype}
                  onChange={e => setField('mesintype', e.target.value)}
                  disabled={!form.process}
                >
                  <option value="">Select Machine Type</option>
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">MCN</label>
                <select
                  className="form-select"
                  value={form.mcn}
                  onChange={e => setField('mcn', e.target.value)}
                  disabled={!form.mesintype}
                >
                  <option value="">Select MCN</option>
                  {mcnOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Machine Inside</label>
                <select className="form-select" value={form.mesinside} onChange={e => setField('mesinside', e.target.value)}>
                  <option value="">Select Machine Inside</option>
                  {machineInsides.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Image Name</label>
                <input className="form-input" value={form.imagename} onChange={e => setField('imagename', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Scheduled Release Date</label>
                <input className="form-input" type="date" value={form.schreleasedate} onChange={e => setField('schreleasedate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Shift Release</label>
                <select className="form-select" value={form.shiftrelease} onChange={e => setField('shiftrelease', e.target.value)}>
                  <option value="">Select Shift</option>
                  {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* File uploads */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div className="form-group">
                <label className="form-label">Spec Image (JPG/PNG)</label>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: 16, border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', transition: 'var(--transition)', gap: 8
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--yellow)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {picPreview ? (
                    <img src={picPreview} alt="Preview" style={{ maxHeight: 120, borderRadius: 6 }} />
                  ) : (
                    <>
                      <Image size={24} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to upload spec image</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handlePic} style={{ display: 'none' }} />
                </label>
                {picFile && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{picFile.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Memo Document (PDF/Image)</label>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: 16, border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', transition: 'var(--transition)', gap: 8,
                  minHeight: memoFile ? 'auto' : 120, justifyContent: 'center'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--yellow)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <FileText size={24} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {memoFile ? memoFile.name : form.memoname || 'Click to upload memo'}
                  </span>
                  <input type="file" accept=".pdf,image/*" onChange={e => { setMemoFile(e.target.files[0]); }} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? 'Update Spec' : 'Create Spec'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}