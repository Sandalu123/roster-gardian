import React, { useState, useEffect } from 'react';
import { issuesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { FiX, FiPaperclip, FiDownload, FiSend, FiThumbsUp, FiHeart, FiSmile, FiZap, FiCoffee, FiTrash2, FiActivity } from 'react-icons/fi';

const IssueModal = ({ issueId, onClose, onDeleted, onUpdated }) => {
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentFiles, setCommentFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadIssueData();
    loadStatuses();
  }, [issueId]);

  const loadIssueData = async () => {
    try {
      const [issueResponse, commentsResponse] = await Promise.all([
        issuesAPI.getById(issueId),
        user ? issuesAPI.getComments(issueId) : Promise.resolve({ data: [] })
      ]);

      console.log('Issue data:', issueResponse.data);
      console.log('Comments data:', commentsResponse.data);

      setIssue(issueResponse.data);
      setComments(commentsResponse.data);
    } catch (error) {
      console.error('Error loading issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatuses = async () => {
    try {
      const response = await issuesAPI.getStatuses();
      console.log('Statuses loaded:', response.data);
      setStatuses(response.data);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && commentFiles.length === 0) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('content', commentText);
    
    commentFiles.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      await issuesAPI.addComment(issueId, formData);
      setCommentText('');
      setCommentFiles([]);
      loadIssueData();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatusId) => {
    const newStatusIdInt = parseInt(newStatusId);
    if (newStatusIdInt === issue.status_id) return;
    
    console.log('Changing status from', issue.status_id, 'to', newStatusIdInt);
    
    setUpdatingStatus(true);
    try {
      const response = await issuesAPI.updateStatus(issueId, newStatusIdInt);
      console.log('Status update response:', response.data);
      loadIssueData();
      if (onUpdated) onUpdated();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status: ' + (error.response?.data?.error || error.message));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!window.confirm('Are you sure you want to delete this issue? This action cannot be undone.')) {
      return;
    }

    try {
      await issuesAPI.delete(issueId);
      onDeleted();
    } catch (error) {
      console.error('Error deleting issue:', error);
      alert('Failed to delete issue');
    }
  };

  const handleReaction = async (commentId, reactionType, hasReacted) => {
    try {
      if (hasReacted) {
        await issuesAPI.removeReaction(issueId, commentId, reactionType);
      } else {
        await issuesAPI.addReaction(issueId, commentId, reactionType);
      }
      loadIssueData();
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const getReactionIcon = (type) => {
    const icons = {
      thumbs_up: FiThumbsUp,
      heart: FiHeart,
      smile: FiSmile,
      celebrate: FiZap,
      thinking: FiCoffee
    };
    return icons[type] || FiThumbsUp;
  };

  const isImageFile = (fileName, fileType) => {
    return fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  };

  const getFileUrl = (filePath) => {
    return `http://localhost:4010${filePath}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-custom flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-custom flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <p>Issue not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Close</button>
        </div>
      </div>
    );
  }

  const currentStatus = statuses.find(s => s.id === issue.status_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-custom flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">{issue.title}</h2>
            {currentStatus && (
              <span 
                className="text-sm px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: currentStatus.color }}
              >
                {currentStatus.name}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {user?.role === 'admin' && (
              <button
                onClick={handleDeleteIssue}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Issue"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-700 whitespace-pre-wrap mb-4">{issue.description}</p>
              
              {/* Display images from issue attachments */}
              {issue.attachments && issue.attachments.filter(att => isImageFile(att.file_name, att.file_type)).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Images</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {issue.attachments
                      .filter(att => isImageFile(att.file_name, att.file_type))
                      .map((attachment) => (
                        <a
                          key={attachment.id}
                          href={getFileUrl(attachment.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <img
                            src={getFileUrl(attachment.file_path)}
                            alt={attachment.file_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image failed to load:', attachment.file_path);
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">Image not found</div>';
                            }}
                          />
                        </a>
                      ))}
                  </div>
                </div>
              )}

              {/* Display non-image attachments */}
              {issue.attachments && issue.attachments.filter(att => !isImageFile(att.file_name, att.file_type)).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Files</h4>
                  <div className="space-y-1">
                    {issue.attachments
                      .filter(att => !isImageFile(att.file_name, att.file_type))
                      .map((attachment) => (
                        <a
                          key={attachment.id}
                          href={getFileUrl(attachment.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 p-2 bg-gray-50 rounded"
                        >
                          <FiPaperclip className="w-4 h-4" />
                          <span>{attachment.file_name}</span>
                          <FiDownload className="w-3 h-3" />
                        </a>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>Created by {issue.created_by_name}</span>
                  <span>•</span>
                  <span>{format(new Date(issue.created_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                
                {user && (
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Status:</label>
                    <select
                      value={issue.status_id || ''}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={updatingStatus}
                      className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {statuses.map(status => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                    {updatingStatus && <span className="text-xs">Updating...</span>}
                  </div>
                )}
              </div>
            </div>

            {user && (
              <>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity</h3>
                  
                  {comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment) => {
                        const userReactions = comment.reactions.filter(r => r.user_id === user.id);
                        
                        return (
                          <div key={comment.id} className={`rounded-lg p-4 ${
                            comment.comment_type === 'status_change' ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-gray-50'
                          }`}>
                            <div className="flex items-start space-x-3">
                              {comment.comment_type === 'status_change' ? (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <FiActivity className="w-4 h-4 text-blue-600" />
                                </div>
                              ) : comment.user_image ? (
                                <img
                                  src={getFileUrl(comment.user_image)}
                                  alt={comment.user_name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">
                                    {comment.user_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">{comment.user_name}</span>
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                                  </span>
                                  {comment.comment_type === 'status_change' && (
                                    <span className="text-xs text-blue-600 font-medium">changed status</span>
                                  )}
                                </div>
                                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                                
                                {/* Display comment attachments */}
                                {comment.attachments && comment.attachments.length > 0 && (
                                  <div className="mt-3">
                                    {/* Images in comment */}
                                    {comment.attachments.filter(att => isImageFile(att.file_name, att.file_type)).length > 0 && (
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                                        {comment.attachments
                                          .filter(att => isImageFile(att.file_name, att.file_type))
                                          .map((attachment) => (
                                            <a
                                              key={attachment.id}
                                              href={getFileUrl(attachment.file_path)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="block aspect-square bg-gray-100 rounded overflow-hidden hover:shadow-md transition-shadow"
                                            >
                                              <img
                                                src={getFileUrl(attachment.file_path)}
                                                alt={attachment.file_name}
                                                className="w-full h-full object-cover"
                                              />
                                            </a>
                                          ))}
                                      </div>
                                    )}
                                    
                                    {/* Files in comment */}
                                    {comment.attachments.filter(att => !isImageFile(att.file_name, att.file_type)).length > 0 && (
                                      <div className="space-y-1">
                                        {comment.attachments
                                          .filter(att => !isImageFile(att.file_name, att.file_type))
                                          .map((attachment) => (
                                            <a
                                              key={attachment.id}
                                              href={getFileUrl(attachment.file_path)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 bg-white rounded px-2 py-1"
                                            >
                                              <FiPaperclip className="w-3 h-3" />
                                              <span>{attachment.file_name}</span>
                                              <FiDownload className="w-3 h-3" />
                                            </a>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {comment.comment_type === 'comment' && (
                                  <div className="mt-3 flex items-center space-x-2">
                                    {['thumbs_up', 'heart', 'smile', 'celebrate', 'thinking'].map((type) => {
                                      const Icon = getReactionIcon(type);
                                      const reactions = comment.reactions.filter(r => r.reaction_type === type);
                                      const hasReacted = userReactions.some(r => r.reaction_type === type);
                                      
                                      return (
                                        <button
                                          key={type}
                                          onClick={() => handleReaction(comment.id, type, hasReacted)}
                                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                            hasReacted
                                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                          }`}
                                        >
                                          <Icon className="w-3 h-3" />
                                          {reactions.length > 0 && <span>{reactions.length}</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No activity yet</p>
                  )}
                </div>

                <form onSubmit={handleSubmitComment} className="mt-6 border-t border-gray-200 pt-4">
                  <div className="space-y-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="3"
                    />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <label className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                          <input
                            type="file"
                            multiple
                            onChange={(e) => setCommentFiles(Array.from(e.target.files))}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.txt"
                          />
                          <div className="flex items-center space-x-1">
                            <FiPaperclip className="w-4 h-4" />
                            <span>Attach files</span>
                          </div>
                        </label>
                        {commentFiles.length > 0 && (
                          <span className="text-sm text-gray-500">
                            {commentFiles.length} file(s) selected
                          </span>
                        )}
                      </div>
                      
                      <button
                        type="submit"
                        disabled={submitting || (!commentText.trim() && commentFiles.length === 0)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiSend className="w-4 h-4" />
                        <span>{submitting ? 'Sending...' : 'Send'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueModal;