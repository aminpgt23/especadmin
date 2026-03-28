const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Create tables if not exists (dengan kolom target_nip)
const initChat = async () => {
  const pool = require('../config/db');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS spec_messages (
      id INT NOT NULL AUTO_INCREMENT,
      spec_id INT NOT NULL,
      sender_nip VARCHAR(50),
      sender_name VARCHAR(100),
      sender_role VARCHAR(50),
      message TEXT,
      tagged_users VARCHAR(500),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY spec_id (spec_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS spec_alerts (
      id INT NOT NULL AUTO_INCREMENT,
      spec_id INT,
      type VARCHAR(50),
      message TEXT,
      sender_role VARCHAR(50),
      target_role VARCHAR(50),
      target_nip VARCHAR(50),               -- kolom untuk notifikasi personal (tag)
      is_read TINYINT DEFAULT 0,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Jika tabel sudah ada tapi kolom target_nip belum, tambahkan (opsional)
  try {
    await pool.query(`ALTER TABLE spec_alerts ADD COLUMN IF NOT EXISTS target_nip VARCHAR(50) NULL AFTER target_role`);
  } catch (err) {
    // kolom mungkin sudah ada
  }
};

initChat().catch(console.error);

// GET messages for a spec
router.get('/spec/:specId', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM spec_messages WHERE spec_id=? ORDER BY created_at ASC',
      [req.params.specId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST message (menyimpan pesan dan alert untuk setiap user yang ditag)
router.post('/spec/:specId', authMiddleware, async (req, res) => {
  const { message, tagged_users } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO spec_messages (spec_id, sender_nip, sender_name, sender_role, message, tagged_users) VALUES (?,?,?,?,?,?)',
      [req.params.specId, req.user.nip, req.user.name, req.user.role, message, tagged_users ? JSON.stringify(tagged_users) : null]
    );
    const [rows] = await db.query('SELECT * FROM spec_messages WHERE id=?', [result.insertId]);
    
    // Buat alert untuk setiap user yang ditag (simpan ke database)
    if (tagged_users && Array.isArray(tagged_users)) {
      for (const nip of tagged_users) {
        // Dapatkan role user yang ditag (opsional)
        const [userRows] = await db.query('SELECT dept FROM masterlogin WHERE nip=?', [nip]);
        let role = 'viewer';
        if (userRows.length) {
          const dept = (userRows[0].dept || '').toLowerCase();
          if (dept.includes('admin')) role = 'admin';
          else if (dept.includes('tech')) role = 'tech';
          else if (dept.includes('ppc')) role = 'ppc';
        }
        await db.query(
          `INSERT INTO spec_alerts (spec_id, type, message, sender_role, target_role, target_nip, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL)`,
          [req.params.specId, 'tag', `Anda ditandai dalam pesan di spec #${req.params.specId}`, req.user.role, role, nip]
        );
      }
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET alerts for current user: mengambil alert berdasarkan role (untuk notifikasi umum) ATAU target_nip (untuk tag)
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sa.*, e.itemcode, e.speccode, e.imagename 
       FROM spec_alerts sa
       LEFT JOIN espec e ON sa.spec_id = e.no
       WHERE (sa.target_role = ? OR sa.target_nip = ?) AND sa.is_read = 0
       ORDER BY sa.created_at DESC`,
      [req.user.role, req.user.nip]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark alert as read
router.put('/alerts/:id/read', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE spec_alerts SET is_read=1 WHERE id=?', [req.params.id]);
    res.json({ message: 'Alert marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create alert (internal use)
router.post('/alerts', authMiddleware, async (req, res) => {
  const { spec_id, type, message, target_role, expires_hours, target_nip } = req.body;
  try {
    const expires = expires_hours ? new Date(Date.now() + expires_hours * 3600000) : null;
    await db.query(
      'INSERT INTO spec_alerts (spec_id, type, message, sender_role, target_role, target_nip, expires_at) VALUES (?,?,?,?,?,?,?)',
      [spec_id, type, message, req.user.role, target_role, target_nip || null, expires]
    );
    res.json({ message: 'Alert created' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;