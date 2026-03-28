const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Login
router.post('/login', async (req, res) => {
  const { nip, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM masterlogin WHERE nip = ?', [nip]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    let valid = false;
    if (user.password.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password);
    } else {
      valid = password === user.password;
    }
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    let role = 'viewer';
    const dept = (user.dept || '').toLowerCase();
    if (dept.includes('admin')) role = 'admin';
    else if (dept.includes('tech')) role = 'tech';
    else if (dept.includes('ppc')) role = 'ppc';

    const token = jwt.sign(
      { nip: user.nip, name: user.name, role, dept: user.dept, recid: user.recid },
      process.env.JWT_SECRET || 'espec_secret',
      { expiresIn: '8h' }
    );

    res.json({ token, user: { nip: user.nip, name: user.name, role, dept: user.dept } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users (for tagging in chat)
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT nip, name, dept FROM masterlogin');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;