import React, { useState, useEffect } from 'react';
import { userAPI, rosterAPI } from '../services/api';
import { format, addDays } from 'date-fns';
import { FiX, FiPlus, FiEdit2, FiTrash2, FiUser, FiCalendar } from 'react-icons/fi';

const AdminPanel = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [roster, setRoster] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'developer',
    contactNumber: '',
    bio: '',
    profileImage: null
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const usersResponse = await userAPI.getAll();
      setUsers(usersResponse.data);

      const startDate = selectedDate;
      const endDate = format(addDays(new Date(selectedDate), 6), 'yyyy-MM-dd');
      const rosterResponse = await rosterAPI.getRange(startDate, endDate);
      setRoster(rosterResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== '') {
        data.append(key, formData[key]);
      }
    });

    try {
      if (editingUser) {
        await userAPI.update(editingUser.id, data);
      } else {
        await userAPI.create(data);
      }
      
      setShowUserForm(false);
      setEditingUser(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await userAPI.delete(userId);
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleRosterAssignment = async (userId, date) => {
    try {
      await rosterAPI.create({ userId, date });
      loadData();
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        alert('This user is already assigned to this date');
      } else {
        console.error('Error assigning roster:', error);
        alert('Failed to assign roster');
      }
    }
  };

  const handleRosterRemoval = async (rosterId) => {
    if (!window.confirm('Remove this roster assignment?')) return;
    
    try {
      await rosterAPI.delete(rosterId);
      loadData();
    } catch (error) {
      console.error('Error removing roster:', error);
      alert('Failed to remove roster assignment');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'developer',
      contactNumber: '',
      bio: '',
      profileImage: null
    });
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      contactNumber: user.contact_number || '',
      bio: user.bio || '',
      profileImage: null
    });
    setShowUserForm(true);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-custom flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-custom flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-6 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiUser className="inline w-4 h-4 mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex-1 py-3 px-6 font-medium transition-colors ${
              activeTab === 'roster'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiCalendar className="inline w-4 h-4 mr-2" />
            Roster
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {activeTab === 'users' ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Manage Users</h3>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    resetForm();
                    setShowUserForm(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Add User</span>
                </button>
              </div>

              {showUserForm ? (
                <form onSubmit={handleUserSubmit} className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold mb-4">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password {editingUser ? '(leave blank to keep current)' : '*'}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={!editingUser}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="developer">Developer</option>
                        <option value="qa">QA</option>
                        <option value="support">Support</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Profile Image
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setFormData({...formData, profileImage: e.target.files[0]})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        accept="image/*"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserForm(false);
                        setEditingUser(null);
                        resetForm();
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingUser ? 'Update' : 'Create'} User
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {user.profile_image ? (
                          <img
                            src={`http://localhost:5000${user.profile_image}`}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <FiUser className="w-6 h-6 text-gray-600" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${
                            user.role === 'admin' ? 'bg-red-100 text-red-700' :
                            user.role === 'developer' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'qa' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openEditForm(user)}
                          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {user.contact_number && (
                      <p className="text-sm text-gray-600 mt-2">{user.contact_number}</p>
                    )}
                    {user.bio && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Roster Assignments</h3>
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">
                    Week starting:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-4">
                {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                  const date = format(addDays(new Date(selectedDate), dayOffset), 'yyyy-MM-dd');
                  const dayRoster = roster[date] || [];
                  
                  return (
                    <div key={date} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {format(new Date(date), 'EEE, MMM d')}
                      </h4>
                      
                      <div className="space-y-2 mb-4">
                        {dayRoster.map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm">
                            <span>{assignment.name}</span>
                            <button
                              onClick={() => handleRosterRemoval(assignment.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FiX className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleRosterAssignment(e.target.value, date);
                            e.target.value = '';
                          }
                        }}
                        className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Add user...</option>
                        {users
                          .filter(user => !dayRoster.find(r => r.userId === user.id))
                          .map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
