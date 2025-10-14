// src/components/MessageFromStudents.jsx - ENHANCED VERSION WITH GROUPING & PAGINATION
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MessageFromStudents = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  
  // NEW: State for grouped messages and expanded groups
  const [groupedMessages, setGroupedMessages] = useState({});
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(10);

  // Show custom alert
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  // NEW: Function to group messages by student email
  const groupMessagesByStudent = (messages) => {
    const grouped = {};
    
    messages.forEach(message => {
      const studentEmail = message.fromStudent?.email || 'unknown@email.com';
      const studentId = message.fromStudent?._id || 'unknown';
      
      if (!grouped[studentEmail]) {
        grouped[studentEmail] = {
          studentId: studentId,
          studentName: message.fromStudent?.profile?.firstName 
            ? `${message.fromStudent.profile.firstName} ${message.fromStudent.profile.lastName || ''}`.trim()
            : message.fromStudent?.username || 'Unknown Student',
          studentEmail: studentEmail,
          phone: message.fromStudent?.profile?.phone || message.phone || 'Not provided',
          messages: [],
          unreadCount: 0,
          totalCount: 0,
          lastMessage: null
        };
      }
      
      grouped[studentEmail].messages.push(message);
      grouped[studentEmail].totalCount++;
      
      if (!message.read) {
        grouped[studentEmail].unreadCount++;
      }
      
      // Update last message
      if (!grouped[studentEmail].lastMessage || new Date(message.createdAt) > new Date(grouped[studentEmail].lastMessage.createdAt)) {
        grouped[studentEmail].lastMessage = message;
      }
    });
    
    // Sort messages within each group by date (newest first)
    Object.keys(grouped).forEach(email => {
      grouped[email].messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });
    
    return grouped;
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/messages-from-students', {
        params: { filter }
      });
      if (response.data.success) {
        const messagesData = response.data.messages;
        setMessages(messagesData);
        
        // Group messages by student email
        const grouped = groupMessagesByStudent(messagesData);
        setGroupedMessages(grouped);
        
        // Mark notifications as read when admin opens this page
        await api.put('/notifications/mark-admin-messages-read');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      showAlert('Error loading messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Toggle group expansion
  const toggleGroup = (studentEmail) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(studentEmail)) {
      newExpanded.delete(studentEmail);
    } else {
      newExpanded.add(studentEmail);
    }
    setExpandedGroups(newExpanded);
  };

  // NEW: Expand all groups
  const expandAllGroups = () => {
    const allEmails = Object.keys(groupedMessages);
    setExpandedGroups(new Set(allEmails));
  };

  // NEW: Collapse all groups
  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
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
      await api.put(`/admin/messages/${messageId}/mark-read`);
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, read: true } : msg
      ));
      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage(prev => ({ ...prev, read: true }));
      }
      
      // Refresh grouped messages
      const grouped = groupMessagesByStudent(messages.map(msg => 
        msg._id === messageId ? { ...msg, read: true } : msg
      ));
      setGroupedMessages(grouped);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) {
      showAlert('Please enter a reply message', 'error');
      return;
    }

    setReplying(true);
    try {
      const response = await api.post(`/admin/messages/${selectedMessage._id}/reply`, {
        reply: replyText
      });
      
      if (response.data.success) {
        showAlert('Reply sent successfully!', 'success');
        setReplyText('');
        setShowMessageModal(false);
        fetchMessages(); // Refresh the list
      } else {
        showAlert('Failed to send reply. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      showAlert('Failed to send reply. Please try again.', 'error');
    } finally {
      setReplying(false);
    }
  };

  const generateAccessCode = async (courseId, studentId) => {
    try {
      const response = await api.post('/admin/generate-access-code', {
        courseId,
        studentId
      });
      
      if (response.data.success) {
        showAlert(`Access code generated: ${response.data.accessCode}\n\nThis code has been sent to the student.`, 'success');
        // Send the code to student via message
        await api.post('/admin/messages/send-access-code', {
          studentId,
          accessCode: response.data.accessCode,
          courseTitle: response.data.courseTitle
        });
        
        // Refresh messages to show updated status
        fetchMessages();
      } else {
        showAlert('Failed to generate access code. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error generating access code:', error);
      showAlert('Failed to generate access code. Please try again.', 'error');
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

  // NEW: Pagination logic for student groups
  const studentEmails = Object.keys(groupedMessages);
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudentEmails = studentEmails.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(studentEmails.length / studentsPerPage);

  // NEW: Pagination functions
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  // NEW: Generate page numbers
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="message-from-students" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
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
            <div className="card text-white bg-info shadow-lg">
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-envelope-open-text me-3"></i>
                      Messages From Students
                    </h1>
                    <p className="lead mb-0 opacity-75">
                      Manage and respond to student inquiries and requests
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block text-info">
                      <h4 className="mb-0 fw-bold">{Object.keys(groupedMessages).length}</h4>
                      <small>Student Conversations</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-4">
                    <h5 className="mb-0">Filter Messages:</h5>
                  </div>
                  <div className="col-md-4">
                    <select
                      className="form-select"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All Messages</option>
                      <option value="unread">Unread Only</option>
                      <option value="read">Read (No Reply)</option>
                      <option value="replied">Replied</option>
                    </select>
                  </div>
                  <div className="col-md-4 text-end">
                    {/* NEW: Expand/Collapse All Buttons */}
                    <div className="btn-group">
                      <button
                        className="btn btn-outline-info btn-sm"
                        onClick={expandAllGroups}
                        disabled={Object.keys(groupedMessages).length === 0}
                      >
                        <i className="fas fa-expand-alt me-1"></i>Expand All
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={collapseAllGroups}
                        disabled={expandedGroups.size === 0}
                      >
                        <i className="fas fa-compress-alt me-1"></i>Collapse All
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages List with Grouping */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-lg border-0">
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-info mb-3" style={{width: '3rem', height: '3rem'}}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <h4 className="text-info">Loading Messages...</h4>
                  </div>
                ) : Object.keys(groupedMessages).length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h3 className="text-muted">No Messages Found</h3>
                    <p className="text-muted">
                      {filter === 'all' 
                        ? "No messages from students yet." 
                        : `No ${filter} messages found.`
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Student Groups */}
                    <div className="student-groups">
                      {currentStudentEmails.map(studentEmail => {
                        const group = groupedMessages[studentEmail];
                        const isExpanded = expandedGroups.has(studentEmail);
                        
                        return (
                          <div key={studentEmail} className="student-group mb-3">
                            {/* Group Header */}
                            <div 
                              className="group-header card border-0 shadow-sm"
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleGroup(studentEmail)}
                            >
                              <div className="card-body">
                                <div className="row align-items-center">
                                  <div className="col-md-8">
                                    <div className="d-flex align-items-center">
                                      <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} me-3 text-info`}></i>
                                      <div>
                                        <h6 className="mb-1 fw-bold text-dark">
                                          {group.studentName}
                                          {group.unreadCount > 0 && (
                                            <span className="badge bg-danger ms-2">
                                              {group.unreadCount} New
                                            </span>
                                          )}
                                        </h6>
                                        <p className="mb-1 text-muted small">
                                          <i className="fas fa-envelope me-1"></i>
                                          {group.studentEmail}
                                        </p>
                                        <p className="mb-0 text-muted small">
                                          <i className="fas fa-phone me-1"></i>
                                          {group.phone}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-4 text-end">
                                    <div className="d-flex justify-content-end align-items-center">
                                      <span className="badge bg-info me-2">
                                        {group.totalCount} {group.totalCount === 1 ? 'Message' : 'Messages'}
                                      </span>
                                      <small className="text-muted">
                                        Last: {formatDate(group.lastMessage.createdAt)}
                                      </small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Group Messages (Collapsible) */}
                            {isExpanded && (
                              <div className="group-messages mt-2">
                                {group.messages.map((message) => (
                                  <div key={message._id} className={`message-card border rounded p-3 mb-2 ${
                                    !message.read ? 'border-primary bg-light' : ''
                                  }`}>
                                    <div className="row align-items-center">
                                      <div className="col-md-8">
                                        <div className="d-flex align-items-start mb-2">
                                          {!message.read && (
                                            <span className="badge bg-primary me-2">New</span>
                                          )}
                                          <h6 className="mb-1 fw-bold">{message.subject}</h6>
                                        </div>
                                        <p className="text-muted mb-2">
                                          {message.message.length > 150 
                                            ? `${message.message.substring(0, 150)}...` 
                                            : message.message
                                          }
                                        </p>
                                        <small className="text-muted">
                                          <strong>Sent:</strong> {formatDate(message.createdAt)}
                                        </small>
                                      </div>
                                      <div className="col-md-4 text-end">
                                        <div className="btn-group">
                                          <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              viewMessage(message);
                                            }}
                                          >
                                            <i className="fas fa-eye me-1"></i>View
                                          </button>
                                          {message.message.toLowerCase().includes('access code') && (
                                            <button
                                              className="btn btn-outline-warning btn-sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                generateAccessCode('course_id_here', message.fromStudent?._id);
                                              }}
                                              title="Generate Access Code"
                                            >
                                              <i className="fas fa-key me-1"></i>Code
                                            </button>
                                          )}
                                        </div>
                                        {message.reply && (
                                          <div className="mt-2">
                                            <span className="badge bg-success">
                                              <i className="fas fa-reply me-1"></i>Replied
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* NEW: Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                        {/* Page Info */}
                        <div className="text-muted">
                          Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, studentEmails.length)} of {studentEmails.length} students
                        </div>
                        
                        {/* Pagination */}
                        <nav aria-label="Student pagination">
                          <ul className="pagination pagination-sm mb-0">
                            {/* Previous Button */}
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={goToPreviousPage}
                                disabled={currentPage === 1}
                              >
                                <i className="fas fa-chevron-left"></i>
                              </button>
                            </li>

                            {/* Page Numbers */}
                            {getPageNumbers().map((number, index) => (
                              <li 
                                key={index} 
                                className={`page-item ${number === currentPage ? 'active' : ''} ${number === '...' ? 'disabled' : ''}`}
                              >
                                {number === '...' ? (
                                  <span className="page-link">...</span>
                                ) : (
                                  <button 
                                    className="page-link" 
                                    onClick={() => paginate(number)}
                                  >
                                    {number}
                                  </button>
                                )}
                              </li>
                            ))}

                            {/* Next Button */}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                              >
                                <i className="fas fa-chevron-right"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Detail Modal (Remains the same) */}
      {showMessageModal && selectedMessage && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-envelope me-2"></i>
                  Message Details
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowMessageModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Student Information */}
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-light">
                      <div className="card-body py-3">
                        <h6 className="card-title mb-2">Student Information</h6>
                        <div className="row">
                          <div className="col-md-6">
                            <small><strong>Name:</strong> {selectedMessage.fromStudent?.profile?.firstName || selectedMessage.fromStudent?.username} {selectedMessage.fromStudent?.profile?.lastName || ''}</small>
                          </div>
                          <div className="col-md-6">
                            <small><strong>Email:</strong> {selectedMessage.fromStudent?.email}</small>
                          </div>
                          {selectedMessage.fromStudent?.profile?.phone && (
                            <div className="col-md-6 mt-2">
                              <small><strong>Phone:</strong> {selectedMessage.fromStudent.profile.phone}</small>
                            </div>
                          )}
                          <div className="col-md-6 mt-2">
                            <small><strong>User ID:</strong> {selectedMessage.fromStudent?._id}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                <div className="mb-4">
                  <h6 className="fw-bold">Subject</h6>
                  <p className="text-primary fw-bold">{selectedMessage.subject}</p>
                  
                  <h6 className="fw-bold mt-3">Message</h6>
                  <div className="border rounded p-3 bg-white">
                    {selectedMessage.message}
                  </div>
                  
                  <small className="text-muted mt-2 d-block">
                    Sent: {formatDate(selectedMessage.createdAt)}
                  </small>
                </div>

                {/* Reply Section */}
                {!selectedMessage.reply ? (
                  <div>
                    <h6 className="fw-bold">Send Reply</h6>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Type your reply to the student..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={replying}
                    />
                    <div className="mt-2">
                      <small className="text-muted">
                        This reply will be sent to the student and appear in their "Message from Admin" section.
                      </small>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h6 className="fw-bold">Your Reply</h6>
                    <div className="border rounded p-3 bg-light">
                      {selectedMessage.reply}
                    </div>
                    <small className="text-muted mt-2 d-block">
                      Replied: {formatDate(selectedMessage.repliedAt)}
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMessageModal(false)}
                  disabled={replying}
                >
                  Close
                </button>
                {!selectedMessage.reply && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={sendReply}
                    disabled={replying || !replyText.trim()}
                  >
                    {replying ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Send Reply
                      </>
                    )}
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
        
        .group-header:hover {
          background-color: #f8f9fa;
        }
        
        .student-group {
          transition: all 0.3s ease;
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

export default MessageFromStudents;