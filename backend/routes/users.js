const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const db = require('../db/database');
const { authenticate, adminOnly, generateToken } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/profiles'));
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.post('/register', authenticate, adminOnly, upload.single('profileImage'), async (req, res) => {
  const { email, password, name, role, contactNumber, bio } = req.body;
  const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : null;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      `INSERT INTO users (email, password, name, role, profile_image, contact_number, bio) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, name, role, profileImage, contactNumber, bio],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, email, name, role });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileImage: user.profile_image
    });
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticate, (req, res) => {
  db.get('SELECT id, email, name, role, profile_image, contact_number, bio FROM users WHERE id = ?', 
    [req.user.id], 
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    }
  );
});

router.get('/', authenticate, (req, res) => {
  db.all('SELECT id, email, name, role, profile_image, contact_number, bio FROM users', 
    (err, users) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(users);
    }
  );
});

router.put('/:id', authenticate, adminOnly, upload.single('profileImage'), async (req, res) => {
  const { id } = req.params;
  const { email, name, role, contactNumber, bio } = req.body;
  let updateFields = [];
  let values = [];

  if (email) {
    updateFields.push('email = ?');
    values.push(email);
  }
  if (name) {
    updateFields.push('name = ?');
    values.push(name);
  }
  if (role) {
    updateFields.push('role = ?');
    values.push(role);
  }
  if (contactNumber !== undefined) {
    updateFields.push('contact_number = ?');
    values.push(contactNumber);
  }
  if (bio !== undefined) {
    updateFields.push('bio = ?');
    values.push(bio);
  }
  if (req.file) {
    updateFields.push('profile_image = ?');
    values.push(`/uploads/profiles/${req.file.filename}`);
  }

  values.push(id);

  db.run(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'User updated successfully' });
    }
  );
});

router.delete('/:id', authenticate, adminOnly, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;
