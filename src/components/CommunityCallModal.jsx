// src/components/CommunityCallModal.jsx
import React, { useState, useEffect } from 'react';
import MessageThread from './MessageThread';

const CommunityCallModal = ({ 
  isOpen, 
  onClose, 
  participants, 
  messages, 
  onSendMessage, 
  isAdmin,
  onAddParticipant,
  currentUserName 
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    // Simulate users joining the call
    if (isAdmin && participants.length === 1) {
      const timer = setTimeout(() => {
        if (onAddParticipant) {
          onAddParticipant({ name: 'Student 1' });
        }
      }, 2000);
      
      const timer2 = setTimeout(() => {
        if (onAddParticipant) {
          onAddParticipant({ name: 'Student 2' });
        }
      }, 4000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [isAdmin, participants.length, onAddParticipant]);

  if (!isOpen) return null;

  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log(isMuted ? 'Unmuted' : 'Muted');
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    console.log(isVideoOn ? 'Video stopped' : 'Video started');
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    console.log(isScreenSharing ? 'Screen share stopped' : 'Screen share started');
  };

  return (
    <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.8)'}} tabIndex="-1">
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content bg-dark text-white">
          {/* Header */}
          <div className="modal-header border-secondary">
            <div className="d-flex align-items-center">
              <h5 className="modal-title me-3">Community Call</h5>
              <span className="badge bg-primary">
                <i className="fas fa-users me-1"></i>
                {participants.length} participants
              </span>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
            ></button>
          </div>

          {/* Main Content */}
          <div className="modal-body d-flex flex-column flex-md-row p-0">
            {/* Video/Audio Area */}
            <div className="flex-grow-1 p-3 d-flex flex-column">
              <div className="flex-grow-1 bg-black rounded position-relative">
                {/* Participants Grid */}
                <div className="row g-2 h-100 p-2">
                  {participants.map((participant, index) => (
                    <div 
                      key={participant.id} 
                      className={`col-12 ${participants.length > 1 ? 'col-md-6' : ''} ${participants.length > 2 ? 'col-lg-4' : ''}`}
                    >
                      <div className={`card h-100 ${participant.isYou ? 'border-primary' : 'border-secondary'}`}>
                        <div className="card-body text-center d-flex flex-column justify-content-center bg-dark">
                          {/* Video/Audio Placeholder */}
                          <div className="position-relative mb-2">
                            <div className="rounded-circle bg-secondary mx-auto d-flex align-items-center justify-content-center" 
                                 style={{width: '80px', height: '80px'}}>
                              <i className="fas fa-user fa-2x text-light"></i>
                            </div>
                            
                            {/* Status Indicators */}
                            {isMuted && participant.isYou && (
                              <div className="position-absolute bottom-0 start-50 translate-middle-x">
                                <span className="badge bg-danger">
                                  <i className="fas fa-microphone-slash"></i>
                                </span>
                              </div>
                            )}
                            
                            {participant.isAdmin && (
                              <div className="position-absolute top-0 start-0">
                                <span className="badge bg-warning text-dark">
                                  <i className="fas fa-crown"></i>
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Participant Info */}
                          <div>
                            <h6 className="mb-0">
                              {participant.name}
                              {participant.isYou && <span className="text-info"> (You)</span>}
                            </h6>
                            <small className="text-muted">
                              {isMuted && participant.isYou ? 'Muted' : 'Connected'}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots for demonstration */}
                  {participants.length < 3 && Array.from({length: 3 - participants.length}).map((_, index) => (
                    <div key={`empty-${index}`} className="col-12 col-md-6 col-lg-4">
                      <div className="card h-100 border-dashed border-secondary">
                        <div className="card-body text-center d-flex flex-column justify-content-center bg-dark">
                          <div className="text-muted">
                            <i className="fas fa-user-plus fa-2x mb-2"></i>
                            <p className="mb-0">Waiting for participant...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat Section */}
            <div className="border-start border-secondary" style={{width: '100%', maxWidth: '400px'}}>
              <div className="d-flex flex-column h-100">
                <MessageThread
                  messages={messages}
                  onSendMessage={onSendMessage}
                  currentUser={currentUserName}
                  isAdmin={isAdmin}
                  compact={true}
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="modal-footer border-secondary justify-content-center">
            <div className="d-flex flex-wrap justify-content-center gap-2">
              <button 
                onClick={toggleMute}
                className={`btn ${isMuted ? 'btn-danger' : 'btn-secondary'} btn-lg`}
              >
                <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                {isMuted ? ' Unmute' : ' Mute'}
              </button>
              
              <button 
                onClick={toggleVideo}
                className={`btn ${isVideoOn ? 'btn-danger' : 'btn-secondary'} btn-lg`}
              >
                <i className={`fas ${isVideoOn ? 'fa-video-slash' : 'fa-video'}`}></i>
                {isVideoOn ? ' Stop Video' : ' Start Video'}
              </button>
              
              <button 
                onClick={toggleScreenShare}
                className={`btn ${isScreenSharing ? 'btn-warning' : 'btn-secondary'} btn-lg`}
              >
                <i className="fas fa-desktop"></i>
                {isScreenSharing ? ' Stop Share' : ' Share Screen'}
              </button>
              
              {isAdmin && (
                <button className="btn btn-warning btn-lg">
                  <i className="fas fa-volume-mute"></i>
                  Mute All
                </button>
              )}
              
              <button onClick={onClose} className="btn btn-danger btn-lg">
                <i className="fas fa-phone-slash"></i>
                Leave Call
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityCallModal;