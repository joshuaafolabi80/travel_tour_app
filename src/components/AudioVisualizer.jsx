import React, { useEffect, useRef, useState } from 'react';

const AudioVisualizer = ({ 
  audioContext, 
  analyser, 
  isSpeaking = false, 
  size = 'medium',
  label = 'Audio Level'
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!analyser || !audioContext) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
      
      setAudioLevel(normalizedLevel);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw audio bars
      const barCount = 7;
      const barWidth = canvas.width / (barCount * 1.5);
      const gap = barWidth / 2;
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = (canvas.height * 0.8) * (normalizedLevel * (i + 1) / barCount);
        const x = i * (barWidth + gap);
        const y = canvas.height - barHeight;
        
        // Gradient based on audio level
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        if (isSpeaking) {
          gradient.addColorStop(0, '#10b981'); // Green when speaking
          gradient.addColorStop(1, '#059669');
        } else {
          gradient.addColorStop(0, '#6b7280'); // Gray when silent
          gradient.addColorStop(1, '#4b5563');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Add rounded corners
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, audioContext, isSpeaking]);

  const getCanvasSize = () => {
    switch (size) {
      case 'small': return { width: 120, height: 40 };
      case 'large': return { width: 200, height: 60 };
      default: return { width: 150, height: 50 };
    }
  };

  const { width, height } = getCanvasSize();

  return (
    <div className="d-flex flex-column align-items-center p-2 bg-light bg-opacity-10 rounded border border-light border-opacity-20">
      <div className="d-flex justify-content-between align-items-center w-100 mb-1">
        <small className="text-muted">{label}</small>
        <div className={`d-flex align-items-center gap-1 ${isSpeaking ? 'text-success fw-semibold' : 'text-secondary'}`}>
          <span 
            className={`rounded-circle ${isSpeaking ? 'bg-success' : 'bg-secondary'}`}
            style={{
              width: '6px',
              height: '6px',
              animation: isSpeaking ? 'pulse 1.5s infinite' : 'none'
            }}
          ></span>
          <small>{isSpeaking ? 'Speaking' : 'Silent'}</small>
        </div>
      </div>
      <div className="rounded overflow-hidden bg-dark bg-opacity-30">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="d-block"
        />
      </div>

      {/* Add pulse animation styles */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.7;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default AudioVisualizer;