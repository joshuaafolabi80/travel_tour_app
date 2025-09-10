// src/destinations/DestinationsPage.jsx
import React from 'react';
import { destinations } from '../data/destinationsData';
import DestinationCard from './DestinationCard';

const groupDestinationsByContinent = (destinations) => {
  return destinations.reduce((acc, destination) => {
    const { continent } = destination;
    if (!acc[continent]) {
      acc[continent] = [];
    }
    acc[continent].push(destination);
    return acc;
  }, {});
};

const DestinationsPage = ({ onSelectDestination }) => {
  const groupedDestinations = groupDestinationsByContinent(destinations);

  return (
    <div className="container-fluid py-4">
      {/* Page Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="h3 mb-0 fw-bold text-primary">Our Destinations</h2>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item"><a href="#" className="text-decoration-none">Home</a></li>
                <li className="breadcrumb-item active" aria-current="page">Destinations</li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="row mb-4">
        <div className="col-12 col-md-8 col-lg-6 mx-auto">
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0">
              <i className="fas fa-search text-muted"></i>
            </span>
            <input 
              type="text" 
              className="form-control border-start-0" 
              placeholder="Search destinations..." 
            />
          </div>
        </div>
      </div>

      {/* Destinations by Continent */}
      <div className="row">
        <div className="col-12">
          {Object.keys(groupedDestinations).map(continent => (
            <div key={continent} className="mb-5">
              {/* Continent Header */}
              <div className="d-flex align-items-center mb-3">
                <i className="fas fa-globe-americas text-primary me-2 fs-4"></i>
                <h3 className="h4 mb-0 fw-semibold text-dark">{continent}</h3>
              </div>

              {/* Destinations Grid */}
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">
                {groupedDestinations[continent].map(destination => (
                  <div key={destination.id} className="col">
                    <DestinationCard
                      destination={destination}
                      onSelectDestination={onSelectDestination}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No destinations message */}
      {Object.keys(groupedDestinations).length === 0 && (
        <div className="row">
          <div className="col-12 text-center py-5">
            <i className="fas fa-map-marker-alt fa-3x text-muted mb-3"></i>
            <h4 className="text-muted">No destinations available</h4>
            <p className="text-muted">Check back later for new destinations.</p>
          </div>
        </div>
      )}

      {/* Business Promo Section */}
      <div className="row mt-5">
        <div className="col-12">
          <div className="bg-secondary bg-opacity-25 p-4 rounded position-relative overflow-hidden border">
            {/* Dark overlay */}
            <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-10"></div>
            
            <div className="position-relative z-1 text-center">
              <h4 className="mb-3 fw-semibold text-dark">Want to learn more about the Business side of travel?</h4>
              <p className="mb-0 fs-5 text-dark">
                Check out our{' '}
                <span 
                  className="text-warning fw-semibold" 
                  style={{ textDecoration: 'underline', cursor: 'pointer' }}
                  onMouseOver={(e) => e.target.style.color = '#ff8c00'}
                  onMouseOut={(e) => e.target.style.color = '#ffc107'}
                >
                  Business course page
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationsPage;