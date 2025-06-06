const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const db = require('../db/database');
const { authenticate, adminOnly } = require('../middleware/auth');

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

// Get all available statuses
router.get('/statuses', authenticate, (req, res) => {
  db.all(
    'SELECT * FROM issue_statuses WHERE is_active = 1 ORDER BY sort_order',
    (err, statuses) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(statuses);
    }
  );
});

// Admin: Manage statuses
router.post('/statuses', authenticate, adminOnly, (req, res) => {
  const { name, color, sort_order } = req.body;
  
  db.run(
    'INSERT INTO issue_statuses (name, color, sort_order) VALUES (?, ?, ?)',
    [name, color || '#6B7280', sort_order || 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, color, sort_order });
    }
  );
});

router.put('/statuses/:id', authenticate, adminOnly, (req, res) => {
  const { id } = req.params;
  const { name, color, sort_order, is_active } = req.body;
  
  db.run(
    'UPDATE issue_statuses SET name = ?, color = ?, sort_order = ?, is_active = ? WHERE id = ?',
    [name, color, sort_order, is_active ? 1 : 0, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Status not found' });
      res.json({ message: 'Status updated successfully' });
    }
  );
});

router.delete('/statuses/:id', authenticate, adminOnly, (req, res) => {
  const { id } = req.params;
  
  // Check if any issues use this status
  db.get('SELECT COUNT(*) as count FROM issues WHERE status_id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete status that is in use by issues' });
    }
    
    db.run('DELETE FROM issue_statuses WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Status not found' });
      res.json({ message: 'Status deleted successfully' });
    });
  });
});

router.post('/', authenticate, issueUpload.array('attachments', 10), (req, res) => {
  const { title, description, date } = req.body;
  const createdBy = req.user.id;

  console.log('Creating issue:', { title, description, date, createdBy });
  console.log('Files received:', req.files ? req.files.length : 0);

  db.run(
    'INSERT INTO issues (title, description, date, created_by, status_id) VALUES (?, ?, ?, ?, 1)',
    [title, description, date, createdBy],
    function(err) {
      if (err) {
        console.error('Error creating issue:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const issueId = this.lastID;
      console.log('Issue created with ID:', issueId);
      
      if (req.files && req.files.length > 0) {
        console.log('Processing attachments for issue:', issueId);
        const attachmentPromises = req.files.map((file, index) => {
          console.log(`Processing attachment ${index}:`, file.filename, file.mimetype);
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO issue_attachments (issue_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)',
              [issueId, `/uploads/issues/${file.filename}`, file.originalname, file.mimetype],
              (err) => {
                if (err) {
                  console.error('Error saving attachment:', err);
                  reject(err);
                } else {
                  console.log('Attachment saved:', file.originalname);
                  resolve();
                }
              }
            );
          });
        });

        Promise.all(attachmentPromises)
          .then(() => {
            console.log('All attachments saved for issue:', issueId);
            res.json({ id: issueId, title, description, date });
          })
          .catch(err => {
            console.error('Error saving attachments:', err);
            res.status(500).json({ error: err.message });
          });
      } else {
        console.log('No attachments for issue:', issueId);
        res.json({ id: issueId, title, description, date });
      }
    }
  );
});

router.get('/date/:date', (req, res) => {
  const { date } = req.params;

  db.all(
    `SELECT 
      i.id, i.title, i.description, i.date, i.created_at,
      u.id as created_by_id, u.name as created_by_name, u.email as created_by_email,
      s.name as status_name, s.color as status_color,
      (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comment_count
    FROM issues i
    JOIN users u ON i.created_by = u.id
    JOIN issue_statuses s ON i.status_id = s.id
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
      i.id, i.title, i.description, i.date, i.created_at,
      u.id as created_by_id, u.name as created_by_name, u.email as created_by_email,
      s.name as status_name, s.color as status_color,
      (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comment_count
    FROM issues i
    JOIN users u ON i.created_by = u.id
    JOIN issue_statuses s ON i.status_id = s.id
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
      u.email as created_by_email, u.profile_image as created_by_image,
      s.id as status_id, s.name as status_name, s.color as status_color
    FROM issues i
    JOIN users u ON i.created_by = u.id
    JOIN issue_statuses s ON i.status_id = s.id
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

// Delete issue (admin only)
router.delete('/:id', authenticate, adminOnly, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM issues WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Issue not found' });
    res.json({ message: 'Issue deleted successfully' });
  });
});

router.post('/:id/comments', authenticate, commentUpload.array('attachments', 10), (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  console.log('Adding comment to issue:', id);
  console.log('Comment content:', content);
  console.log('Comment files received:', req.files ? req.files.length : 0);

  db.run(
    'INSERT INTO comments (issue_id, user_id, content, comment_type) VALUES (?, ?, ?, ?)',
    [id, userId, content, 'comment'],
    function(err) {
      if (err) {
        console.error('Error creating comment:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const commentId = this.lastID;
      console.log('Comment created with ID:', commentId);
      
      if (req.files && req.files.length > 0) {
        console.log('Processing comment attachments:', commentId);
        const attachmentPromises = req.files.map((file, index) => {
          console.log(`Processing comment attachment ${index}:`, file.filename, file.mimetype);
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO comment_attachments (comment_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)',
              [commentId, `/uploads/comments/${file.filename}`, file.originalname, file.mimetype],
              (err) => {
                if (err) {
                  console.error('Error saving comment attachment:', err);
                  reject(err);
                } else {
                  console.log('Comment attachment saved:', file.originalname);
                  resolve();
                }
              }
            );
          });
        });

        Promise.all(attachmentPromises)
          .then(() => {
            console.log('All comment attachments saved for comment:', commentId);
            res.json({ id: commentId, content });
          })
          .catch(err => {
            console.error('Error saving comment attachments:', err);
            res.status(500).json({ error: err.message });
          });
      } else {
        console.log('No attachments for comment:', commentId);
        res.json({ id: commentId, content });
      }
    }
  );
});

router.get('/:id/comments', authenticate, (req, res) => {
  const { id } = req.params;

  db.all(
    `SELECT 
      c.id, c.content, c.created_at, c.comment_type, c.old_status_id, c.new_status_id,
      u.id as user_id, u.name as user_name, u.email as user_email, u.profile_image as user_image,
      old_s.name as old_status_name, old_s.color as old_status_color,
      new_s.name as new_status_name, new_s.color as new_status_color
    FROM comments c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN issue_statuses old_s ON c.old_status_id = old_s.id
    LEFT JOIN issue_statuses new_s ON c.new_status_id = new_s.id
    WHERE c.issue_id = ?
    ORDER BY c.created_at DESC`,
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

// Update issue status with logging
router.put('/:id/status', authenticate, (req, res) => {
  const { id } = req.params;
  const { status_id } = req.body;
  const userId = req.user.id;

  console.log(`Updating issue ${id} to status ${status_id} by user ${userId}`);

  // Validate status_id
  if (!status_id) {
    return res.status(400).json({ error: 'status_id is required' });
  }

  // Get current status first
  db.get('SELECT status_id FROM issues WHERE id = ?', [id], (err, currentIssue) => {
    if (err) {
      console.error('Error getting current issue:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!currentIssue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const oldStatusId = currentIssue.status_id;
    
    // Don't update if status is the same
    if (oldStatusId === status_id) {
      return res.json({ message: 'Status unchanged' });
    }
    
    // Update issue status
    db.run(
      'UPDATE issues SET status_id = ? WHERE id = ?',
      [status_id, id],
      function(err) {
        if (err) {
          console.error('Error updating issue status:', err);
          return res.status(500).json({ error: err.message });
        }
        
        console.log(`Issue ${id} status updated from ${oldStatusId} to ${status_id}`);
        
        // Log status change as a comment
        db.get(
          'SELECT old_s.name as old_name, new_s.name as new_name FROM issue_statuses old_s, issue_statuses new_s WHERE old_s.id = ? AND new_s.id = ?',
          [oldStatusId, status_id],
          (err, statusNames) => {
            if (err) {
              console.error('Error getting status names:', err);
              return res.status(500).json({ error: err.message });
            }
            
            if (!statusNames) {
              console.error('Status names not found for IDs:', oldStatusId, status_id);
              return res.status(500).json({ error: 'Invalid status IDs' });
            }
            
            const logContent = `Status changed from "${statusNames.old_name}" to "${statusNames.new_name}"`;
            
            db.run(
              'INSERT INTO comments (issue_id, user_id, content, comment_type, old_status_id, new_status_id) VALUES (?, ?, ?, ?, ?, ?)',
              [id, userId, logContent, 'status_change', oldStatusId, status_id],
              (err) => {
                if (err) {
                  console.error('Error logging status change:', err);
                  // Still return success even if logging fails
                }
                console.log(`Status change logged for issue ${id}`);
                res.json({ message: 'Issue status updated successfully' });
              }
            );
          }
        );
      }
    );
  });
});

module.exports = router;