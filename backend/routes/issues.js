const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const issueStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/issues'));
  },
  filename: (req, file, cb) => {
    cb(null, `issue-${Date.now()}-${file.originalname}`);
  }
});

const commentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/comments'));
  },
  filename: (req, file, cb) => {
    cb(null, `comment-${Date.now()}-${file.originalname}`);
  }
});

const issueUpload = multer({ storage: issueStorage });
const commentUpload = multer({ storage: commentStorage });

router.post('/', authenticate, issueUpload.array('attachments', 10), (req, res) => {
  const { title, description, date } = req.body;
  const createdBy = req.user.id;

  db.run(
    'INSERT INTO issues (title, description, date, created_by) VALUES (?, ?, ?, ?)',
    [title, description, date, createdBy],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const issueId = this.lastID;
      
      if (req.files && req.files.length > 0) {
        const attachmentPromises = req.files.map(file => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO issue_attachments (issue_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)',
              [issueId, `/uploads/issues/${file.filename}`, file.originalname, file.mimetype],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        Promise.all(attachmentPromises)
          .then(() => res.json({ id: issueId, title, description, date }))
          .catch(err => res.status(500).json({ error: err.message }));
      } else {
        res.json({ id: issueId, title, description, date });
      }
    }
  );
});

router.get('/date/:date', (req, res) => {
  const { date } = req.params;

  db.all(
    `SELECT 
      i.id, i.title, i.description, i.date, i.status, i.created_at,
      u.id as created_by_id, u.name as created_by_name, u.email as created_by_email,
      (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comment_count
    FROM issues i
    JOIN users u ON i.created_by = u.id
    WHERE i.date = ?
    ORDER BY i.created_at DESC`,
    [date],
    (err, issues) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(issues);
    }
  );
});

router.get('/range', (req, res) => {
  const { startDate, endDate } = req.query;

  db.all(
    `SELECT 
      i.id, i.title, i.description, i.date, i.status, i.created_at,
      u.id as created_by_id, u.name as created_by_name, u.email as created_by_email,
      (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comment_count
    FROM issues i
    JOIN users u ON i.created_by = u.id
    WHERE i.date BETWEEN ? AND ?
    ORDER BY i.date, i.created_at DESC`,
    [startDate, endDate],
    (err, issues) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const issuesByDate = issues.reduce((acc, issue) => {
        if (!acc[issue.date]) acc[issue.date] = [];
        acc[issue.date].push(issue);
        return acc;
      }, {});
      
      res.json(issuesByDate);
    }
  );
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT 
      i.*, 
      u.id as created_by_id, u.name as created_by_name, 
      u.email as created_by_email, u.profile_image as created_by_image
    FROM issues i
    JOIN users u ON i.created_by = u.id
    WHERE i.id = ?`,
    [id],
    (err, issue) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!issue) return res.status(404).json({ error: 'Issue not found' });

      db.all(
        'SELECT * FROM issue_attachments WHERE issue_id = ?',
        [id],
        (err, attachments) => {
          if (err) return res.status(500).json({ error: err.message });
          issue.attachments = attachments;
          res.json(issue);
        }
      );
    }
  );
});

router.post('/:id/comments', authenticate, commentUpload.array('attachments', 10), (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  db.run(
    'INSERT INTO comments (issue_id, user_id, content) VALUES (?, ?, ?)',
    [id, userId, content],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const commentId = this.lastID;
      
      if (req.files && req.files.length > 0) {
        const attachmentPromises = req.files.map(file => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO comment_attachments (comment_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)',
              [commentId, `/uploads/comments/${file.filename}`, file.originalname, file.mimetype],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        Promise.all(attachmentPromises)
          .then(() => res.json({ id: commentId, content }))
          .catch(err => res.status(500).json({ error: err.message }));
      } else {
        res.json({ id: commentId, content });
      }
    }
  );
});

router.get('/:id/comments', authenticate, (req, res) => {
  const { id } = req.params;

  db.all(
    `SELECT 
      c.id, c.content, c.created_at,
      u.id as user_id, u.name as user_name, u.email as user_email, u.profile_image as user_image
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.issue_id = ?
    ORDER BY c.created_at ASC`,
    [id],
    (err, comments) => {
      if (err) return res.status(500).json({ error: err.message });

      const commentIds = comments.map(c => c.id);
      if (commentIds.length === 0) return res.json(comments);

      db.all(
        `SELECT * FROM comment_attachments WHERE comment_id IN (${commentIds.map(() => '?').join(',')})`,
        commentIds,
        (err, attachments) => {
          if (err) return res.status(500).json({ error: err.message });

          const attachmentsByComment = attachments.reduce((acc, att) => {
            if (!acc[att.comment_id]) acc[att.comment_id] = [];
            acc[att.comment_id].push(att);
            return acc;
          }, {});

          db.all(
            `SELECT r.*, u.name as user_name 
             FROM reactions r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.comment_id IN (${commentIds.map(() => '?').join(',')})`,
            commentIds,
            (err, reactions) => {
              if (err) return res.status(500).json({ error: err.message });

              const reactionsByComment = reactions.reduce((acc, reaction) => {
                if (!acc[reaction.comment_id]) acc[reaction.comment_id] = [];
                acc[reaction.comment_id].push(reaction);
                return acc;
              }, {});

              comments.forEach(comment => {
                comment.attachments = attachmentsByComment[comment.id] || [];
                comment.reactions = reactionsByComment[comment.id] || [];
              });

              res.json(comments);
            }
          );
        }
      );
    }
  );
});

router.post('/:id/comments/:commentId/reactions', authenticate, (req, res) => {
  const { commentId } = req.params;
  const { reactionType } = req.body;
  const userId = req.user.id;

  db.run(
    'INSERT OR REPLACE INTO reactions (comment_id, user_id, reaction_type) VALUES (?, ?, ?)',
    [commentId, userId, reactionType],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, commentId, userId, reactionType });
    }
  );
});

router.delete('/:id/comments/:commentId/reactions/:reactionType', authenticate, (req, res) => {
  const { commentId, reactionType } = req.params;
  const userId = req.user.id;

  db.run(
    'DELETE FROM reactions WHERE comment_id = ? AND user_id = ? AND reaction_type = ?',
    [commentId, userId, reactionType],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Reaction not found' });
      res.json({ message: 'Reaction removed successfully' });
    }
  );
});

router.put('/:id/status', authenticate, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run(
    'UPDATE issues SET status = ? WHERE id = ?',
    [status, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Issue not found' });
      res.json({ message: 'Issue status updated successfully' });
    }
  );
});

module.exports = router;
