# Roster Guardian - Quick Start Guide

## Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation Steps

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create the initial admin user
npm run seed

# Start the backend server
npm start
```

The backend server will start on http://localhost:4010

### 2. Frontend Setup
Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The application will automatically open in your browser at http://localhost:3000

## Default Admin Credentials
- **Email**: admin@rostergardian.com
- **Password**: admin123

## First Steps
1. Login with the admin credentials
2. Click the settings icon in the top-right to open the Admin Panel
3. Create new users with different roles (Developer, QA, Support)
4. Assign users to roster dates
5. Start creating and tracking issues!

## Features Overview
- **Public View**: Anyone can see the roster schedule
- **User Features**: Logged-in users can create issues and add comments
- **Admin Features**: Admins can manage users and roster assignments
- **Issue Tracking**: Full issue lifecycle with comments and reactions
- **File Attachments**: Support for images and documents

## Troubleshooting
- If you see database errors, make sure the backend is running
- If login fails, check that cookies are enabled in your browser
- For CORS issues, ensure both servers are running on the correct ports

## Next Steps
- Create additional users with different roles
- Set up the roster for your team
- Start tracking issues and collaborating!
