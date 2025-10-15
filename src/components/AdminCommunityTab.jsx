// src/components/AdminCommunityTab.jsx
import React, { useState, useEffect } from 'react';
import CommunityCallModal from './CommunityCallModal';
import MessageThread from './MessageThread';
import socketService from '../services/socketService';

const AdminCommunityTab = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [callParticipants, setCallParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActiveCall, setHasActiveCall] = useState(false);

  useEffect(() => {
    const socket = socketService.connect();
    
    // Listen for call participants updates
    socket.on('call_participants_update', (data) => {
      console.log('📊 Participants updated:', data.participants);
      setCallParticipants(data.participants);
    });

    // Listen for new messages
    socket.on('new_message', (message) => {
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

    // Cleanup on unmount
    return () => {
      socket.off('call_participants_update');
      socket.off('new_message');
      socket.off('user_joined_call');
      socket.off('user_left_call');
    };
  }, []);

  // Initialize call
  const startCall = async () => {
    setIsLoading(true);
    try {
      const socket = socketService.getSocket();
      
      if (!socket) {
        console.error('Socket not connected');
        return;
      }

      console.log('Admin starting community call...');
      
      // Emit event to start call
      socket.emit('admin_start_call', {
        timestamp: new Date()
      });

      // Set local state
      setIsCallActive(true);
      setHasActiveCall(true);
      
      // Add admin as first participant
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      setCallParticipants([{
        id: userData.id,
        name: userData.name || userData.username || 'Admin',
        isMuted: false,
        isAdmin: true,
        isYou: true
      }]);
      
    } catch (error) {
      console.error('Error starting call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // End call
  const endCall = () => {
    const socket = socketService.getSocket();
    if (socket && currentCallId) {
      socket.emit('admin_end_call', { callId: currentCallId });
    }
    
    setIsCallActive(false);
    setCurrentCallId(null);
    setCallParticipants([]);
    setHasActiveCall(false);
  };

  // Add message to thread
  const addMessage = (message) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('send_message', {
        text: message,
        callId: currentCallId
      });
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="card-title h4 mb-2">Community Hub</h2>
              <p className="text-muted mb-4">Connect with all users in real-time</p>
              {hasActiveCall && (
                <div className="alert alert-info mb-0">
                  <i className="fas fa-broadcast-tower me-2"></i>
                  <strong>Live Call Active!</strong> Users can join your community call.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isCallActive ? (
        <div className="row mt-3">
          {/* Call Initiation Card */}
          <div className="col-12 col-lg-6 mb-3">
            <div className="card bg-primary text-white h-100">
              <div className="card-body text-center d-flex flex-column">
                <div className="mb-3">
                  <i className="fas fa-users fa-3x"></i>
                </div>
                <h3 className="h5">Start Community Call</h3>
                <p className="flex-grow-1">Initiate a call that all registered users can join. You'll be the moderator.</p>
                <button 
                  onClick={startCall}
                  disabled={isLoading}
                  className="btn btn-light btn-lg mt-auto"
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin me-2"></i>
                      Starting Call...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-phone me-2"></i>
                      Start Community Call
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Message Thread */}
          <div className="col-12 col-lg-6">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <MessageThread 
                  messages={messages}
                  onSendMessage={addMessage}
                  currentUser="Admin"
                  isAdmin={true}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CommunityCallModal
          isOpen={isCallActive}
          onClose={endCall}
          participants={callParticipants}
          messages={messages}
          onSendMessage={addMessage}
          isAdmin={true}
          currentUserName="Admin"
        />
      )}
    </div>
  );
};

export default AdminCommunityTab;