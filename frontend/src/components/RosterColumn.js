import React from 'react';
import { format } from 'date-fns';
import { FiUser, FiPhone, FiMail, FiPlus, FiMessageSquare, FiCopy } from 'react-icons/fi';

const RosterColumn = ({ date, isToday, roster, issues, onSelectIssue, onCreateIssue, canCreateIssue }) => {
  const dayName = format(date, 'EEE');
  const dayNumber = format(date, 'd');
  const monthName = format(date, 'MMM');

  const getRoleBadgeColor = (role) => {
    const colors = {
      developer: 'bg-purple-100 text-purple-700',
      qa: 'bg-green-100 text-green-700',
      support: 'bg-blue-100 text-blue-700',
      admin: 'bg-red-100 text-red-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-red-100 text-red-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
      <div className={`flex-shrink-0 w-80 border-r border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
        <div className={`sticky top-0 z-10 ${isToday ? 'bg-blue-100' : 'bg-gray-50'} border-b border-gray-200 p-3`}>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-gray-900 ml-4">{dayNumber}</div>
            <div className="text-center flex-1 mx-4">
              <div className="text-sm text-gray-600">{dayName}</div>
              <div className="text-sm text-gray-600">{monthName}</div>
            </div>
            <div className="w-10 flex justify-end">
              {isToday && (
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center" title="Today">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-full overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-4">
            {roster.length > 0 ? (
                roster.map((person) => (
                    <div key={person.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="flex items-start space-x-3">
                        {person.profileImage ? (
                            <img
                                src={`http://localhost:4010${person.profileImage}`}
                                alt={person.name}
                                className="w-12 h-12 rounded-full object-cover"
                                title={person.bio || person.name}
                            />
                        ) : (
                            <div
                                className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center"
                                title={person.bio || person.name}
                            >
                              <FiUser className="w-6 h-6 text-gray-600"/>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3
                              className="font-semibold text-gray-900"
                              title={person.bio || person.name}
                          >
                            {person.name}
                          </h3>
                          <span
                              className={`inline-block text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(person.role)}`}>
                   {person.role}
                 </span>
                          {person.contactNumber && (
                              <div className="flex items-center mt-2 text-sm text-gray-600 group">
                                <FiPhone className="w-4 h-4 mr-1 flex-shrink-0"/>
                                <span className="truncate flex-1">{person.contactNumber}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(person.contactNumber)}
                                    className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-opacity"
                                    title="Copy phone number"
                                >
                                  <FiCopy className="w-3 h-3"/>
                                </button>
                              </div>
                          )}
                          {person.email && (
                              <div className="flex items-center mt-1 text-sm text-gray-600 group">
                                <FiMail className="w-4 h-4 mr-1 flex-shrink-0"/>
                                <span className="truncate flex-1">{person.email}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(person.email)}
                                    className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-opacity"
                                    title="Copy email"
                                >
                                  <FiCopy className="w-3 h-3"/>
                                </button>
                              </div>
                          )}
                        </div>
                      </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-gray-500">
                  No roster assigned
                </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Issues</h4>
                {canCreateIssue && (
                    <button
                        onClick={() => onCreateIssue(format(date, 'yyyy-MM-dd'))}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Create new issue"
                    >
                      <FiPlus className="w-4 h-4"/>
                    </button>
                )}
              </div>

              {issues.length > 0 ? (
                  <div className="space-y-2">
                    {issues.map((issue) => (
                        <div
                            key={issue.id}
                            onClick={() => onSelectIssue(issue)}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <h5 className="font-medium text-gray-900 text-sm">{issue.title}</h5>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(issue.status)}`}>
                     {issue.status.replace('_', ' ')}
                   </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{issue.description}</p>
                          <div className="flex items-center justify-between mt-2">
                   <span className="text-xs text-gray-500">
                     by {issue.created_by_name}
                   </span>
                            {issue.comment_count > 0 && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <FiMessageSquare className="w-3 h-3 mr-1"/>
                                  {issue.comment_count}
                                </div>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
              ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No issues reported
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

export default RosterColumn;
