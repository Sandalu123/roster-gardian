const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'roster_guardian.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('developer', 'qa', 'support', 'admin')),
    profile_image TEXT,
    contact_number TEXT,
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Roster table
  db.run(`CREATE TABLE IF NOT EXISTS roster (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  )`);

  // Issue statuses table (for configurable statuses)
  db.run(`CREATE TABLE IF NOT EXISTS issue_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert default statuses if they don't exist
  db.run(`INSERT OR IGNORE INTO issue_statuses (name, color, sort_order) VALUES 
    ('open', '#EF4444', 1),
    ('investigation', '#F59E0B', 2),
    ('resolved', '#10B981', 3),
    ('closed', '#6B7280', 4)`);

  // Check if issues table exists and what columns it has
  db.all("PRAGMA table_info(issues)", (err, columns) => {
    if (err) {
      console.error('Error checking issues table:', err);
      return;
    }

    const hasStatusColumn = columns.some(col => col.name === 'status');
    const hasStatusIdColumn = columns.some(col => col.name === 'status_id');

    if (!columns.length) {
      // Create new issues table with status_id
      db.run(`CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        date DATE NOT NULL,
        created_by INTEGER NOT NULL,
        status_id INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (status_id) REFERENCES issue_statuses(id)
      )`);
      console.log('Created new issues table with status_id');
    } else if (hasStatusColumn && !hasStatusIdColumn) {
      // Migrate from old status column to status_id
      console.log('Migrating issues table from status to status_id...');
      
      // Add status_id column
      db.run(`ALTER TABLE issues ADD COLUMN status_id INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding status_id column:', err);
          return;
        }

        // Migrate existing data
        db.run(`UPDATE issues SET status_id = (
          CASE 
            WHEN status = 'open' THEN 1
            WHEN status = 'in_progress' THEN 2  
            WHEN status = 'investigation' THEN 2
            WHEN status = 'resolved' THEN 3
            WHEN status = 'closed' THEN 4
            ELSE 1
          END
        ) WHERE status_id IS NULL OR status_id = 1`, (err) => {
          if (err) {
            console.error('Error migrating status data:', err);
            return;
          }

          // Create temporary table without status column
          db.run(`CREATE TABLE issues_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            date DATE NOT NULL,
            created_by INTEGER NOT NULL,
            status_id INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (status_id) REFERENCES issue_statuses(id)
          )`, (err) => {
            if (err) {
              console.error('Error creating new issues table:', err);
              return;
            }

            // Copy data to new table
            db.run(`INSERT INTO issues_new (id, title, description, date, created_by, status_id, created_at)
                    SELECT id, title, description, date, created_by, status_id, created_at FROM issues`, (err) => {
              if (err) {
                console.error('Error copying data to new table:', err);
                return;
              }

              // Drop old table and rename new one
              db.run(`DROP TABLE issues`, (err) => {
                if (err) {
                  console.error('Error dropping old issues table:', err);
                  return;
                }

                db.run(`ALTER TABLE issues_new RENAME TO issues`, (err) => {
                  if (err) {
                    console.error('Error renaming new issues table:', err);
                    return;
                  }
                  console.log('Successfully migrated issues table');
                });
              });
            });
          });
        });
      });
    } else if (!hasStatusColumn && !hasStatusIdColumn) {
      // Add status_id column to existing table
      db.run(`ALTER TABLE issues ADD COLUMN status_id INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding status_id column:', err);
        } else {
          console.log('Added status_id column to existing issues table');
        }
      });
    } else {
      console.log('Issues table already has status_id column');
    }
  });

  // Issue attachments table
  db.run(`CREATE TABLE IF NOT EXISTS issue_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
  )`);

  // Comments table (enhanced for status change logging)
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    comment_type TEXT DEFAULT 'comment' CHECK(comment_type IN ('comment', 'status_change')),
    old_status_id INTEGER,
    new_status_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (old_status_id) REFERENCES issue_statuses(id),
    FOREIGN KEY (new_status_id) REFERENCES issue_statuses(id)
  )`);

  // Add comment_type column if it doesn't exist
  db.run(`ALTER TABLE comments ADD COLUMN comment_type TEXT DEFAULT 'comment'`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding comment_type column:', err);
    }
  });

  // Add status tracking columns if they don't exist
  db.run(`ALTER TABLE comments ADD COLUMN old_status_id INTEGER`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding old_status_id column:', err);
    }
  });

  db.run(`ALTER TABLE comments ADD COLUMN new_status_id INTEGER`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding new_status_id column:', err);
    }
  });

  // Comment attachments table
  db.run(`CREATE TABLE IF NOT EXISTS comment_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
  )`);

  // Reactions table
  db.run(`CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reaction_type TEXT NOT NULL CHECK(reaction_type IN ('thumbs_up', 'heart', 'smile', 'celebrate', 'thinking')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(comment_id, user_id, reaction_type)
  )`);

  console.log('Database setup completed successfully');
});

module.exports = db;