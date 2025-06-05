const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, adminOnly } = require('../middleware/auth');

router.post('/', authenticate, adminOnly, (req, res) => {
  const { userId, date } = req.body;

  db.run(
    'INSERT INTO roster (user_id, date) VALUES (?, ?)',
    [userId, date],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Roster entry already exists for this user and date' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, userId, date });
    }
  );
});

router.get('/range', (req, res) => {
  const { startDate, endDate } = req.query;

  db.all(
    `SELECT 
      r.id, r.date, r.user_id,
      u.name, u.email, u.role, u.profile_image, u.contact_number, u.bio
    FROM roster r
    JOIN users u ON r.user_id = u.id
    WHERE r.date BETWEEN ? AND ?
    ORDER BY r.date, u.name`,
    [startDate, endDate],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const rosterByDate = rows.reduce((acc, row) => {
        if (!acc[row.date]) acc[row.date] = [];
        acc[row.date].push({
          id: row.id,
          userId: row.user_id,
          name: row.name,
          email: row.email,
          role: row.role,
          profileImage: row.profile_image,
          contactNumber: row.contact_number,
          bio: row.bio
        });
        return acc;
      }, {});
      
      res.json(rosterByDate);
    }
  );
});

router.delete('/:id', authenticate, adminOnly, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM roster WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Roster entry not found' });
    res.json({ message: 'Roster entry deleted successfully' });
  });
});

router.put('/:id', authenticate, adminOnly, (req, res) => {
  const { id } = req.params;
  const { userId, date } = req.body;

  db.run(
    'UPDATE roster SET user_id = ?, date = ? WHERE id = ?',
    [userId, date, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Roster entry already exists for this user and date' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) return res.status(404).json({ error: 'Roster entry not found' });
      res.json({ message: 'Roster entry updated successfully' });
    }
  );
});

module.exports = router;
