// src/destinations/DestinationCard.jsx
import React from 'react';

const DestinationCard = ({ destination, onSelectDestination }) => {
  return (
    <div 
      className="card h-100 shadow-sm" 
      role="button" 
      onClick={() => onSelectDestination(destination.id)}
    >
      <img 
        src={destination.image} 
        alt={destination.name} 
        className="card-img-top" 
      />
      <div className="card-body text-center">
        <p className="card-text fw-bold">{destination.name}</p>
      </div>
    </div>
  );
};

export default DestinationCard;
