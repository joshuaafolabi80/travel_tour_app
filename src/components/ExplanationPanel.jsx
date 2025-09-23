// src/components/ExplanationPanel.jsx
import React, { useState } from 'react';
import { explainQuestion } from '../services/geminiService';

const ExplanationPanel = ({ question, correctAnswer }) => {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchExplanation = async () => {
    setLoading(true);
    setError('');
    
    try {
      const explanationText = await explainQuestion(question, correctAnswer);
      setExplanation(explanationText);
    } catch (err) {
      setError('Failed to fetch explanation. Please try again.');
      console.error('Explanation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="explanation-panel">
      <h4>AI Explanation</h4>
      
      {!explanation ? (
        <button 
          onClick={fetchExplanation}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Generating explanation...' : 'Get AI Explanation'}
        </button>
      ) : (
        <div className="explanation-content">
          <p>{explanation}</p>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default ExplanationPanel;