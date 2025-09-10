// src/destinations/DestinationCard.jsx
import React, { useState } from 'react';

const DestinationCard = ({ destination, onSelectDestination }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div 
      className="card h-100 shadow-sm" 
      role="button" 
      onClick={() => onSelectDestination(destination.id)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ height: '200px', overflow: 'hidden' }}>
        <img 
          src={destination.image} 
          alt={destination.name} 
          className="card-img-top h-100 w-100"
          style={{ objectFit: 'cover' }}
          onError={handleImageError}
        />
      </div>
      <div className="card-body text-center d-flex align-items-center justify-content-center">
        <p className="card-text fw-bold mb-0">{destination.name}</p>
      </div>
    </div>
  );
};

export default DestinationCard;