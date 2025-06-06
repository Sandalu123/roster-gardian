#!/bin/bash
# Definitive fix for the empty db directory issue

echo "🔧 Fixing empty db directory issue..."

# Stop containers
docker-compose down

# Show what we have locally before build
echo "📁 Local backend/db directory contents:"
ls -la backend/db/

if [ ! -f "backend/db/database.js" ]; then
    echo "❌ database.js missing locally! This is the problem."
    echo "📝 Creating database.js file..."
    
    # Ensure directory exists
    mkdir -p backend/db
    
    # Create the database.js file
    cat > backend/db/database.js << 'EOF'
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(__dirname, 'roster_guardian.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

db.serialize(() => {
  console.log('🔄 Setting up database schema...');

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
  )`, (err) => {
    if (err) console.error('Error creating users table:', err);
    else console.log('✅ Users table ready');
  });

  // Roster table
  db.run(`CREATE TABLE IF NOT EXISTS roster (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  )`, (err) => {
    if (err) console.error('Error creating roster table:', err);
    else console.log('✅ Roster table ready');
  });

  // Issue statuses table
  db.run(`CREATE TABLE IF NOT EXISTS issue_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating issue_statuses table:', err);
    } else {
      console.log('✅ Issue statuses table ready');
      
      // Insert default statuses
      db.run(`INSERT OR IGNORE INTO issue_statuses (name, color, sort_order) VALUES 
        ('open', '#EF4444', 1),
        ('investigation', '#F59E0B', 2),
        ('resolved', '#10B981', 3),
        ('closed', '#6B7280', 4)`, (err) => {
        if (err) console.error('Error inserting default statuses:', err);
        else console.log('✅ Default statuses inserted');
      });
    }
  });

  // Issues table
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
  )`, (err) => {
    if (err) console.error('Error creating issues table:', err);
    else console.log('✅ Issues table ready');
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
  )`, (err) => {
    if (err) console.error('Error creating issue_attachments table:', err);
    else console.log('✅ Issue attachments table ready');
  });

  // Comments table
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
  )`, (err) => {
    if (err) console.error('Error creating comments table:', err);
    else console.log('✅ Comments table ready');
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
  )`, (err) => {
    if (err) console.error('Error creating comment_attachments table:', err);
    else console.log('✅ Comment attachments table ready');
  });

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
  )`, (err) => {
    if (err) console.error('Error creating reactions table:', err);
    else console.log('✅ Reactions table ready');
  });

  console.log('🎉 Database setup completed successfully');
});

module.exports = db;
EOF

    echo "✅ Created database.js file"
fi

echo "📁 Local backend/db directory contents after fix:"
ls -la backend/db/

# Clean Docker cache
echo "🧹 Cleaning Docker cache..."
docker system prune -f

# Build with no cache
echo "🔨 Building fresh container..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for startup
sleep 10

# Test the container
echo "🧪 Testing container db directory:"
docker-compose exec roster-guardian sh -c "ls -la /app/backend/db/"

echo "🧪 Testing module loading:"
docker-compose exec roster-guardian sh -c "cd /app/backend && node -e \"try { require('./db/database'); console.log('✅ Module loads successfully'); } catch(e) { console.log('❌ Module load failed:', e.message); }\""

echo "📝 Container logs:"
docker-compose logs --tail=15 roster-guardian

echo ""
echo "✅ Fix completed!"
echo "Test the app at: http://localhost:3000"