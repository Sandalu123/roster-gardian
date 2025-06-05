const bcrypt = require('bcryptjs');
const db = require('./db/database');

async function seed() {
  console.log('Creating admin user...');
  
  const email = 'admin@rostergardian.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.run(
    `INSERT OR IGNORE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)`,
    [email, hashedPassword, 'Admin User', 'admin'],
    function(err) {
      if (err) {
        console.error('Error creating admin user:', err);
      } else if (this.changes > 0) {
        console.log('Admin user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
      } else {
        console.log('Admin user already exists');
      }
      db.close();
    }
  );
}

seed();
