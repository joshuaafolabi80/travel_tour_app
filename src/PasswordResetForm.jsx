// src/PasswordResetForm.jsx

import React, { useState } from 'react';
import api from './services/api'; // Assuming your api service is set up correctly
import 'bootstrap/dist/css/bootstrap.min.css';

const PasswordResetForm = ({ onBack, onResetSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setIsLoading(true);

    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'danger' });
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.put('/auth/reset-password', { email, newPassword: password });
      
      if (response.data.success) {
        setMessage({ text: 'Password reset successful! Logging you in...', type: 'success' });
        // Automatically log the user in after successful reset
        onResetSuccess(email, password);
      } else {
        setMessage({ text: response.data.message || 'Failed to reset password. Please try again.', type: 'danger' });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setMessage({ text: 'Failed to reset password. Check your email.', type: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 p-md-5 w-100">
      <div className="text-center mb-4">
        <h2 className="fw-bold">Reset Password</h2>
        <p className="text-muted">Enter your email and a new password to reset it.</p>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            type="email"
            className="form-control"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="newPassword" className="form-label">New Password</label>
          <input
            type="password"
            className="form-control"
            id="newPassword"
            name="newPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter new password"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input
            type="password"
            className="form-control"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
          />
        </div>
        <button type="submit" className="btn btn-primary w-100 py-2 fw-bold mt-2" disabled={isLoading}>
          {isLoading ? 'Resetting...' : 'Reset & Log In'}
        </button>
      </form>
      <div className="text-center mt-3">
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="text-primary text-decoration-none fw-bold">
          Back to Login
        </a>
      </div>
    </div>
  );
};

export default PasswordResetForm;