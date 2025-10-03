// src/components/MessageFromAdmin.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MessageFromAdmin = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching messages from admin...');
      
      // FIXED: Using correct endpoint
      const response = await api.get('/messages/from-admin');
      console.log('📨 Messages response:', response.data);
      
      if (response.data.success) {
        setMessages(response.data.messages || []);
        
        // Mark notifications as read when user opens this page
        try {
          await api.put('/notifications/mark-admin-messages-read');
        } catch (notifError) {
          console.log('ℹ️ Notifications marking failed:', notifError.message);
        }
      } else {
        showAlert('No messages found', 'info');
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      if (error.response?.status === 401) {
        showAlert('Please login to view messages', 'error');
      } else if (error.response?.status === 403) {
        showAlert('Access denied to messages', 'error');
      } else {
        showAlert('Error loading messages from admin', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const viewMessage = (message) => {
    setSelectedMessage(message);
    setShowMessageModal(true);
    
    // Mark as read when viewed
    if (!message.read) {
      markAsRead(message._id);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await api.put(`/messages/${messageId}/mark-read`);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, read: true } : msg
      ));
      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage(prev => ({ ...prev, read: true }));
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const extractAccessCode = (message) => {
    if (message.contentType === 'access_code') {
      const codeMatch = message.content.match(/Access Code:?\s*([A-Z0-9]{8})/i);
      return codeMatch ? codeMatch[1] : null;
    }
    return null;
  };

  return (
    <div className="message-from-admin" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Custom Alert */}
      {alert.show && (
        <div className={`custom-alert custom-alert-${alert.type}`}>
          <div className="alert-content">
            <i className={`fas ${
              alert.type === 'success' ? 'fa-check-circle' :
              alert.type === 'error' ? 'fa-exclamation-circle' :
              'fa-info-circle'
            } me-2`}></i>
            {alert.message}
            <button
              className="alert-close"
              onClick={() => setAlert({ show: false, type: '', message: '' })}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card text-white bg-success shadow-lg">
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-envelope me-3"></i>
                      Messages From Admin
                    </h1>
                    <p className="lead mb-0 opacity-75">
                      Important updates, replies, and access codes from the administration
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block text-success">
                      <h4 className="mb-0 fw-bold">{messages.length}</h4>
                      <small>Total Messages</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-lg border-0">
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-success mb-3" style={{width: '3rem', height: '3rem'}}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <h4 className="text-success">Loading Messages...</h4>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h3 className="text-muted">No Messages Yet</h3>
                    <p className="text-muted">
                      You don't have any messages from the administration yet. 
                      Check back later for updates, replies, or access codes.
                    </p>
                    <button 
                      className="btn btn-success mt-3"
                      onClick={fetchMessages}
                    >
                      <i className="fas fa-sync-alt me-2"></i>
                      Refresh Messages
                    </button>
                  </div>
                ) : (
                  <div className="messages-list">
                    {messages.map((message) => {
                      const accessCode = extractAccessCode(message);
                      return (
                        <div key={message._id} className={`message-card border rounded p-3 mb-3 ${
                          !message.read ? 'border-success bg-light' : ''
                        }`}>
                          <div className="row align-items-center">
                            <div className="col-md-8">
                              <div className="d-flex align-items-start mb-2">
                                {!message.read && (
                                  <span className="badge bg-success me-2">New</span>
                                )}
                                {accessCode && (
                                  <span className="badge bg-warning me-2">
                                    <i className="fas fa-key me-1"></i>Access Code
                                  </span>
                                )}
                                <h5 className="mb-1 fw-bold">{message.subject}</h5>
                              </div>
                              <p className="text-muted mb-2">
                                {message.message ? (
                                  message.message.length > 150 
                                    ? `${message.message.substring(0, 150)}...` 
                                    : message.message
                                ) : message.content ? (
                                  message.content.length > 150 
                                    ? `${message.content.substring(0, 150)}...` 
                                    : message.content
                                ) : 'No message content'}
                              </p>
                              <small className="text-muted">
                                <strong>Received:</strong> {formatDate(message.createdAt)}
                              </small>
                              {message.fromAdmin && (
                                <small className="text-muted d-block">
                                  <strong>From:</strong> {message.fromAdmin.username}
                                </small>
                              )}
                            </div>
                            <div className="col-md-4 text-end">
                              <button
                                className="btn btn-outline-success btn-sm"
                                onClick={() => viewMessage(message)}
                              >
                                <i className="fas fa-eye me-1"></i>View Details
                              </button>
                              {accessCode && (
                                <div className="mt-2">
                                  <small className="text-warning fw-bold">
                                    <i className="fas fa-key me-1"></i>Contains Access Code
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Detail Modal */}
      {showMessageModal && selectedMessage && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="fas fa-envelope me-2"></i>
                  Message From Admin
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowMessageModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Sender Information */}
                {selectedMessage.fromAdmin && (
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="card bg-light">
                        <div className="card-body py-3">
                          <h6 className="card-title mb-2">From Administrator</h6>
                          <div className="row">
                            <div className="col-md-6">
                              <small><strong>Name:</strong> {selectedMessage.fromAdmin.username}</small>
                            </div>
                            <div className="col-md-6">
                              <small><strong>Email:</strong> {selectedMessage.fromAdmin.email}</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div className="mb-4">
                  <h6 className="fw-bold">Subject</h6>
                  <p className="text-success fw-bold">{selectedMessage.subject}</p>
                  
                  <h6 className="fw-bold mt-3">Message</h6>
                  <div className="border rounded p-3 bg-white">
                    {selectedMessage.contentType === 'access_code' ? (
                      <div>
                        <div className="alert alert-warning">
                          <h6>
                            <i className="fas fa-key me-2"></i>
                            Masterclass Access Code
                          </h6>
                          <p className="mb-2">
                            You have received an access code for premium masterclass courses!
                          </p>
                          {extractAccessCode(selectedMessage) && (
                            <div className="text-center my-3">
                              <h4 className="text-primary">
                                <code style={{ fontSize: '1.5rem', letterSpacing: '2px' }}>
                                  {extractAccessCode(selectedMessage)}
                                </code>
                              </h4>
                              <small className="text-muted">
                                Use this code in the Masterclass Courses section to unlock premium content
                              </small>
                            </div>
                          )}
                        </div>
                        <div className="mt-3">
                          {selectedMessage.message ? (
                            selectedMessage.message.split('\n').map((paragraph, index) => (
                              <p key={index} className="mb-2">{paragraph}</p>
                            ))
                          ) : selectedMessage.content ? (
                            selectedMessage.content.split('\n').map((paragraph, index) => (
                              <p key={index} className="mb-2">{paragraph}</p>
                            ))
                          ) : (
                            <p>No message content available.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      selectedMessage.message ? (
                        selectedMessage.message.split('\n').map((paragraph, index) => (
                          <p key={index} className="mb-2">{paragraph}</p>
                        ))
                      ) : selectedMessage.content ? (
                        selectedMessage.content.split('\n').map((paragraph, index) => (
                          <p key={index} className="mb-2">{paragraph}</p>
                        ))
                      ) : (
                        <p>No message content available.</p>
                      )
                    )}
                  </div>
                  
                  <small className="text-muted mt-2 d-block">
                    Received: {formatDate(selectedMessage.createdAt)}
                  </small>
                  {selectedMessage.read && selectedMessage.readAt && (
                    <small className="text-muted d-block">
                      Read: {formatDate(selectedMessage.readAt)}
                    </small>
                  )}
                </div>

                {/* Action Buttons for Access Codes */}
                {selectedMessage.contentType === 'access_code' && extractAccessCode(selectedMessage) && (
                  <div className="alert alert-info">
                    <h6>
                      <i className="fas fa-rocket me-2"></i>
                      Ready to Access Masterclass Courses?
                    </h6>
                    <p className="mb-2">
                      Use your access code to unlock premium masterclass content:
                    </p>
                    <button
                      className="btn btn-warning"
                      onClick={() => {
                        setShowMessageModal(false);
                        window.location.href = '#masterclass-courses';
                      }}
                    >
                      <i className="fas fa-crown me-2"></i>
                      Go to Masterclass Courses
                    </button>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMessageModal(false)}
                >
                  Close
                </button>
                {selectedMessage.contentType === 'access_code' && extractAccessCode(selectedMessage) && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => {
                      navigator.clipboard.writeText(extractAccessCode(selectedMessage));
                      showAlert('Access code copied to clipboard!', 'success');
                    }}
                  >
                    <i className="fas fa-copy me-2"></i>
                    Copy Code
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-alert {
          position: fixed;
          top: 100px;
          right: 20px;
          z-index: 9999;
          min-width: 300px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideInRight 0.3s ease-out;
        }
        
        .custom-alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .custom-alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .alert-content {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .alert-close {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 4px;
          margin-left: 12px;
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default MessageFromAdmin;