const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const db = require('./db/database');
const usersRouter = require('./routes/users');
const rosterRouter = require('./routes/roster');
const issuesRouter = require('./routes/issues');

const app = express();
const PORT = process.env.PORT || 4010;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', usersRouter);
app.use('/api/roster', rosterRouter);
app.use('/api/issues', issuesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
