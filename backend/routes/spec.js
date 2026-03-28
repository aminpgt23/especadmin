const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// GET all specs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT no, itemcode, giticode, imagename, speccode, typespec, active,
       createdby, datecreated, coretby, datecoret, lastupdate,
       schreleasedate, shiftrelease, memoname, process, mesintype, mcn, mesinside
       FROM espec ORDER BY no DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single spec with images
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM espec WHERE no = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Spec not found' });
    const spec = rows[0];
    if (spec.pic) spec.pic = spec.pic.toString('base64');
    if (spec.memo) spec.memo = spec.memo.toString('base64');
    res.json(spec);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET spec pic
router.get('/:id/pic', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT pic FROM espec WHERE no = ?', [req.params.id]);
    if (!rows.length || !rows[0].pic) return res.status(404).json({ message: 'No image' });
    res.set('Content-Type', 'image/jpeg');
    res.send(rows[0].pic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET spec memo
router.get('/:id/memo', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT memo, memoname FROM espec WHERE no = ?', [req.params.id]);
    if (!rows.length || !rows[0].memo) return res.status(404).json({ message: 'No memo' });
    const ext = (rows[0].memoname || '').split('.').pop().toLowerCase();
    const mimes = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
    res.set('Content-Type', mimes[ext] || 'application/octet-stream');
    res.send(rows[0].memo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE spec (TECH, ADMIN)
router.post('/', authMiddleware, roleMiddleware('tech', 'admin'),
  upload.fields([{ name: 'pic' }, { name: 'memo' }]), async (req, res) => {
    const { itemcode, giticode, imagename, speccode, typespec, process, mesintype, mcn, mesinside, memoname, schreleasedate, shiftrelease } = req.body;
    const now = new Date().toISOString().slice(0, 10);
    try {
      const pic = req.files?.pic?.[0]?.buffer || null;
      const memo = req.files?.memo?.[0]?.buffer || null;
      const mname = memoname || req.files?.memo?.[0]?.originalname || null;

      const [result] = await db.query(
        `INSERT INTO espec (itemcode, giticode, imagename, speccode, typespec, active, pic, createdby, datecreated, lastupdate, schreleasedate, shiftrelease, memo, memoname, process, mesintype, mcn, mesinside)
         VALUES (?,?,?,?,?,0,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [itemcode, giticode, imagename, speccode, typespec, pic, req.user.name, now, now, schreleasedate, shiftrelease, memo, mname, process, mesintype, mcn, mesinside]
      );
      res.json({ id: result.insertId, message: 'Spec created' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// UPDATE spec (TECH, ADMIN)
router.put('/:id', authMiddleware, roleMiddleware('tech', 'admin'),
  upload.fields([{ name: 'pic' }, { name: 'memo' }]), async (req, res) => {
    const { itemcode, giticode, imagename, speccode, typespec, process, mesintype, mcn, mesinside, memoname, schreleasedate, shiftrelease } = req.body;
    const now = new Date().toISOString().slice(0, 10);
    try {
      const pic = req.files?.pic?.[0]?.buffer;
      const memo = req.files?.memo?.[0]?.buffer;
      const mname = memoname || req.files?.memo?.[0]?.originalname;

      let query = `UPDATE espec SET itemcode=?, giticode=?, imagename=?, speccode=?, typespec=?, lastupdate=?, schreleasedate=?, shiftrelease=?, process=?, mesintype=?, mcn=?, mesinside=?`;
      let params = [itemcode, giticode, imagename, speccode, typespec, now, schreleasedate, shiftrelease, process, mesintype, mcn, mesinside];

      if (pic) { query += ', pic=?'; params.push(pic); }
      if (memo) { query += ', memo=?, memoname=?'; params.push(memo, mname); }

      query += ' WHERE no=?';
      params.push(req.params.id);

      await db.query(query, params);
      res.json({ message: 'Spec updated' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// UPDATE coret (annotasi) - TECH, ADMIN
router.put('/:id/coret', authMiddleware, roleMiddleware('tech', 'admin'),
  upload.single('pic'), async (req, res) => {
    try {
      const pic = req.file?.buffer;
      if (!pic) return res.status(400).json({ message: 'Tidak ada gambar yang dikirim' });
      const now = new Date();
      await db.query(
        'UPDATE espec SET pic=?, coretby=?, datecoret=? WHERE no=?',
        [pic, req.user.name, now, req.params.id]
      );
      res.json({ message: 'Anotasi tersimpan' });
    } catch (err) {
      console.error('Error saving annotation:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

// RELEASE spec (PPC, ADMIN)
router.put('/:id/release', authMiddleware, roleMiddleware('ppc', 'admin'), async (req, res) => {
  try {
    await db.query('UPDATE espec SET active=1, lastupdate=? WHERE no=?', [new Date().toISOString().slice(0, 10), req.params.id]);
    res.json({ message: 'Spec released' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UNRELEASE spec (PPC, ADMIN)
router.put('/:id/unrelease', authMiddleware, roleMiddleware('ppc', 'admin'), async (req, res) => {
  try {
    await db.query('UPDATE espec SET active=0, lastupdate=? WHERE no=?', [new Date().toISOString().slice(0, 10), req.params.id]);
    res.json({ message: 'Spec unreleased' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE spec -> move to history (TECH, ADMIN)
router.delete('/:id', authMiddleware, roleMiddleware('tech', 'admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM espec WHERE no=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const s = rows[0];
    const now = new Date().toISOString().slice(0, 10);

    await db.query(
      `INSERT INTO historyespec (itemcode, giticode, imagename, speccode, typespec, active, pic, createdby, datecreated, coretby, datecoret, lastupdate, schreleasedate, shiftrelease, memo, memoname, process, mesintype, mesinside, datedeleted)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [s.itemcode, s.giticode, s.imagename, s.speccode, s.typespec, s.active, s.pic, s.createdby, s.datecreated, s.coretby, s.datecoret, s.lastupdate, s.schreleasedate, s.shiftrelease, s.memo, s.memoname, s.process, s.mesintype, s.mesinside, now]
    );
    await db.query('DELETE FROM espec WHERE no=?', [req.params.id]);
    res.json({ message: 'Spec deleted and moved to history' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dashboard stats (duplikat berdasarkan itemcode, giticode, mesintype, mesinside)
router.get('/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM espec');
    const [[{ active }]] = await db.query('SELECT COUNT(*) as active FROM espec WHERE active=1');
    const [[{ inactive }]] = await db.query('SELECT COUNT(*) as inactive FROM espec WHERE active=0');
    const [duplicates] = await db.query(
      `SELECT itemcode, giticode, mesintype, mesinside, COUNT(*) as cnt 
       FROM espec 
       WHERE active=1 
       GROUP BY itemcode, giticode, mesintype, mesinside 
       HAVING cnt > 1`
    );
    const [recentCoret] = await db.query(
      `SELECT no, itemcode, speccode, coretby, datecoret FROM espec WHERE coretby IS NOT NULL ORDER BY datecoret DESC LIMIT 10`
    );
    const [byType] = await db.query(
      `SELECT typespec, COUNT(*) as cnt FROM espec GROUP BY typespec`
    );
    const [byProcess] = await db.query(
      `SELECT process, COUNT(*) as cnt FROM espec GROUP BY process`
    );
    res.json({ total, active, inactive, duplicates, recentCoret, byType, byProcess });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Notifications - coret items
router.get('/notifications/coret', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT no, itemcode, speccode, imagename, coretby, datecoret FROM espec
       WHERE coretby IS NOT NULL ORDER BY datecoret DESC LIMIT 20`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;