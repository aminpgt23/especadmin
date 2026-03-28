const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// GET master MCN berdasarkan process (opsional)
router.get('/', authMiddleware, async (req, res) => {
  const { process } = req.query;
  try {
    let query = 'SELECT * FROM mastermcn';
    const params = [];
    if (process) {
      query += ' WHERE process = ?';
      params.push(process);
    }
    query += ' ORDER BY recid';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;