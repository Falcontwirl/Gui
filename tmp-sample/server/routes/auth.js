const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const router = express.Router();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(userId) {
  return crypto.randomBytes(32).toString('hex');
}

router.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const hash = hashPassword(password);
  getDb().run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash], function(err) {
    if (err) return res.status(409).json({ error: 'Email already exists' });
    const token = generateToken(this.lastID);
    res.json({ token, userId: this.lastID });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const hash = hashPassword(password);
  getDb().get('SELECT id FROM users WHERE email = ? AND password_hash = ?', [email, hash], (err, row) => {
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(row.id);
    res.json({ token, userId: row.id });
  });
});

module.exports = router;
