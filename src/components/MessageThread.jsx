// src/components/MessageThread.jsx
import React, { useState, useRef, useEffect } from 'react';

const MessageThread = ({ 
  messages, 
  onSendMessage, 
  currentUser, 
  isAdmin,
  compact = false 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`d-flex flex-column h-100 ${compact ? 'border-0' : ''}`}>
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Community Chat</h6>
        {!compact && <span className="badge bg-primary">{messages.length}</span>}
      </div>
      
      <div className="card-body flex-grow-1 overflow-auto p-3" style={{maxHeight: compact ? '300px' : '400px'}}>
        {messages.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="fas fa-comments fa-2x mb-2"></i>
            <p className="mb-0">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id}
              className={`mb-2 ${message.sender === currentUser ? 'text-end' : ''}`}
            >
              <div 
                className={`d-inline-block p-2 rounded ${
                  message.sender === currentUser 
                    ? 'bg-primary text-white' 
                    : message.isAdmin 
                    ? 'bg-warning text-dark border'
                    : 'bg-light text-dark'
                }`}
                style={{maxWidth: '80%'}}
              >
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <small className="fw-bold">
                    {message.sender}
                    {message.isAdmin && <i className="fas fa-crown ms-1"></i>}
                  </small>
                  <small className="opacity-75 ms-2">
                    {formatTime(message.timestamp)}
                  </small>
                </div>
                <div className="text-break">
                  {message.text}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="card-footer border-top-0">
        <form onSubmit={handleSendMessage}>
          <div className="input-group">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="form-control"
            />
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageThread;