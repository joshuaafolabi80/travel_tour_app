import React, { useState } from 'react';
import api from './services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const PasswordResetForm = ({ onBack, onResetSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/reset-password', {
        email,
        newPassword: password
      });

      if (response.data.success) {
        // Call the success handler with email and password for auto-login
        await onResetSuccess(email, password);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(response.data.message || 'Password reset failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error. Please try again.');
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
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
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
            placeholder="Enter new password (min 6 characters)"
            minLength={6}
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
            minLength={6}
          />
        </div>
        <button type="submit" className="btn btn-primary w-100 py-2 fw-bold mt-2" disabled={isLoading}>
          {isLoading ? 'Resetting...' : 'Reset Password'}
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