const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// GET all history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT no, itemcode, giticode, imagename, speccode, typespec, active,
       createdby, datecreated, coretby, datecoret, lastupdate,
       schreleasedate, shiftrelease, memoname, process, mesintype, mesinside, datedeleted
       FROM historyespec ORDER BY no DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single history
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM historyespec WHERE no=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const s = rows[0];
    if (s.pic) s.pic = s.pic.toString('base64');
    if (s.memo) s.memo = s.memo.toString('base64');
    res.json(s);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET history pic
router.get('/:id/pic', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT pic FROM historyespec WHERE no=?', [req.params.id]);
    if (!rows.length || !rows[0].pic) return res.status(404).json({ message: 'No image' });
    res.set('Content-Type', 'image/jpeg');
    res.send(rows[0].pic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// RESTORE from history (TECH, ADMIN)
router.post('/:id/restore', authMiddleware, roleMiddleware('tech', 'admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM historyespec WHERE no=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const s = rows[0];
    const now = new Date().toISOString().slice(0, 10);

    await db.query(
      `INSERT INTO espec (itemcode, giticode, imagename, speccode, typespec, active, pic, createdby, datecreated, coretby, datecoret, lastupdate, schreleasedate, shiftrelease, memo, memoname, process, mesintype, mesinside)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [s.itemcode, s.giticode, s.imagename, s.speccode, s.typespec, 0, s.pic, s.createdby, s.datecreated, s.coretby, s.datecoret, now, s.schreleasedate, s.shiftrelease, s.memo, s.memoname, s.process, s.mesintype, s.mesinside]
    );
    await db.query('DELETE FROM historyespec WHERE no=?', [req.params.id]);
    res.json({ message: 'Spec restored' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
