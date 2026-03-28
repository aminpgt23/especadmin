const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// GET all knowledge articles (public untuk user login)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, content, category, is_system_update, version, created_by, created_at, updated_at
       FROM knowledge_base ORDER BY is_system_update DESC, created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single article
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM knowledge_base WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new article (ADMIN only)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { title, content, category, is_system_update, version } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO knowledge_base (title, content, category, is_system_update, version, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, content, category || 'General', is_system_update ? 1 : 0, version || null, req.user.name]
    );
    res.json({ id: result.insertId, message: 'Article created' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE article (ADMIN only)
router.put('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { title, content, category, is_system_update, version } = req.body;
  try {
    await db.query(
      `UPDATE knowledge_base 
       SET title=?, content=?, category=?, is_system_update=?, version=?, updated_at=NOW()
       WHERE id=?`,
      [title, content, category || 'General', is_system_update ? 1 : 0, version || null, req.params.id]
    );
    res.json({ message: 'Article updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE article (ADMIN only)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM knowledge_base WHERE id=?', [req.params.id]);
    res.json({ message: 'Article deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;