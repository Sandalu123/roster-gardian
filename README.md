# Roster Guardian

A comprehensive support roster management application with issue tracking and team collaboration features.

## Features

- **User Management**: Admin can create users with different roles (Developer, QA, Support, Admin)
- **Roster Planning**: Visual roster board showing 9 days (4 past + today + 4 future)
- **Issue Tracking**: Users can report issues with descriptions and file attachments
- **Comments & Reactions**: Team members can comment on issues and react with emojis
- **Authentication**: Cookie-based session management
- **Modern UI**: Clean, responsive interface with smooth animations

## Tech Stack

- **Frontend**: React, Tailwind CSS, React Icons
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Authentication**: JWT with httpOnly cookies

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the initial admin user:
   ```bash
   node seed.js
   ```
   This will create an admin user with:
   - Email: admin@rostergardian.com
   - Password: admin123

4. Start the backend server:
   ```bash
   npm start
   ```
   The server will run on http://localhost:5000

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   The application will open at http://localhost:3000

## Usage

1. **Login**: Use the admin credentials to login
2. **Manage Users**: Click the settings icon to open the Admin Panel
   - Add new users with different roles
   - Edit existing users
   - Delete users
3. **Roster Assignment**: In the Admin Panel, switch to the Roster tab
   - Select a week
   - Assign users to specific days
4. **Create Issues**: Click the + icon on any day to create an issue
5. **Comment on Issues**: Click on any issue to view details and add comments
6. **React to Comments**: Add reactions to comments using the emoji buttons

## File Structure

```
roster_gardian/
├── backend/
│   ├── db/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── users.js
│   │   ├── roster.js
│   │   └── issues.js
│   ├── uploads/
│   │   ├── profiles/
│   │   ├── issues/
│   │   └── comments/
│   ├── server.js
│   ├── seed.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── LoginModal.js
│   │   │   ├── RosterBoard.js
│   │   │   ├── RosterColumn.js
│   │   │   ├── IssueModal.js
│   │   │   ├── CreateIssueModal.js
│   │   │   └── AdminPanel.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Security Notes

- Change the JWT secret in production
- Configure proper CORS settings
- Use HTTPS in production
- Implement proper file upload validation
- Add rate limiting for API endpoints

## Future Enhancements

- Email notifications for new issues
- Advanced filtering and search
- Issue priority levels
- Team performance metrics
- Mobile app version
