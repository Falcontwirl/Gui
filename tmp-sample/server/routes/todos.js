const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  getDb().all('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
    res.json(rows || []);
  });
});

router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  getDb().run('INSERT INTO todos (user_id, title) VALUES (?, ?)', [userId, title], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to create todo' });
    res.json({ id: this.lastID, title, completed: false });
  });
});

router.patch('/:id', (req, res) => {
  const { completed } = req.body;
  getDb().run('UPDATE todos SET completed = ? WHERE id = ?', [completed ? 1 : 0, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to update' });
    res.json({ success: true });
  });
});

router.delete('/:id', (req, res) => {
  getDb().run('DELETE FROM todos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete' });
    res.json({ success: true });
  });
});

module.exports = router;
