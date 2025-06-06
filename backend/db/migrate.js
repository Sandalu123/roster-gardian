const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'roster_guardian.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting database migration...');

db.serialize(() => {
  // First, ensure issue_statuses table exists
  db.run(`CREATE TABLE IF NOT EXISTS issue_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('❌ Error creating issue_statuses table:', err);
      return;
    }
    console.log('✅ issue_statuses table ready');

    // Insert default statuses
    db.run(`INSERT OR IGNORE INTO issue_statuses (name, color, sort_order) VALUES 
      ('open', '#EF4444', 1),
      ('investigation', '#F59E0B', 2),
      ('resolved', '#10B981', 3),
      ('closed', '#6B7280', 4)`, (err) => {
      if (err) {
        console.error('❌ Error inserting default statuses:', err);
        return;
      }
      console.log('✅ Default statuses inserted');

      // Check current issues table structure
      db.all("PRAGMA table_info(issues)", (err, columns) => {
        if (err) {
          console.error('❌ Error checking issues table:', err);
          return;
        }

        const hasStatusColumn = columns.some(col => col.name === 'status');
        const hasStatusIdColumn = columns.some(col => col.name === 'status_id');

        console.log(`📊 Current issues table structure:`);
        console.log(`   - Has 'status' column: ${hasStatusColumn}`);
        console.log(`   - Has 'status_id' column: ${hasStatusIdColumn}`);

        if (hasStatusColumn && !hasStatusIdColumn) {
          console.log('🔄 Migrating from status to status_id...');
          
          // Add status_id column
          db.run(`ALTER TABLE issues ADD COLUMN status_id INTEGER DEFAULT 1`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('❌ Error adding status_id column:', err);
              return;
            }
            console.log('✅ Added status_id column');

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
            )`, (err) => {
              if (err) {
                console.error('❌ Error migrating status data:', err);
                return;
              }
              console.log('✅ Migrated status data to status_id');

              // Create new table without old status column
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
                  console.error('❌ Error creating new issues table:', err);
                  return;
                }
                console.log('✅ Created new issues table structure');

                // Copy data
                db.run(`INSERT INTO issues_new (id, title, description, date, created_by, status_id, created_at)
                        SELECT id, title, description, date, created_by, status_id, created_at FROM issues`, (err) => {
                  if (err) {
                    console.error('❌ Error copying data:', err);
                    return;
                  }
                  console.log('✅ Copied data to new table');

                  // Replace old table
                  db.run(`DROP TABLE issues`, (err) => {
                    if (err) {
                      console.error('❌ Error dropping old table:', err);
                      return;
                    }
                    console.log('✅ Dropped old issues table');

                    db.run(`ALTER TABLE issues_new RENAME TO issues`, (err) => {
                      if (err) {
                        console.error('❌ Error renaming table:', err);
                        return;
                      }
                      console.log('🎉 Migration completed successfully!');
                      db.close();
                    });
                  });
                });
              });
            });
          });
        } else if (!hasStatusColumn && !hasStatusIdColumn) {
          // Add status_id to existing table
          db.run(`ALTER TABLE issues ADD COLUMN status_id INTEGER DEFAULT 1`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error('❌ Error adding status_id column:', err);
            } else {
              console.log('✅ Added status_id column to existing table');
            }
            console.log('🎉 Migration completed successfully!');
            db.close();
          });
        } else {
          console.log('✅ Issues table already properly configured');
          console.log('🎉 No migration needed!');
          db.close();
        }
      });
    });
  });
});

// Handle errors
db.on('error', (err) => {
  console.error('❌ Database error:', err);
});

process.on('exit', () => {
  console.log('👋 Migration script finished');
});