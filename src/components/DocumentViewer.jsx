// src/components/DocumentViewer.jsx
import React, { useState, useEffect } from 'react';

const DocumentViewer = ({ documentUrl, fileName, title, onClose, onDownload, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setLoading(false);
      return;
    }

    // Simulate loading for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [documentUrl]);

  const getFileExtension = () => {
    return fileName.split('.').pop().toLowerCase();
  };

  const renderDocument = () => {
    const fileExtension = getFileExtension();

    switch (fileExtension) {
      case 'pdf':
        return (
          <iframe
            src={documentUrl}
            title={title}
            width="100%"
            height="100%"
            style={{ border: 'none', minHeight: '70vh' }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Failed to load PDF document');
              setLoading(false);
            }}
          />
        );

      case 'docx':
      case 'doc':
        return (
          <div className="text-center py-5">
            <i className="fas fa-file-word fa-4x text-primary mb-3"></i>
            <h4>Word Document</h4>
            <p className="text-muted mb-4">
              For the best viewing experience, please download the document and open it in Microsoft Word or compatible software.
            </p>
            <div className="d-flex gap-3 justify-content-center">
              <button className="btn btn-primary" onClick={onDownload}>
                <i className="fas fa-download me-2"></i>Download Document
              </button>
              <button className="btn btn-outline-secondary" onClick={onBack}>
                <i className="fas fa-arrow-left me-2"></i>Back to Preview
              </button>
            </div>
          </div>
        );

      case 'txt':
        return (
          <iframe
            src={documentUrl}
            title={title}
            width="100%"
            height="100%"
            style={{ border: 'none', minHeight: '70vh' }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Failed to load text document');
              setLoading(false);
            }}
          />
        );

      default:
        return (
          <div className="text-center py-5">
            <i className="fas fa-file fa-4x text-warning mb-3"></i>
            <h4>Unsupported File Type</h4>
            <p className="text-muted mb-4">
              This file type (.{fileExtension}) cannot be viewed directly in the app. 
              Please download the file to view it with appropriate software.
            </p>
            <div className="d-flex gap-3 justify-content-center">
              <button className="btn btn-primary" onClick={onDownload}>
                <i className="fas fa-download me-2"></i>Download File
              </button>
              <button className="btn btn-outline-secondary" onClick={onBack}>
                <i className="fas fa-arrow-left me-2"></i>Back to Preview
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content">
          <div className="modal-header bg-dark text-white">
            <h5 className="modal-title">
              <i className="fas fa-file-alt me-2"></i>
              {title}
            </h5>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-light btn-sm"
                onClick={onDownload}
              >
                <i className="fas fa-download me-1"></i>Download
              </button>
              <button
                className="btn btn-outline-light btn-sm"
                onClick={onBack}
              >
                <i className="fas fa-arrow-left me-1"></i>Back
              </button>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                style={{ 
                  margin: '8px 12px', 
                  padding: '10px 16px', 
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
              ></button>
            </div>
          </div>
          
          <div className="modal-body bg-white" style={{ overflowY: 'auto' }}>
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading document...</span>
                </div>
                <h4 className="text-primary">Loading Document...</h4>
                <p className="text-muted">Please wait while we prepare your document for viewing.</p>
              </div>
            )}
            
            {error && (
              <div className="alert alert-danger text-center">
                <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <h4>Error Loading Document</h4>
                <p>{error}</p>
                <div className="d-flex gap-2 justify-content-center">
                  <button className="btn btn-primary" onClick={onDownload}>
                    <i className="fas fa-download me-2"></i>Download Instead
                  </button>
                  <button className="btn btn-secondary" onClick={onBack}>
                    <i className="fas fa-arrow-left me-2"></i>Go Back
                  </button>
                </div>
              </div>
            )}
            
            {!loading && !error && renderDocument()}
          </div>
          
          <div className="modal-footer bg-dark">
            <small className="text-white-50 me-auto">
              File: {fileName}
            </small>
            <button
              className="btn btn-outline-light"
              onClick={onBack}
            >
              <i className="fas fa-arrow-left me-2"></i>Back to Preview
            </button>
            <button
              className="btn btn-light"
              onClick={onDownload}
            >
              <i className="fas fa-download me-2"></i>Download
            </button>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{ 
                margin: '8px 12px', 
                padding: '10px 16px', 
                borderRadius: '4px' 
              }}
            >
              <i className="fas fa-times me-2"></i>Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;