// src/components/UserCommunityTab.jsx
import React, { useState, useEffect } from 'react';
import CommunityCallModal from './CommunityCallModal';
import MessageThread from './MessageThread';
import socketService from '../services/socketService';

const UserCommunityTab = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [hasCallNotification, setHasCallNotification] = useState(false);
  const [callParticipants, setCallParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userName, setUserName] = useState('');
  const [activeCallInfo, setActiveCallInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const name = userData.name || userData.username || 'User';
    setUserName(name);

    console.log('🔄 Initializing UserCommunityTab for:', name);

    const socket = socketService.connect();
    
    // Listen for connection
    socket.on('connect', () => {
      console.log('✅ Connected to socket server');
      setIsConnected(true);
      
      // Join the app with user data
      socket.emit('user_join', {
        userId: userData.id,
        userName: name,
        role: userData.role || 'student'
      });
    });

    // Listen for call started by admin
    socket.on('call_started', (data) => {
      console.log('📞 Call started by admin:', data);
      setHasCallNotification(true);
      setActiveCallInfo(data);
      setCurrentCallId(data.callId);
      setIsCallActive(false); // Ensure we're not in active call state
    });

    // Listen for call ended
    socket.on('call_ended', (data) => {
      console.log('📞 Call ended:', data);
      setHasCallNotification(false);
      setIsCallActive(false);
      setActiveCallInfo(null);
      setCurrentCallId(null);
      setCallParticipants([]);
    });

    // Listen for participants updates
    socket.on('call_participants_update', (data) => {
      console.log('📊 Participants updated:', data.participants);
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      // Mark current user as "isYou"
      const participantsWithYou = data.participants.map(participant => ({
        ...participant,
        isYou: participant.userId === userData.id
      }));
      
      setCallParticipants(participantsWithYou);
    });

    // Listen for new messages
    socket.on('new_message', (message) => {
      console.log('💬 New message received:', message);
      setMessages(prev => [...prev, message]);
    });

    // Listen for user joining call
    socket.on('user_joined_call', (data) => {
      console.log(`👤 ${data.userName} joined the call`);
    });

    // Listen for user leaving call
    socket.on('user_left_call', (data) => {
      console.log(`👤 ${data.userName} left the call`);
    });

    // Listen for errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up UserCommunityTab socket listeners');
      socket.off('connect');
      socket.off('call_started');
      socket.off('call_ended');
      socket.off('call_participants_update');
      socket.off('new_message');
      socket.off('user_joined_call');
      socket.off('user_left_call');
      socket.off('error');
    };
  }, []);

  const joinCall = () => {
    const socket = socketService.getSocket();
    
    if (!socket || !currentCallId) {
      console.error('❌ No active call to join - socket:', !!socket, 'callId:', currentCallId);
      return;
    }

    console.log('🎯 Joining call:', currentCallId);
    
    // Emit join call event
    socket.emit('join_call', { 
      callId: currentCallId 
    });
    
    setIsCallActive(true);
    setHasCallNotification(false);
    
    // Add current user to local participants immediately for better UX
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const currentUser = {
      id: userData.id,
      userId: userData.id,
      userName: userData.name || userData.username || 'User',
      isMuted: false,
      isAdmin: userData.role === 'admin',
      isYou: true,
      role: userData.role || 'student'
    };
    
    setCallParticipants(prev => {
      const exists = prev.some(p => p.userId === currentUser.userId);
      if (!exists) {
        return [...prev, currentUser];
      }
      return prev;
    });
  };

  const leaveCall = () => {
    const socket = socketService.getSocket();
    
    if (socket && currentCallId) {
      console.log('🚪 Leaving call:', currentCallId);
      socket.emit('leave_call', { callId: currentCallId });
    }
    
    setIsCallActive(false);
    setCurrentCallId(null);
    setCallParticipants([]);
    setActiveCallInfo(null);
    setHasCallNotification(false);
  };

  const addMessage = (message) => {
    const socket = socketService.getSocket();
    if (socket) {
      console.log('📤 Sending message:', message);
      socket.emit('send_message', {
        text: message,
        callId: currentCallId
      });
    } else {
      console.error('❌ Cannot send message - socket not connected');
    }
  };

  const dismissNotification = () => {
    setHasCallNotification(false);
    setActiveCallInfo(null);
  };

  console.log('🔍 Current state:', {
    isCallActive,
    hasCallNotification,
    currentCallId,
    activeCallInfo,
    callParticipants: callParticipants.length,
    messages: messages.length,
    isConnected
  });

  return (
    <div className="container-fluid py-3">
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="card-title h4 mb-2">Community Hub</h2>
              <p className="text-muted mb-0">Connect with other learners and admins</p>
              <div className="mt-2">
                <small className={`badge ${isConnected ? 'bg-success' : 'bg-warning'}`}>
                  {isConnected ? '🟢 Connected' : '🟡 Connecting...'}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="card bg-light">
              <div className="card-body py-2">
                <small className="text-muted">
                  <strong>Debug:</strong> Call: {currentCallId ? '✅' : '❌'} | 
                  Notification: {hasCallNotification ? '🔔' : '🔕'} | 
                  Active: {isCallActive ? '🎙️' : '💤'} | 
                  Participants: {callParticipants.length}
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Notification */}
      {hasCallNotification && !isCallActive && activeCallInfo && (
        <div className="row mt-3">
          <div className="col-12">
            <div className="alert alert-warning alert-dismissible fade show" role="alert">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <i className="fas fa-phone-volume fa-2x me-3 text-warning"></i>
                  <div>
                    <strong className="h5 mb-1">{activeCallInfo.adminName} is starting a community call!</strong>
                    <p className="mb-1">{activeCallInfo.message}</p>
                    <small className="text-muted">
                      Started: {new Date(activeCallInfo.startTime).toLocaleTimeString()}
                    </small>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button 
                    onClick={joinCall} 
                    className="btn btn-success btn-lg px-4"
                  >
                    <i className="fas fa-phone me-2"></i>
                    Join Call
                  </button>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={dismissNotification}
                    aria-label="Close"
                  ></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Info */}
      {isCallActive && currentCallId && (
        <div className="row mt-3">
          <div className="col-12">
            <div className="alert alert-info">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <i className="fas fa-phone fa-2x me-3 text-info"></i>
                  <div>
                    <strong className="h5 mb-1">You're in the community call</strong>
                    <p className="mb-1">Connected with {callParticipants.length} participant(s)</p>
                  </div>
                </div>
                <button 
                  onClick={leaveCall} 
                  className="btn btn-outline-danger"
                >
                  <i className="fas fa-phone-slash me-2"></i>
                  Leave Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isCallActive ? (
        <div className="row mt-3">
          {/* Message Thread */}
          <div className="col-12 col-lg-8 mb-3">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h3 className="h5 mb-0">Community Chat</h3>
                <span className="badge bg-primary">
                  {messages.length} messages
                </span>
              </div>
              <div className="card-body d-flex flex-column p-0">
                <MessageThread 
                  messages={messages}
                  onSendMessage={addMessage}
                  currentUser={userName}
                  isAdmin={false}
                />
              </div>
            </div>
          </div>

          {/* Community Info & Active Calls */}
          <div className="col-12 col-lg-4">
            {/* Active Calls Info */}
            {hasCallNotification && activeCallInfo && !isCallActive && (
              <div className="card border-warning mb-3">
                <div className="card-header bg-warning text-dark">
                  <h4 className="h6 mb-0">
                    <i className="fas fa-bell me-2"></i>
                    Active Call Available
                  </h4>
                </div>
                <div className="card-body">
                  <p className="mb-2">
                    <strong>{activeCallInfo.adminName}</strong> is hosting a call.
                  </p>
                  <button 
                    onClick={joinCall} 
                    className="btn btn-success w-100"
                  >
                    <i className="fas fa-phone me-2"></i>
                    Join Call Now
                  </button>
                  <button 
                    onClick={dismissNotification}
                    className="btn btn-outline-secondary w-100 mt-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Community Features */}
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h3 className="h5 mb-0">Community Features</h3>
              </div>
              <div className="card-body">
                <ul className="list-unstyled mb-0">
                  <li className="mb-3 p-2 border rounded">
                    <i className="fas fa-comments text-primary me-2"></i>
                    <strong>Real-time Text Chat</strong>
                    <p className="small text-muted mb-0 mt-1">
                      Chat with other learners and admins in real-time
                    </p>
                  </li>
                  <li className="mb-3 p-2 border rounded">
                    <i className="fas fa-phone text-primary me-2"></i>
                    <strong>Voice Calls</strong>
                    <p className="small text-muted mb-0 mt-1">
                      Join community calls started by admins
                    </p>
                  </li>
                  <li className="mb-3 p-2 border rounded">
                    <i className="fas fa-users text-primary me-2"></i>
                    <strong>Connect with Learners</strong>
                    <p className="small text-muted mb-0 mt-1">
                      Network with other students in your courses
                    </p>
                  </li>
                  <li className="p-2 border rounded">
                    <i className="fas fa-question-circle text-primary me-2"></i>
                    <strong>Get Help</strong>
                    <p className="small text-muted mb-0 mt-1">
                      Ask questions and get support from admins
                    </p>
                  </li>
                </ul>
              </div>
            </div>

            {/* No Active Calls Message */}
            {!hasCallNotification && !isCallActive && (
              <div className="card border-secondary mt-3">
                <div className="card-body text-center py-4">
                  <i className="fas fa-phone-slash fa-2x text-muted mb-3"></i>
                  <h5 className="text-muted">No Active Calls</h5>
                  <p className="small text-muted mb-0">
                    When an admin starts a call, you'll see a notification here to join.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CommunityCallModal
          isOpen={isCallActive}
          onClose={leaveCall}
          participants={callParticipants}
          messages={messages}
          onSendMessage={addMessage}
          isAdmin={false}
          currentUserName={userName}
        />
      )}
    </div>
  );
};

export default UserCommunityTab;