// src/components/ContactUs.jsx - UPDATED VERSION WITH PHONE FIELD
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ContactUs = () => {
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    phone: '' // ADDED: Phone field
  });
  const [sending, setSending] = useState(false);
  const [sentMessages, setSentMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [messagesPerPage] = useState(5);

  const organizationInfo = {
    name: "The Conclave Academy",
    address: "123 Education Street, Knowledge City, 10001",
    phone: "080 64535072",
    email: "admin@conclaveacademy.com",
    hours: "Monday - Friday: 9:00 AM - 6:00 PM"
  };

  const showCustomAlert = (message, type = 'success') => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  // FIXED: Using authenticated API
  const fetchSentMessages = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching messages from /api/messages/sent');
      
      const response = await api.get('/messages/sent');
      const data = response.data;
      
      console.log('📨 Response:', data);
      
      if (data.success) {
        setSentMessages(data.messages || []);
        setCurrentPage(1);
      } else {
        showCustomAlert('No messages found', 'info');
      }
    } catch (error) {
      console.error('💥 Error:', error);
      if (error.response?.status === 401) {
        showCustomAlert('Please login to view your messages', 'error');
      } else {
        showCustomAlert('Error loading messages', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Include phone in message sending
  const handleSendMessage = async () => {
    if (!messageForm.subject.trim() || !messageForm.message.trim()) {
      showCustomAlert('Please fill in both subject and message', 'error');
      return;
    }

    setSending(true);
    try {
      console.log('📤 Sending message to /api/messages/send-to-admin');
      
      // UPDATED: Include phone in the message data
      const messageData = {
        subject: messageForm.subject,
        message: messageForm.message,
        phone: messageForm.phone // Include phone number
      };
      
      const response = await api.post('/messages/send-to-admin', messageData);
      const data = response.data;
      
      console.log('📨 Send response:', data);
      
      if (data.success) {
        showCustomAlert('Message sent successfully!', 'success');
        setShowMessageModal(false);
        setMessageForm({ subject: '', message: '', phone: '' }); // Reset phone too
        fetchSentMessages();
      } else {
        showCustomAlert('Failed to send message: ' + (data.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('💥 Send error:', error);
      if (error.response?.status === 401) {
        showCustomAlert('Please login to send messages', 'error');
      } else {
        showCustomAlert('Failed to send message', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Pagination logic
  const indexOfLastMessage = currentPage * messagesPerPage;
  const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;
  const currentMessages = sentMessages.slice(indexOfFirstMessage, indexOfLastMessage);
  const totalPages = Math.ceil(sentMessages.length / messagesPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Previous page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers for pagination
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

  // Load messages on mount
  useEffect(() => {
    fetchSentMessages();
  }, []);

  return (
    <div className="contact-us" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {alert.show && (
        <div className={`custom-alert custom-alert-${alert.type}`} style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          minWidth: '300px',
          backgroundColor: alert.type === 'success' ? '#d4edda' : '#f8d7da',
          border: `1px solid ${alert.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          color: alert.type === 'success' ? '#155724' : '#721c24',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div className="alert-content d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className={`fas ${
                alert.type === 'success' ? 'fa-check-circle' :
                alert.type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
              } me-2`}></i>
              <span>{alert.message}</span>
            </div>
            <button
              className="alert-close btn btn-sm"
              onClick={() => setAlert({ show: false, type: '', message: '' })}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'inherit',
                padding: '0',
                marginLeft: '10px'
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col-12">
            <div className="card text-white bg-primary shadow-lg">
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-headset me-3"></i>
                      Contact Us
                    </h1>
                    <p className="lead mb-0 opacity-75">
                      Get in touch with our administration team
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <button 
                      className="btn btn-light btn-lg"
                      onClick={() => setShowMessageModal(true)}
                    >
                      <i className="fas fa-paper-plane me-2"></i>Send Message
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-4 mb-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-building me-2"></i>
                  Organization Details
                </h5>
              </div>
              <div className="card-body">
                <div className="contact-info-item mb-3">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-university text-primary me-3 mt-1"></i>
                    <div>
                      <h6 className="fw-bold mb-1">Institution</h6>
                      <p className="mb-0 text-muted">{organizationInfo.name}</p>
                    </div>
                  </div>
                </div>

                <div className="contact-info-item mb-3">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-map-marker-alt text-primary me-3 mt-1"></i>
                    <div>
                      <h6 className="fw-bold mb-1">Address</h6>
                      <p className="mb-0 text-muted">{organizationInfo.address}</p>
                    </div>
                  </div>
                </div>

                <div className="contact-info-item mb-3">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-phone text-primary me-3 mt-1"></i>
                    <div>
                      <h6 className="fw-bold mb-1">Phone</h6>
                      <p className="mb-0 text-muted">{organizationInfo.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="contact-info-item mb-3">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-envelope text-primary me-3 mt-1"></i>
                    <div>
                      <h6 className="fw-bold mb-1">Email</h6>
                      <p className="mb-0 text-muted">{organizationInfo.email}</p>
                    </div>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-clock text-primary me-3 mt-1"></i>
                    <div>
                      <h6 className="fw-bold mb-1">Business Hours</h6>
                      <p className="mb-0 text-muted">{organizationInfo.hours}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="fas fa-history me-2"></i>
                    Message History
                    {sentMessages.length > 0 && (
                      <span className="badge bg-primary ms-2">
                        {sentMessages.length} {sentMessages.length === 1 ? 'Message' : 'Messages'}
                      </span>
                    )}
                  </h5>
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={fetchSentMessages}
                    disabled={loading}
                  >
                    <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`}></i>
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading message history...</p>
                  </div>
                ) : sentMessages.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted">No messages sent yet</h5>
                    <p className="text-muted">Send your first message to the administration team</p>
                  </div>
                ) : (
                  <>
                    <div className="message-history">
                      {currentMessages.map((message) => (
                        <div key={message._id} className="message-item border-bottom pb-3 mb-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="fw-bold text-primary mb-0">{message.subject}</h6>
                            <small className="text-muted">{formatDate(message.createdAt)}</small>
                          </div>
                          <p className="text-muted mb-2">{message.message}</p>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className={`badge ${
                              message.read ? 'bg-success' : 'bg-secondary'
                            }`}>
                              {message.read ? 'Read by Admin' : 'Unread'}
                            </small>
                            {message.reply && (
                              <small className="text-success">
                                <i className="fas fa-reply me-1"></i>Replied
                              </small>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                        {/* Page Info */}
                        <div className="text-muted">
                          Showing {indexOfFirstMessage + 1} to {Math.min(indexOfLastMessage, sentMessages.length)} of {sentMessages.length} messages
                        </div>
                        
                        {/* Pagination */}
                        <nav aria-label="Message pagination">
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

      {showMessageModal && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-paper-plane me-2"></i>
                  Send Message to Admin
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowMessageModal(false)}
                  disabled={sending}
                ></button>
              </div>
              <div className="modal-body">
                {/* ADDED: Phone Number Field */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Enter your phone number..."
                    value={messageForm.phone}
                    onChange={(e) => setMessageForm({...messageForm, phone: e.target.value})}
                    disabled={sending}
                  />
                  <small className="text-muted">
                    Provide your phone number if you'd like the admin to contact you via phone.
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter message subject..."
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                    disabled={sending}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Message</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    placeholder="Type your message here..."
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                    disabled={sending}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMessageModal(false)}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendMessage}
                  disabled={sending || !messageForm.subject.trim() || !messageForm.message.trim()}
                >
                  {sending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactUs;