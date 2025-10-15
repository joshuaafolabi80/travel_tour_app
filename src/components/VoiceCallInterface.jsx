// src/components/VoiceCallInterface.jsx
import React from 'react';
import './VoiceCallInterface.css';

const VoiceCallInterface = ({ 
  participants, 
  isMuted, 
  isVideoOn, 
  onMuteToggle, 
  onVideoToggle,
  currentUserName 
}) => {
  return (
    <div className="voice-call-interface">
      <div className="participants-grid">
        {/* Current User */}
        <div className="participant-card local-participant">
          <div className="participant-video">
            {isVideoOn ? (
              <div className="video-placeholder">
                <i className="fas fa-user"></i>
                <span>Video Feed</span>
              </div>
            ) : (
              <div className="avatar-placeholder">
                <i className="fas fa-user"></i>
              </div>
            )}
            {isMuted && (
              <div className="mute-indicator">
                <i className="fas fa-microphone-slash"></i>
              </div>
            )}
          </div>
          <div className="participant-info">
            <span className="participant-name">{currentUserName} (You)</span>
            <span className="participant-status">
              {isMuted ? 'Muted' : 'Speaking'}
            </span>
          </div>
        </div>

        {/* Other Participants */}
        {participants
          .filter(p => p.name !== currentUserName)
          .map(participant => (
            <div key={participant.id} className="participant-card">
              <div className="participant-video">
                <div className="avatar-placeholder">
                  <i className="fas fa-user"></i>
                </div>
                {participant.isMuted && (
                  <div className="mute-indicator">
                    <i className="fas fa-microphone-slash"></i>
                  </div>
                )}
                {participant.isAdmin && (
                  <div className="admin-indicator">
                    <i className="fas fa-crown"></i>
                  </div>
                )}
              </div>
              <div className="participant-info">
                <span className="participant-name">
                  {participant.name}
                  {participant.isAdmin && <i className="fas fa-crown admin-badge"></i>}
                </span>
                <span className="participant-status">
                  {participant.isMuted ? 'Muted' : 'Active'}
                </span>
              </div>
            </div>
          ))
        }

        {/* Empty slots for potential participants */}
        {participants.length < 4 && (
          <div className="participant-card empty-slot">
            <div className="empty-avatar">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="participant-info">
              <span className="waiting-text">Waiting for participants...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCallInterface;