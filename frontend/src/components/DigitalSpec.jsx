import React, { useState, useEffect } from 'react';
import { Save, Upload, AlertCircle, X } from 'lucide-react';
import { useApp, API } from '../context/AppContext';
import toast from 'react-hot-toast';

export default function DigitalSpec({ specId, specInfo }) {
  const { user } = useApp();
  const [digitalData, setDigitalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const canEdit = user?.role === 'tech' || user?.role === 'admin';

  const loadDigitalSpec = async () => {
    if (!specId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.get(`/digital/${specId}`);
      setDigitalData(data.digital);
      if (data.digital) {
        setFormData(data.digital);
      } else {
        setFormData({});
      }
    } catch (err) {
      toast.error('Gagal memuat digital spec');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!specId) return;
    loadDigitalSpec();
  }, [specId]);

  const handleSave = async () => {
    if (!specId) return;
    try {
      await API.post(`/digital/${specId}`, formData);
      toast.success('Digital spec tersimpan');
      setEditing(false);
      loadDigitalSpec();
    } catch (err) {
      toast.error('Gagal menyimpan');
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    const fd = new FormData();
    fd.append('file', uploadFile);
    setUploading(true);
    try {
      await API.post('/digital/upload-excel', fd);
      toast.success('Import berhasil');
      setShowUploadModal(false);
      setUploadFile(null);
      if (specId) {
        loadDigitalSpec();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal import');
    } finally {
      setUploading(false);
    }
  };

  const renderField = (label, field, type = 'text') => {
    const value = formData[field] || '';
    if (!editing) {
      return (
        <div className="card" style={{ padding: '8px 12px', minWidth: 0, overflowX: 'auto' }}>
          <p className="form-label" style={{ marginBottom: 2 }}>{label}</p>
          <p style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{value || '—'}</p>
        </div>
      );
    }
    return (
      <div className="form-group" style={{ minWidth: 0 }}>
        <label className="form-label">{label}</label>
        {type === 'textarea' ? (
          <textarea
            className="form-textarea"
            rows={2}
            value={value}
            onChange={e => setFormData({ ...formData, [field]: e.target.value })}
          />
        ) : (
          <input
            className="form-input"
            type={type}
            value={value}
            onChange={e => setFormData({ ...formData, [field]: e.target.value })}
          />
        )}
      </div>
    );
  };

  if (loading) return <div className="empty-state"><span className="spinner" /></div>;

  const mesinside = specInfo?.mesinside?.toLowerCase() || '';
  const isBTD = mesinside.includes('btd');
  const isPUD = mesinside.includes('pud');
  const process = specInfo?.process?.toLowerCase() || '';
  const isBuilding = process === 'building';

  // Debug: tampilkan di console untuk verifikasi
  // console.log('🔍 DigitalSpec Debug:', { 
  //   specId, 
  //   mesinside, 
  //   isBTD, 
  //   isPUD, 
  //   isBuilding,
  //   digitalDataExists: !!digitalData,
  //   formDataKeys: Object.keys(formData)
  // });

  if (!isBuilding) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div className="alert alert-info" style={{ display: 'inline-flex', gap: 8 }}>
          <AlertCircle size={16} />
          <span>
            Digital spec hanya tersedia untuk process <strong>Building</strong>.<br />
            Process saat ini: <strong>{specInfo?.process || '—'}</strong>
          </span>
        </div>
      </div>
    );
  }

  if (!isBTD && !isPUD) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div className="alert alert-info" style={{ display: 'inline-flex', gap: 8 }}>
          <AlertCircle size={16} />
          <span>
            Digital spec hanya tersedia untuk MCN Side <strong>BTD</strong> atau <strong>PUD</strong>.<br />
            MCN Side saat ini: <strong>{specInfo?.mesinside || '—'}</strong>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            Digital Spec {isBTD ? '(BTD)' : '(PUD)'}
          </h3>
          {canEdit && (
            <div style={{ display: 'flex', gap: 8 }}>
              {!editing ? (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                    <Save size={12} /> Edit
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowUploadModal(true)}>
                    <Upload size={12} /> Import Excel
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary btn-sm" onClick={handleSave}>
                    <Save size={12} /> Simpan
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                    Batal
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {!digitalData && !editing && (
          <div className="alert alert-info" style={{ marginTop: 8 }}>
            <AlertCircle size={14} />
            <span>Belum ada data digital spec. {canEdit && 'Klik Edit untuk menambahkan.'}</span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
   

        {isBTD && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {renderField('Item Code', 'item_code')}
            {renderField('GITI Code', 'giticode')}
            {renderField('Description', 'desc')}
            {renderField('No Spec', 'no_spec')}
            {renderField('No Revisi', 'no_revisi')}
            {renderField('Tanggal', 'tanggal', 'date')}
            {renderField('Process', 'prosess')}
            {renderField('RIM', 'rim')}
            {renderField('Tipe Drum', 'tipe_drumb')}
            {renderField('Type Spec', 'type_spec')}
            {/* Belt 1 */}
            {renderField('Code Belt 1', 'code_belt1')}
            {renderField('Lebar Belt 1', 'lebar_belt1')}
            {renderField('Setting Laser Belt 1', 'setting_laser_belt1')}
            {renderField('Arah Sudut Belt 1', 'arah_sudut_belt1')}
            {renderField('Angle Belt 1', 'angel_belt1')}
            {/* Belt 2 */}
            {renderField('Code Belt 2', 'code_belt2')}
            {renderField('Lebar Belt 2', 'lebar_belt2')}
            {renderField('Setting Laser Belt 2', 'setting_laser_belt2')}
            {renderField('Arah Sudut Belt 2', 'arah_sudut_belt2')}
            {renderField('Angle Belt 2', 'angel_belt2')}
            {/* Belt 3 */}
            {renderField('Code Belt 3', 'code_belt3')}
            {renderField('Lebar Belt 3', 'lebar_belt3')}
            {renderField('Setting Laser Belt 3', 'setting_laser_belt3')}
            {renderField('Arah Sudut Belt 3', 'arah_sudut_belt3')}
            {renderField('Angle Belt 3', 'angel_belt3')}
            {/* Belt 0 */}
            {renderField('Code Belt 0', 'code_belt0')}
            {renderField('Lebar Belt 0', 'lebar_belt0')}
            {renderField('Setting Laser Belt 0', 'setting_laser_belt0')}
            {renderField('Arah Sudut Belt 0', 'arah_sudut_belt0')}
            {/* Belt 4 */}
            {renderField('Code Belt 4', 'code_belt4')}
            {renderField('Lebar Belt 4', 'lebar_belt4')}
            {renderField('Setting Laser Belt 4', 'setting_laser_belt4')}
            {renderField('Arah Sudut Belt 4', 'arah_sudut_belt4')}
            {renderField('Angle Belt 4', 'angel_belt4')}
            {/* Tread */}
            {renderField('Code Tread', 'code_tread')}
            {renderField('Crown Width', 'crown_width')}
            {renderField('Crown After Stiching', 'crown_after_stiching')}
            {renderField('Total Width', 'total_width')}
            {renderField('Length', 'length')}
            {renderField('Press BTD', 'press_btd')}
            {renderField('BDOC', 'bdoc')}
            {renderField('GOC', 'goc')}
            {renderField('GT Weight', 'gt_weight')}
            {renderField('GT Height', 'gt_height')}
            {renderField('NWT', 'nwt')}
            {renderField('Inisial Tread', 'inisial_tread')}
            {renderField('Item Perubahan', 'item_perubahan')}
            {renderField('Alasan Perubahan', 'alasan_perubahan')}
            {renderField('PIC', 'pic')}
            {renderField('Tgl Expdsi', 'tgl_expdsi')}
            {renderField('Const', 'const')}
            {renderField('Upload By', 'upload_by')}
          </div>
        )}

        {isPUD && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {renderField('Item Code', 'item_code')}
            {renderField('GITI Code', 'giticode')}
            {renderField('Description', 'desc')}
            {renderField('No Spec', 'no_spec')}
            {renderField('No Revisi', 'no_revisi')}
            {renderField('Tanggal', 'tanggal', 'date')}
            {renderField('Process', 'process')}
            {renderField('RIM', 'rim')}
            {renderField('Tipe Drum', 'tipe_drum')}
            {renderField('Type Spec', 'type_spec')}
            {/* PUD specific fields */}
            {renderField('BTB BLD', 'btb_bld')}
            {renderField('BTB CTR', 'btb_ctr')}
            {renderField('Pre Shape', 'pre_shape')}
            {renderField('Shape', 'shape')}
            {renderField('After Shape', 'after_shape')}
            {renderField('PUD Size', 'pud_size')}
            {renderField('PUD Awal', 'pud_awal')}
            {renderField('PUD Stich Strached', 'pud_stich_strached')}
            {renderField('PUD CTR', 'pud_ctr')}
            {renderField('PUD Type Flange', 'pud_type_flange')}
            {renderField('PUD Supp Bladder', 'pud_supp_bladder')}
            {renderField('PUD Pressure', 'pud_pressure')}
            {renderField('Code Sidewall', 'code_sidewall')}
            {renderField('Lebar Sidewall', 'lebar_sidewall')}
            {renderField('Panjang Sidewall', 'panjang_sidewall')}
            {renderField('Laser Sidewall', 'laser_sidewall')}
            {renderField('Code Innerliner', 'code_innerlinner')}
            {renderField('Lebar Innerliner Squege', 'lebar_innerlinner_squege')}
            {renderField('Lebar Innerliner Airproof', 'lebar_innerlinner_airproof')}
            {renderField('Lebar Innerliner RS', 'lebar_innerlinner_rs')}
            {renderField('Panjang Innerliner', 'panjang_innerlinner')}
            {renderField('Laser Innerliner', 'laser_innerlinner')}
            {renderField('Lebar Pre Assy', 'lebar_pre_assy')}
            {renderField('Laser Pre Assy', 'laser_pre_assy')}
            {renderField('Step IL SW', 'step_IL_SW')}
            {renderField('Code Nylon Chafer', 'code_nylonchafer')}
            {renderField('Lebar Nylon Chafer', 'lebar_nylonchafer')}
            {renderField('Panjang Nylon Chafer', 'panjang_nylonchafer')}
            {renderField('Laser Nylon Chafer', 'laser_nylonchafer')}
            {renderField('Sudut Nylon Chafer', 'sudut_nylonchafer')}
            {renderField('Code Double Nylon Chafer', 'code_double_nylonchafer')}
            {renderField('Lebar Double Nylon Chafer', 'lebar_double_nylonchafer')}
            {renderField('Panjang Double Nylon Chafer', 'panjang_double_nylonchafer')}
            {renderField('Sudut Double Nylon Chafer', 'sudut_double_nylonchafer')}
            {renderField('Laser Double Nylon Chafer', 'laser_double_nylonchafer')}
            {renderField('Code Chafer', 'code_chafer')}
            {renderField('Lebar Chafer', 'lebar_chafer')}
            {renderField('Panjang Chafer', 'panjang_chafer')}
            {renderField('Laser Chafer', 'laser_chafer')}
            {renderField('Arah Sudut Chafer L', 'arah_sudut_chafer_L')}
            {renderField('Arah Sudut Chafer R', 'arah_sudut_chafer_R')}
            {renderField('Code Bodyply', 'code_bodyply')}
            {renderField('Panjang Bodyply', 'panjang_bodyply')}
            {renderField('Lebar Bodyply', 'lebar_bodyply')}
            {renderField('Laser Bodyply', 'laser_bodyply')}
            {renderField('Code Bead', 'code_bead')}
            {renderField('Marking Bead', 'marking_bead')}
            {renderField('Panjang Bead', 'panjang_bead')}
            {renderField('Tinggi Bead', 'tinggi_bead')}
            {renderField('Apex', 'apex')}
            {renderField('Code BEC', 'code_bec')}
            {renderField('Lebar BEC', 'lebar_bec')}
            {renderField('Panjang BEC', 'panjang_bec')}
            {renderField('Laser BEC', 'laser_bec')}
            {renderField('Item Perubahan', 'item_perubahan')}
            {renderField('Alasan Perubahan', 'alasan_perubahan')}
            {renderField('Tgl Expdsi', 'tgl_expdsi')}
            {renderField('PIC', 'pic')}
            {renderField('Upload By', 'upload_by')}
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import Digital Spec dari Excel</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowUploadModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, marginBottom: 12 }}>
                Upload file Excel (.xlsx) dengan kolom sesuai tabel masterspec_btd atau masterspec_pud.
                Kolom harus mengandung minimal <strong>type</strong> (BTD/PUD), <strong>itemcode</strong>, dan <strong>giticode</strong>.
              </p>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={e => setUploadFile(e.target.files[0])}
                className="form-input"
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleFileUpload} disabled={!uploadFile || uploading}>
                {uploading ? 'Mengupload...' : 'Upload & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}