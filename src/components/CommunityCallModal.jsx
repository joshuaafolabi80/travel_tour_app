import React, { useState, useEffect, useRef } from 'react';
import MessageThread from './MessageThread';
import AudioVisualizer from './AudioVisualizer';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [allMuted, setAllMuted] = useState(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    // Initialize audio context for visualizer
    const initAudio = async () => {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const audioAnalyser = context.createAnalyser();
        audioAnalyser.fftSize = 256;
        
        audioContextRef.current = context;
        analyserRef.current = audioAnalyser;
        
        setAudioContext(context);
        setAnalyser(audioAnalyser);
      } catch (error) {
        console.error('Error initializing audio context:', error);
      }
    };

    if (isOpen) {
      initAudio();
    }

    return () => {
      // Cleanup audio
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isOpen]);

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      
      mediaStreamRef.current = stream;
      setMediaStream(stream);
      
      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        // Simulate speaking detection (in real app, use actual audio analysis)
        const simulateSpeaking = () => {
          setIsSpeaking(prev => !prev);
          setTimeout(simulateSpeaking, Math.random() * 3000 + 1000);
        };
        simulateSpeaking();
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopMicrophone = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      setMediaStream(null);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    if (!isMuted && isOpen) {
      startMicrophone();
    } else {
      stopMicrophone();
    }
  }, [isMuted, isOpen]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log(isMuted ? 'Unmuted' : 'Muted');
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    console.log(isVideoOn ? 'Video stopped' : 'Video started');
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        setIsScreenSharing(true);
        console.log('Screen sharing started');
        
        stream.getTracks().forEach(track => {
          track.onended = () => {
            setIsScreenSharing(false);
            console.log('Screen sharing stopped');
          };
        });
      } catch (error) {
        console.error('Error starting screen share:', error);
      }
    } else {
      setIsScreenSharing(false);
      console.log('Screen sharing stopped');
    }
  };

  const toggleMuteAll = () => {
    setAllMuted(!allMuted);
    // In a real implementation, this would emit a socket event to mute all users
    console.log(allMuted ? 'All users unmuted' : 'All users muted');
  };

  const startVideoSharing = async () => {
    if (!isVideoOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        setIsVideoOn(true);
        console.log('Video sharing started');
        
        // In real implementation, you'd send this stream via WebRTC
      } catch (error) {
        console.error('Error starting video:', error);
      }
    }
  };

  if (!isOpen) return null;

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
              {allMuted && (
                <span className="badge bg-warning text-dark ms-2">
                  <i className="fas fa-volume-mute me-1"></i>
                  All Muted
                </span>
              )}
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
              {/* Audio Visualizers */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <AudioVisualizer
                    audioContext={audioContext}
                    analyser={analyser}
                    isSpeaking={isSpeaking && !isMuted}
                    label="Your Microphone"
                    size="medium"
                  />
                </div>
                <div className="col-md-6">
                  <AudioVisualizer
                    audioContext={audioContext}
                    analyser={analyser}
                    isSpeaking={true} // Simulate admin speaking
                    label="Admin Audio"
                    size="medium"
                  />
                </div>
              </div>

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
                            {isVideoOn && participant.isYou ? (
                              <div className="video-feed-placeholder bg-success rounded">
                                <div className="text-center py-4">
                                  <i className="fas fa-video fa-2x mb-2"></i>
                                  <p className="mb-0 small">Live Video</p>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-circle bg-secondary mx-auto d-flex align-items-center justify-content-center" 
                                   style={{width: '80px', height: '80px'}}>
                                <i className="fas fa-user fa-2x text-light"></i>
                              </div>
                            )}
                            
                            {/* Status Indicators */}
                            {(isMuted && participant.isYou) && (
                              <div className="position-absolute bottom-0 start-50 translate-middle-x">
                                <span className="badge bg-danger">
                                  <i className="fas fa-microphone-slash"></i>
                                </span>
                              </div>
                            )}
                            
                            {(allMuted && !participant.isAdmin && !participant.isYou) && (
                              <div className="position-absolute bottom-0 start-50 translate-middle-x">
                                <span className="badge bg-warning text-dark">
                                  <i className="fas fa-volume-mute"></i>
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

                            {isScreenSharing && participant.isYou && (
                              <div className="position-absolute top-0 end-0">
                                <span className="badge bg-info">
                                  <i className="fas fa-desktop"></i>
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
                              {((isMuted && participant.isYou) || (allMuted && !participant.isAdmin && !participant.isYou)) 
                                ? 'Muted' 
                                : (isSpeaking && participant.isYou && !isMuted) 
                                  ? 'Speaking' 
                                  : 'Connected'
                              }
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
              
              {isAdmin && (
                <button 
                  onClick={startVideoSharing}
                  className={`btn ${isVideoOn ? 'btn-success' : 'btn-secondary'} btn-lg`}
                >
                  <i className={`fas ${isVideoOn ? 'fa-video' : 'fa-video-slash'}`}></i>
                  {isVideoOn ? ' Video On' : ' Start Video'}
                </button>
              )}
              
              <button 
                onClick={toggleScreenShare}
                className={`btn ${isScreenSharing ? 'btn-warning' : 'btn-secondary'} btn-lg`}
              >
                <i className="fas fa-desktop"></i>
                {isScreenSharing ? ' Stop Share' : ' Share Screen'}
              </button>
              
              {isAdmin && (
                <button 
                  onClick={toggleMuteAll}
                  className={`btn ${allMuted ? 'btn-warning' : 'btn-secondary'} btn-lg`}
                >
                  <i className={`fas ${allMuted ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
                  {allMuted ? ' Unmute All' : ' Mute All'}
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