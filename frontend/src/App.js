import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';
import Header from './components/Header';
import RosterBoard from './components/RosterBoard';
import IssueModal from './components/IssueModal';
import AdminPanel from './components/AdminPanel';
import CreateIssueModal from './components/CreateIssueModal';
import { format } from 'date-fns';

function AppContent() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [centerDate, setCenterDate] = useState(new Date());

  useEffect(() => {
    if (!loading && !user) {
      setShowLogin(true);
    }
  }, [loading, user]);

  const handleCreateIssue = (date) => {
    setSelectedDate(date);
    setShowCreateIssue(true);
  };

  const handleIssueCreated = () => {
    setShowCreateIssue(false);
    setSelectedDate(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onShowLogin={() => setShowLogin(true)} 
        onShowAdmin={() => setShowAdmin(true)}
      />
      
      <main className="flex-1">
        <RosterBoard 
          onSelectIssue={setSelectedIssue}
          onCreateIssue={handleCreateIssue}
          centerDate={centerDate}
          onCenterDateChange={setCenterDate}
        />
      </main>

      {showLogin && !user && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}

      {showAdmin && user?.role === 'admin' && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}

      {selectedIssue && (
        <IssueModal 
          issueId={selectedIssue.id}
          onClose={() => setSelectedIssue(null)}
        />
      )}

      {showCreateIssue && user && (
        <CreateIssueModal
          date={selectedDate}
          onClose={() => {
            setShowCreateIssue(false);
            setSelectedDate(null);
          }}
          onCreated={handleIssueCreated}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
