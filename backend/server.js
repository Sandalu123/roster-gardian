const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./db/database');
const usersRouter = require('./routes/users');
const rosterRouter = require('./routes/roster');
const issuesRouter = require('./routes/issues');

const app = express();
const PORT = process.env.PORT || 4010;

// Enhanced CORS configuration for Docker environment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost in development and any origin in Docker
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:4010',
      'http://127.0.0.1:4010'
    ];
    
    // In Docker environment, allow any origin that matches the container network
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

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Enhanced static file serving with debugging
app.use('/uploads', (req, res, next) => {
  console.log('Static file request:', req.path);
  const filePath = path.join(__dirname, 'uploads', req.path);
  console.log('Full file path:', filePath);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log('File not found:', filePath);
    } else {
      console.log('File exists:', filePath);
    }
  });
  
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cache-Control', 'public, max-age=3600');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['html', 'htm', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx'],
  index: false,
  redirect: false,
  setHeaders: function (res, path, stat) {
    console.log('Serving file:', path);
    res.set('x-timestamp', Date.now());
  }
}));

// Health check endpoint for Docker
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Debug endpoint to check uploads directory
app.get('/debug/uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  console.log('Checking uploads directory:', uploadsPath);
  
  try {
    const structure = getDirectoryStructure(uploadsPath);
    res.json({
      path: uploadsPath,
      structure: structure
    });
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
        structure[item] = {
          size: stat.size,
          modified: stat.mtime
        };
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