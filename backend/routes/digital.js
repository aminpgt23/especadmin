const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });
// console.log('✅ digital.js loaded');

// Fungsi untuk membuat tabel digital spec jika belum ada
const ensureTables = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS masterspec_btd (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        giticode VARCHAR(50),
        item_code VARCHAR(50),
        \`desc\` VARCHAR(255),
        no_spec VARCHAR(50),
        no_revisi VARCHAR(50),
        tanggal DATE,
        prosess VARCHAR(50),
        rim VARCHAR(50),
        tipe_drumb VARCHAR(50),
        type_spec VARCHAR(50),
        code_belt1 VARCHAR(50),
        lebar_belt1 VARCHAR(50),
        setting_laser_belt1 VARCHAR(50),
        arah_sudut_belt1 VARCHAR(50),
        angel_belt1 VARCHAR(50),
        code_belt2 VARCHAR(50),
        lebar_belt2 VARCHAR(50),
        setting_laser_belt2 VARCHAR(50),
        arah_sudut_belt2 VARCHAR(50),
        angel_belt2 VARCHAR(50),
        code_belt3 VARCHAR(50),
        lebar_belt3 VARCHAR(50),
        setting_laser_belt3 VARCHAR(50),
        arah_sudut_belt3 VARCHAR(50),
        angel_belt3 VARCHAR(50),
        code_belt0 VARCHAR(50),
        lebar_belt0 VARCHAR(50),
        setting_laser_belt0 VARCHAR(50),
        arah_sudut_belt0 VARCHAR(50),
        code_belt4 VARCHAR(50),
        lebar_belt4 VARCHAR(50),
        setting_laser_belt4 VARCHAR(50),
        arah_sudut_belt4 VARCHAR(50),
        angel_belt4 VARCHAR(50),
        code_tread VARCHAR(50),
        crown_width VARCHAR(50),
        crown_after_stiching VARCHAR(50),
        total_width VARCHAR(50),
        \`length\` VARCHAR(50),
        press_btd VARCHAR(50),
        bdoc VARCHAR(50),
        goc VARCHAR(50),
        gt_weight VARCHAR(50),
        gt_height VARCHAR(50),
        nwt VARCHAR(50),
        inisial_tread VARCHAR(50),
        item_perubahan VARCHAR(255),
        alasan_perubahan VARCHAR(255),
        pic VARCHAR(100),
        tgl_expdsi DATE,
        \`const\` VARCHAR(50),
        upload_by VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS masterspec_pud (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        giticode VARCHAR(50),
        item_code VARCHAR(50),
        \`desc\` LONGTEXT,
        no_spec VARCHAR(50),
        no_revisi VARCHAR(50),
        tanggal DATE,
        \`process\` VARCHAR(50),
        rim VARCHAR(50),
        tipe_drum VARCHAR(50),
        type_spec VARCHAR(50),
        btb_bld VARCHAR(50),
        btb_ctr VARCHAR(50),
        pre_shape VARCHAR(50),
        \`shape\` VARCHAR(50),
        after_shape VARCHAR(50),
        pud_size VARCHAR(50),
        pud_awal VARCHAR(50),
        pud_stich_strached VARCHAR(50),
        pud_ctr VARCHAR(50),
        pud_type_flange VARCHAR(50),
        pud_supp_bladder VARCHAR(50),
        pud_pressure VARCHAR(50),
        code_sidewall VARCHAR(50),
        lebar_sidewall VARCHAR(50),
        panjang_sidewall VARCHAR(50),
        laser_sidewall VARCHAR(50),
        code_innerlinner VARCHAR(50),
        lebar_innerlinner_squege VARCHAR(50),
        lebar_innerlinner_airproof VARCHAR(50),
        lebar_innerlinner_rs VARCHAR(50),
        panjang_innerlinner VARCHAR(50),
        laser_innerlinner VARCHAR(50),
        lebar_pre_assy VARCHAR(50),
        laser_pre_assy VARCHAR(50),
        step_IL_SW VARCHAR(50),
        code_nylonchafer VARCHAR(50),
        lebar_nylonchafer VARCHAR(50),
        panjang_nylonchafer VARCHAR(50),
        laser_nylonchafer VARCHAR(50),
        sudut_nylonchafer VARCHAR(50),
        code_double_nylonchafer VARCHAR(50),
        lebar_double_nylonchafer VARCHAR(50),
        panjang_double_nylonchafer VARCHAR(50),
        sudut_double_nylonchafer VARCHAR(50),
        laser_double_nylonchafer VARCHAR(50),
        code_chafer VARCHAR(50),
        lebar_chafer VARCHAR(50),
        panjang_chafer VARCHAR(50),
        laser_chafer VARCHAR(50),
        arah_sudut_chafer_L VARCHAR(50),
        arah_sudut_chafer_R VARCHAR(50),
        code_bodyply VARCHAR(50),
        panjang_bodyply VARCHAR(50),
        lebar_bodyply VARCHAR(50),
        laser_bodyply VARCHAR(50),
        code_bead VARCHAR(50),
        marking_bead VARCHAR(50),
        panjang_bead VARCHAR(50),
        tinggi_bead VARCHAR(50),
        apex VARCHAR(50),
        code_bec VARCHAR(50),
        lebar_bec VARCHAR(50),
        panjang_bec VARCHAR(50),
        laser_bec VARCHAR(50),
        item_perubahan TEXT,
        alasan_perubahan VARCHAR(255),
        tgl_expdsi DATE,
        pic VARCHAR(100),
        upload_by VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // console.log('Digital spec tables ready');
  } catch (err) {
    // console.error('Error creating digital spec tables:', err);
  }
};
ensureTables().catch(console.error);

// Helper: konversi serial number Excel ke tanggal ISO (YYYY-MM-DD)
function excelDateToISO(excelDate) {
  // Excel serial number: days since 1900-01-01 (Excel incorrectly treats 1900 as leap year)
  // For simplicity, we'll use a reliable conversion.
  // Note: JavaScript dates count from 1970-01-01, so we calculate offset.
  // Excel serial number 1 = 1900-01-01 (but in Excel it's 1900-01-01, while JS epoch is 1970-01-01)
  // We'll use a known conversion: = (excelDate - 25569) * 86400000
  const epoch = new Date(1900, 0, 1);
  const msPerDay = 86400000;
  const jsDate = new Date(epoch.getTime() + (excelDate - 1) * msPerDay);
  // Adjust for Excel's 1900 leap year bug (if date > 1900-02-28)
  if (excelDate > 60) {
    jsDate.setDate(jsDate.getDate() - 1);
  }
  return jsDate.toISOString().split('T')[0];
}

// Helper: konversi nilai ke format tanggal (jika berupa angka atau string)
function parseDateValue(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    // assume excel serial number
    try {
      return excelDateToISO(value);
    } catch (e) {
      console.warn('Date conversion failed for number:', value, e);
      return null;
    }
  }
  // if string, try to parse as date
  if (typeof value === 'string') {
    // try to parse common formats
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    // maybe it's a string like '01/04/2025' (dd/mm/yyyy)
    const parts = value.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

// ========== ROUTE UPLOAD EXCEL ==========
router.post('/upload-excel', authMiddleware, roleMiddleware('tech', 'admin'), upload.single('file'), async (req, res) => {
//   console.log('📁 Upload Excel route called');
  if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    // console.log(`📄 Jumlah baris terbaca: ${rows.length}`);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data di file Excel' });
    }
    const firstRow = rows[0];
    // console.log('Contoh baris pertama (headers):', Object.keys(firstRow));
    // console.log('Contoh baris pertama (values):', firstRow);

    // Cari kolom 'type' dengan case insensitive
    let typeKey = null;
    for (const key of Object.keys(firstRow)) {
      if (key.toLowerCase() === 'type') {
        typeKey = key;
        break;
      }
    }
    if (!typeKey) {
    //   console.warn('Kolom "type" tidak ditemukan, akan menggunakan tipe default?');
      // Jika tidak ada, kita bisa coba tentukan dari data? Atau abaikan? Kita akan return error.
      return res.status(400).json({ message: 'File Excel harus memiliki kolom "type" (BTD/PUD)' });
    }

    const btdData = [];
    const pudData = [];
    for (const row of rows) {
      const typeValue = row[typeKey] || '';
      const type = String(typeValue).toLowerCase();
    //   console.log(`Baris dengan type: "${typeValue}"`);
      if (type.includes('btd')) {
        btdData.push(row);
      } else if (type.includes('pud')) {
        pudData.push(row);
      } else {
        // console.log(`Baris diabaikan karena type tidak dikenali: ${typeValue}`);
      }
    }

    // console.log(`📊 BTD data: ${btdData.length} baris, PUD data: ${pudData.length} baris`);

    // Proses BTD
    for (const data of btdData) {
      const { itemcode, giticode, tanggal, tgl_expdsi, ...rest } = data;
      const insertData = {
        item_code: itemcode,
        giticode,
        ...rest,
        tanggal: parseDateValue(tanggal),
        tgl_expdsi: parseDateValue(tgl_expdsi)
      };
    //   console.log('Insert ke masterspec_btd:', insertData);
      try {
        const [result] = await db.query('INSERT INTO masterspec_btd SET ?', insertData);
        // console.log('Insert BTD success, id:', result.insertId);
      } catch (err) {
        console.error('Error inserting BTD:', err);
        throw err;
      }
    }
    // Proses PUD
    for (const data of pudData) {
      const { itemcode, giticode, tanggal, tgl_expdsi, ...rest } = data;
      const insertData = {
        item_code: itemcode,
        giticode,
        ...rest,
        tanggal: parseDateValue(tanggal),
        tgl_expdsi: parseDateValue(tgl_expdsi)
      };
    //   console.log('Insert ke masterspec_pud:', insertData);
      try {
        const [result] = await db.query('INSERT INTO masterspec_pud SET ?', insertData);
        // console.log('Insert PUD success, id:', result.insertId);
      } catch (err) {
        console.error('Error inserting PUD:', err);
        throw err;
      }
    }

    res.json({ message: `Berhasil import ${btdData.length + pudData.length} data digital spec` });
  } catch (err) {
    console.error('Error importing Excel:', err);
    res.status(500).json({ message: err.message });
  }
});

// ========== ROUTE GET berdasarkan specId ==========
router.get('/:specId', authMiddleware, async (req, res) => {
  const { specId } = req.params;
  try {
    const [specRows] = await db.query(
      'SELECT no, itemcode, giticode, process, mesinside FROM espec WHERE no = ?',
      [specId]
    );
    if (!specRows.length) return res.status(404).json({ message: 'Spec tidak ditemukan' });
    const spec = specRows[0];

    if (spec.process && spec.process.toLowerCase() !== 'building') {
      return res.json({ digital: null, message: 'Digital spec hanya tersedia untuk process building' });
    }

    let tableName = '';
    const mesinside = (spec.mesinside || '').toLowerCase();
    if (mesinside.includes('btd')) {
      tableName = 'masterspec_btd';
    } else if (mesinside.includes('pud')) {
      tableName = 'masterspec_pud';
    } else {
      return res.json({ digital: null, message: `Digital spec tidak tersedia untuk MCN Side "${spec.mesinside}"` });
    }

    const [digitalRows] = await db.query(
      `SELECT * FROM ${tableName} WHERE item_code = ? OR giticode = ? LIMIT 1`,
      [spec.itemcode, spec.giticode]
    );
    // console.log(`Digital spec ditemukan: ${digitalRows.length > 0 ? 'Ya' : 'Tidak'} (table: ${tableName})`);
    res.json({ digital: digitalRows[0] || null, tableName });
  } catch (err) {
    console.error('Error fetching digital spec:', err);
    res.status(500).json({ message: err.message });
  }
});

// ========== ROUTE POST (CREATE/UPDATE) ==========
router.post('/:specId', authMiddleware, roleMiddleware('tech', 'admin'), async (req, res) => {
  const { specId } = req.params;
  const data = req.body;
  try {
    const [specRows] = await db.query(
      'SELECT itemcode, giticode, mesinside FROM espec WHERE no = ?',
      [specId]
    );
    if (!specRows.length) return res.status(404).json({ message: 'Spec tidak ditemukan' });
    const { itemcode, giticode, mesinside } = specRows[0];

    let tableName = '';
    const mesinsideLower = (mesinside || '').toLowerCase();
    if (mesinsideLower.includes('btd')) {
      tableName = 'masterspec_btd';
    } else if (mesinsideLower.includes('pud')) {
      tableName = 'masterspec_pud';
    } else {
      return res.status(400).json({ message: 'MCN Side tidak valid untuk digital spec' });
    }

    const [existing] = await db.query(`SELECT id FROM ${tableName} WHERE item_code = ? OR giticode = ?`, [itemcode, giticode]);
    if (existing.length) {
      await db.query(`UPDATE ${tableName} SET ? WHERE id = ?`, [data, existing[0].id]);
      res.json({ message: 'Digital spec updated' });
    } else {
      data.item_code = itemcode;
      data.giticode = giticode;
      const [result] = await db.query(`INSERT INTO ${tableName} SET ?`, data);
      res.json({ id: result.insertId, message: 'Digital spec created' });
    }
  } catch (err) {
    console.error('Error saving digital spec:', err);
    res.status(500).json({ message: err.message });
  }
});

// ========== ROUTE TEST ==========
router.get('/test', (req, res) => {
  res.json({ message: 'Digital route works' });
});

module.exports = router;