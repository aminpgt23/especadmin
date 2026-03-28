import React, { useState, useEffect } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { useApp, API } from '../../context/AppContext';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function DigitalSpecViewer({ specId, onClose }) {
  const { user } = useApp();
  const [digitalData, setDigitalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableName, setTableName] = useState('');

  useEffect(() => {
    if (!specId) return;
    fetchDigitalSpec();
  }, [specId]);

  const fetchDigitalSpec = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/digital/${specId}`);
      setDigitalData(data.digital);
      setTableName(data.tableName);
    } catch (err) {
      toast.error('Gagal memuat digital spec');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('digital-spec-content');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`digital-spec-${digitalData?.no_spec || 'spec'}.pdf`);
    } catch (err) {
      toast.error('Gagal menghasilkan PDF');
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  if (!digitalData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
          <div className="modal-header">
            <h3 style={{ fontWeight: 700 }}>Digital Spec</h3>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p>Tidak ada data digital spec untuk spec ini.</p>
          </div>
        </div>
      </div>
    );
  }

  const isBTD = tableName?.includes('btd');

  // Helper to safely get value or placeholder
  const getVal = (field, suffix = '') => digitalData[field] ? `${digitalData[field]} ${suffix}` : '-';

  // Render BTD layout (3 DRUM MECHANICAL BUILDING SPEC – BELT TREAD DRUM)
  const renderBTD = () => (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>3 DRUM MECHANICAL BUILDING SPEC (2nd)</h2>
        <p style={{ fontSize: 14, margin: '4px 0' }}>BELT TREAD DRUM</p>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24, border: '1px solid #ccc', padding: 16 }}>
        <div>
          <p><strong>SIZE:</strong> {digitalData.rim ? `${digitalData.rim} TUBELESS` : '-'}</p>
          <p><strong>PR LI/SS:</strong> {digitalData.press_btd || '-'}</p>
          <p><strong>PATTERN:</strong> {digitalData.code_tread || '-'}</p>
        </div>
        <div>
          <p><strong>PTGT CODE:</strong> {digitalData.giticode || '-'}</p>
          <p><strong>ITEM CODE:</strong> {digitalData.item_code || '-'}</p>
        </div>
      </div>

      {/* BELT DRUM OC */}
      <div style={{ marginBottom: 20 }}>
        <p><strong>BELT DRUM OC</strong> {digitalData.length ? `${digitalData.length} ± 2` : '-'}</p>
      </div>

      {/* Belt table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, border: '1px solid #ccc' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>NQ</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>ITEM</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>CODE</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>LEBAR (mm)</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>SETTING LASER</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>ARAH SUDUT</th>
          </tr>
        </thead>
        <tbody>
          {[1,2,3,4].map(i => {
            const code = digitalData[`code_belt${i}`];
            const lebar = digitalData[`lebar_belt${i}`];
            const laser = digitalData[`setting_laser_belt${i}`];
            const arah = digitalData[`arah_sudut_belt${i}`];
            if (!code && !lebar && !laser && !arah) return null;
            return (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{i}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>BELT-{i}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{code || '-'}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{lebar ? `${lebar} ± 2` : '-'}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{laser || '-'}</td>
                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{arah ? '✓' : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Tread Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24, border: '1px solid #ccc', padding: 16 }}>
        <div>
          <p><strong>TREAD</strong> {digitalData.code_tread || '-'}</p>
          <p><strong>CROWN WIDTH</strong> {digitalData.crown_width ? `${digitalData.crown_width} ± 3` : '-'}</p>
          <p><strong>*Crown After Stitching</strong> {digitalData.crown_after_stiching ? `${digitalData.crown_after_stiching} ± 10` : '-'}</p>
          <p><strong>TOTAL WIDTH</strong> {digitalData.total_width ? `${digitalData.total_width} ± 3` : '-'}</p>
        </div>
        <div>
          <p><strong>GOC</strong> {digitalData.goc ? `${digitalData.goc} ± 10` : '-'}</p>
          <p><strong>GT WEIGHT</strong> {digitalData.gt_weight ? `${digitalData.gt_weight} ± 2.08` : '-'}</p>
          <p><strong>GT Height</strong> {digitalData.gt_height ? `${digitalData.gt_height} ± 30` : '-'}</p>
        </div>
      </div>

      {/* Presse BTD */}
      <div style={{ marginBottom: 24 }}>
        <p><strong>PRESSE BTD</strong> AKTIF | LENGTH {digitalData.length ? `${digitalData.length} +5 -10` : '-'}</p>
      </div>

      {/* Tread Marking */}
      <div style={{ marginBottom: 24 }}>
        <p><strong>TREAD MARKING :</strong></p>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
          <span>- (5) Tread</span>
          <span>- (2) 2nd Belt</span>
          <span>- (1) 1st Belt</span>
          <span>- (3) 3rd Belt</span>
          <span>- (4) 4th Belt</span>
          <span>- (5) 5th Belt</span>
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 24, background: '#f9f9f9', padding: 12 }}>
        <p><strong>NOTE :</strong></p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Toleransi off-Center: ± 1mm</li>
          <li>Toleransi off-Center dari transfer ring: ± 1mm</li>
          <li>Toleransi panjang overlap belt-0°: 50 ± 10 mm</li>
          <li>Tread Splice: -3 ~ 0 mm</li>
        </ul>
      </div>

      {/* Reference Check and Approvals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, borderTop: '1px solid #ccc', paddingTop: 16 }}>
        <div>
          <p><strong>SPEC NO.</strong> {digitalData.no_spec || '-'}</p>
          <p><strong>TANGGAL</strong> {digitalData.tanggal || '-'}</p>
          <p><strong>No Spec Sebelumnya</strong> {digitalData.item_perubahan || '-'}</p>
        </div>
        <div>
          <p><strong>TECHNICAL TBR DEPT.</strong></p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {/* <div><small>2nd Approve</small><br />{digitalData.coretby || '-'}</div>
            <div><small>1st Approve</small><br />{digitalData.createdby || '-'}</div> */}
            <div><small>Engineer / Leader</small><br />{digitalData.upload_by || '-'}</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, textAlign: 'center', color: '#666' }}>
        RTD-F02 No.12 Rev.: 8
      </div>
    </div>
  );

  // Render PUD layout (3 DRUM MECHANICAL BUILDING SPEC – PLY UP & BUILDING DRUM)
  const renderPUD = () => (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>3 DRUM MECHANICAL BUILDING SPEC (1st)</h2>
        <p style={{ fontSize: 14, margin: '4px 0' }}>PLY UP & BUILDING DRUM</p>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24, border: '1px solid #ccc', padding: 16 }}>
        <div>
          <p><strong>SIZE:</strong> {digitalData.rim ? `${digitalData.rim} TUBELESS` : '-'}</p>
          <p><strong>PR LI/SS:</strong> {digitalData.press_btd || '-'}</p>
          <p><strong>PATTERN:</strong> {digitalData.code_tread || '-'}</p>
        </div>
        <div>
          <p><strong>PTGT CODE:</strong> {digitalData.giticode || '-'}</p>
          <p><strong>ITEM CODE:</strong> {digitalData.item_code || '-'}</p>
        </div>
      </div>

      {/* Main Process Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, border: '1px solid #ccc' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>NO</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>ITEM</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>CODE</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>LEBAR (mm)</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>PANJANG (mm)</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>ARAH SUDUT</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>SETTING LASER</th>
          </tr>
        </thead>
        <tbody>
          {/* Sidewall + Inner Liner + Pre-Assembly */}
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>1</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>SIDEWALL</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.code_sidewall || '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.lebar_sidewall ? `${digitalData.lebar_sidewall} ± 3` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.panjang_sidewall ? `${digitalData.panjang_sidewall} ± 5` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.laser_sidewall || '-'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}></td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>INNER LINER</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.code_innerlinner || '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.lebar_innerlinner_squege ? `${digitalData.lebar_innerlinner_squege} ± 5` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.panjang_innerlinner ? `${digitalData.panjang_innerlinner} ± 5` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.laser_innerlinner || '-'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}></td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>PRE-ASSEMBLY</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>-</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.lebar_pre_assy ? `${digitalData.lebar_pre_assy} ± 3` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.panjang_innerlinner ? `${digitalData.panjang_innerlinner} ± 5` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.laser_pre_assy || '-'}</td>
          </tr>

          {/* Chafer L and R */}
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>2</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>CHAFER (L)</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.code_chafer || '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.lebar_chafer ? `${digitalData.lebar_chafer} ± 2` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.panjang_chafer ? `${digitalData.panjang_chafer} ± 5` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{digitalData.arah_sudut_chafer_L ? '✓' : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.laser_chafer || '-'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}></td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>CHAFER (R)</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.code_chafer || '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.lebar_chafer ? `${digitalData.lebar_chafer} ± 2` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.panjang_chafer ? `${digitalData.panjang_chafer} ± 5` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{digitalData.arah_sudut_chafer_R ? '✓' : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.laser_chafer || '-'}</td>
          </tr>

          {/* Body Ply */}
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>3</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>BODY PLY</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.code_bodyply || '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.lebar_bodyply ? `${digitalData.lebar_bodyply} ± 2` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.panjang_bodyply ? `${digitalData.panjang_bodyply} ± 5` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{digitalData.arah_sudut_bodyply ? '✓' : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.laser_bodyply || '-'}</td>
          </tr>

          {/* Bead */}
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>4</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>BEAD</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.code_bead || '-'}</td>
            <td colSpan="2" style={{ border: '1px solid #ccc', padding: 8 }}>MARKING: {digitalData.marking_bead || '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>TINGGI APEX: {digitalData.tinggi_bead ? `${digitalData.tinggi_bead} mm ± 5` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>-</td>
          </tr>

          {/* BEC */}
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>5</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>BEC</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.code_bec || '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.lebar_bec ? `${digitalData.lebar_bec} ± 3` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.panjang_bec ? `${digitalData.panjang_bec} +0 -10` : '-'}</td>
            <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.laser_bec || '-'}</td>
          </tr>
        </tbody>
      </table>

      {/* Parameter Proses Table */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>PARAMETER PROSES</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>BUILDING DRUM</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Bead to Bead</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Pre-Shaping (mm)</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Shaping (mm)</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>After Shaping (mm)</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Ply Up Drum OC (mm)</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Ply Stiching</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>CTR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>BLD Drum (mm)</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.btb_bld ? `${digitalData.btb_bld} ± 1` : '-'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.pre_shape ? `${digitalData.pre_shape} ±10` : '-'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.shape ? `${digitalData.shape} ±5` : '-'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.after_shape ? `${digitalData.after_shape} ±5` : '-'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.pud_awal ? `${digitalData.pud_awal} ± 2` : '-'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.pud_stich_strached ? `${digitalData.pud_stich_strached} ± 2` : '-'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.pud_ctr ? `${digitalData.pud_ctr} ± 2` : '-'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>at CTR (mm)</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{digitalData.btb_ctr ? `${digitalData.btb_ctr} ± 1` : '-'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }} colSpan="6"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Drum Centre Line Diagram */}
      <div style={{ marginBottom: 24, border: '1px solid #ccc', padding: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>DRUM CENTRE LINE</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>1/2 Bead to Bead: {digitalData.pud_size ? digitalData.pud_size : '331'}</div>
          <div>(6) Belt Edge Cuchion: 125</div>
          <div>(4) Body Ply: {digitalData.lebar_bodyply ? digitalData.lebar_bodyply : '380'}</div>
          <div>(3) Steel Chafer: {digitalData.lebar_chafer ? digitalData.lebar_chafer : '363'}</div>
          <div>(2) Inner Liner Assy: {digitalData.lebar_innerlinner_rs ? digitalData.lebar_innerlinner_rs : '330'}</div>
          <div>Step Sidewall - I/L = 20</div>
          <div>(1) Sidewall: {digitalData.lebar_sidewall ? digitalData.lebar_sidewall : '310'}</div>
          <div>Lihat arah Rim Cushion !</div>
        </div>
      </div>

      {/* Joint Splice Note */}
      <div style={{ marginBottom: 24, background: '#f9f9f9', padding: 12 }}>
        <p><strong>NOTE:</strong> STANDARD UNTUK JOINT SPLICE SIDEWALL, INNER LINER DAN BEC : 0 ~ 2</p>
      </div>

      {/* Reference Check and Approvals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, borderTop: '1px solid #ccc', paddingTop: 16 }}>
        <div>
          <p><strong>SPEC NO.</strong> {digitalData.no_spec || '-'}</p>
          <p><strong>TANGGAL</strong> {digitalData.tanggal || '-'}</p>
          <p><strong>No Spec Sebelumnya :</strong> {digitalData.item_perubahan || '-'}</p>
        </div>
        <div>
          <p><strong>TECHNICAL TBR DEPT.</strong></p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {/* <div><small>2nd Approve</small><br />{digitalData.coretby || '-'}</div>
            <div><small>1st Approve</small><br />{digitalData.createdby || '-'}</div> */}
            <div><small>Engineer / Leader</small><br />{digitalData.upload_by || '-'}</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, textAlign: 'center', color: '#666' }}>
        RTD-F02 No.11a Rev.: 8
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 1100, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
          <h3 style={{ fontWeight: 700 }}>Digital Spec {isBTD ? '(BTD)' : '(PUD)'}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} title="Cetak">
              <Printer size={14} /> Cetak
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF} title="Download PDF">
              <Download size={14} /> PDF
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        <div className="modal-body" id="digital-spec-content" style={{ background: 'white', color: 'black', fontFamily: 'Arial, sans-serif', padding: 0 }}>
          {isBTD ? renderBTD() : renderPUD()}
        </div>
      </div>
    </div>
  );
}