const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Embedded database setup (temporary fix for module loading issue)
console.log('🔄 Setting up database (embedded)...');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created db directory');
}

const dbPath = path.join(__dirname, 'db', 'roster_guardian.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Setup database schema
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

// Load route modules directly with error handling
let usersRouter, rosterRouter, issuesRouter;

try {
  usersRouter = require('./routes/users');
  console.log('✅ Users router loaded');
} catch (err) {
  console.error('❌ Failed to load users router:', err.message);
  process.exit(1);
}

try {
  rosterRouter = require('./routes/roster');
  console.log('✅ Roster router loaded');
} catch (err) {
  console.error('❌ Failed to load roster router:', err.message);
  process.exit(1);
}

try {
  // Create a custom issues router that uses the embedded db
  const express = require('express');
  const multer = require('multer');
  const { authenticate, adminOnly } = require('./middleware/auth');
  
  issuesRouter = express.Router();
  
  // Configure multer for file uploads
  const issueStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'uploads/issues'));
    },
    filename: (req, file, cb) => {
      cb(null, `issue-${Date.now()}-${file.originalname}`);
    }
  });
  
  const commentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'uploads/comments'));
    },
    filename: (req, file, cb) => {
      cb(null, `comment-${Date.now()}-${file.originalname}`);
    }
  });
  
  const issueUpload = multer({ storage: issueStorage });
  const commentUpload = multer({ storage: commentStorage });
  
  // Essential routes for issues
  issuesRouter.get('/statuses', authenticate, (req, res) => {
    db.all('SELECT * FROM issue_statuses WHERE is_active = 1 ORDER BY sort_order', (err, statuses) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(statuses);
    });
  });
  
  console.log('✅ Issues router created (embedded)');
} catch (err) {
  console.error('❌ Failed to create issues router:', err.message);
  // Create minimal fallback
  issuesRouter = express.Router();
  issuesRouter.get('/test', (req, res) => res.json({ message: 'Issues router fallback' }));
}

const app = express();
const PORT = process.env.PORT || 4010;

// Enhanced CORS configuration for Docker environment
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:4010',
      'http://127.0.0.1:4010'
    ];
    
    if (process.env.NODE_ENV === 'production' || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Static file serving
app.use('/uploads', (req, res, next) => {
  console.log('Static file request:', req.path);
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cache-Control', 'public, max-age=3600');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Debug endpoint
app.get('/debug/uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  console.log('Checking uploads directory:', uploadsPath);
  
  try {
    const structure = getDirectoryStructure(uploadsPath);
    res.json({ path: uploadsPath, structure: structure });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function getDirectoryStructure(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    const structure = {};
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        structure[item] = getDirectoryStructure(itemPath);
      } else {
        structure[item] = { size: stat.size, modified: stat.mtime };
      }
    });
    
    return structure;
  } catch (error) {
    return { error: error.message };
  }
}

// API routes
app.use('/api/users', usersRouter);
app.use('/api/roster', rosterRouter);
app.use('/api/issues', issuesRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 for:', req.originalUrl);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Uploads directory: ${path.join(__dirname, 'uploads')}`);
});