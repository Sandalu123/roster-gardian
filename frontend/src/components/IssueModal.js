import React, { useState, useEffect } from 'react';
import { issuesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { FiX, FiPaperclip, FiDownload, FiSend, FiThumbsUp, FiHeart, FiSmile, FiZap, FiCoffee } from 'react-icons/fi';

const IssueModal = ({ issueId, onClose }) => {
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentFiles, setCommentFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadIssueData();
  }, [issueId]);

  const loadIssueData = async () => {
    try {
      const [issueResponse, commentsResponse] = await Promise.all([
        issuesAPI.getById(issueId),
        user ? issuesAPI.getComments(issueId) : Promise.resolve({ data: [] })
      ]);

      setIssue(issueResponse.data);
      setComments(commentsResponse.data);
    } catch (error) {
      console.error('Error loading issue:', error);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-red-100 text-red-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">{issue.title}</h2>
            <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(issue.status)}`}>
              {issue.status.replace('_', ' ')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-700 whitespace-pre-wrap">{issue.description}</p>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <span>Created by {issue.created_by_name}</span>
                <span className="mx-2">•</span>
                <span>{format(new Date(issue.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              
              {issue.attachments && issue.attachments.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Attachments</h4>
                  <div className="space-y-1">
                    {issue.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={`http://localhost:4010${attachment.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <FiPaperclip className="w-4 h-4" />
                        <span>{attachment.file_name}</span>
                        <FiDownload className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {user && (
              <>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>
                  
                  {comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment) => {
                        const userReactions = comment.reactions.filter(r => r.user_id === user.id);
                        
                        return (
                          <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              {comment.user_image ? (
                                <img
                                  src={`http://localhost:4010${comment.user_image}`}
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
                                </div>
                                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                                
                                {comment.attachments && comment.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {comment.attachments.map((attachment) => (
                                      <a
                                        key={attachment.id}
                                        href={`http://localhost:4010${attachment.file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                                      >
                                        <FiPaperclip className="w-3 h-3" />
                                        <span>{attachment.file_name}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                                
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
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No comments yet</p>
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
