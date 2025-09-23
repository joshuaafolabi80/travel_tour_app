import React, { useState } from 'react';
import PasswordResetForm from './PasswordResetForm';
import 'bootstrap/dist/css/bootstrap.min.css';
import './LoginRegister.css';

const LoginRegister = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    
    if (isLogin) {
      if (!formData.email || !formData.password) {
        setMessage({ text: 'Please enter email and password.', type: 'danger' });
        return;
      }
      onLogin(formData.email, formData.password);
    } else {
      if (formData.password !== formData.confirmPassword) {
        setMessage({ text: "Passwords don't match!", type: 'danger' });
        return;
      }
      if (formData.password.length < 6) {
        setMessage({ text: 'Password must be at least 6 characters long.', type: 'danger' });
        return;
      }
      if (!formData.email || !formData.password || !formData.username) {
        setMessage({ text: 'Please fill all required fields.', type: 'danger' });
        return;
      }
      onRegister({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
    }
  };

  const handleGoogleSignIn = () => {
    setMessage({ text: "Google sign-in would be implemented here.", type: 'info' });
    const googleUser = {
      username: 'Google User',
      email: 'googleuser@example.com',
    };
    onRegister(googleUser);
  };
  
  const togglePasswordReset = () => {
    setIsPasswordReset(true);
  };

  const handleResetSuccess = async (email, password) => {
    // Use the existing login function with the new credentials
    await onLogin(email, password);
  };

  return (
    <div className="container-fluid bg-light d-flex align-items-center justify-content-center min-vh-100 p-3">
      <div className="row g-0 rounded-4 shadow-lg overflow-hidden" style={{ maxWidth: '1000px' }}>
        {/* Left side: Image and text section */}
        <div className="col-lg-6 d-none d-lg-block p-4 position-relative" style={{
          backgroundImage: `url(./images/travelling_and_tour_1.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}>
          <h2 className="display-5 fw-bold text-white text-shadow p-4">Your Journey to New Horizons Awaits</h2>
          <div className="position-absolute bottom-0 start-0 w-100 p-4" style={{
            background: 'rgba(0,0,0,0.4)',
          }}>
            <p className="lead fw-bold text-white text-shadow mb-0">Take flight with us and explore the world of travel and tourism.</p>
          </div>
        </div>

        {/* Right side: Form section */}
        <div className="col-lg-6 bg-white d-flex align-items-center">
          {isPasswordReset ? (
            <PasswordResetForm onBack={() => setIsPasswordReset(false)} onResetSuccess={handleResetSuccess} />
          ) : (
            <div className="p-4 p-md-5 w-100">
              <div className="text-center mb-4">
                <h2 className="fw-bold">{isLogin ? 'Login' : 'Create Account'}</h2>
                <p className="text-muted">
                  {isLogin
                    ? 'Login to your account'
                    : 'Join us to start your journey'
                  }
                </p>
              </div>
              
              {message.text && (
                <div className={`alert alert-${message.type}`} role="alert">
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required={!isLogin}
                      placeholder="Enter your username"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder={isLogin ? "Enter your password" : "Enter password (min 6 characters)"}
                    minLength={!isLogin ? 6 : undefined}
                  />
                </div>

                {!isLogin && (
                  <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required={!isLogin}
                      placeholder="Confirm your password"
                      minLength={6}
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-100 py-2 fw-bold mt-2">
                  {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
                </button>
              </form>
              
              {isLogin && (
                <div className="text-end mt-2">
                  <a href="#" onClick={(e) => { e.preventDefault(); togglePasswordReset(); }} className="text-primary text-decoration-none fw-bold">
                    Forgot Password?
                  </a>
                </div>
              )}
              
              <div className="my-4 text-center">
                <span className="text-muted">Or continue with</span>
              </div>

              <button className="btn btn-outline-secondary w-100 py-2 d-flex align-items-center justify-content-center fw-bold" onClick={handleGoogleSignIn}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="me-2" style={{ width: '20px' }} />
                Sign up with Google
              </button>

              <div className="text-center mt-3">
                <p className="text-muted">
                  {isLogin
                    ? "Don't have an account yet? "
                    : "Already have an account? "
                  }
                  <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }} className="text-primary text-decoration-none fw-bold">
                    {isLogin ? 'Join The Conclave Now!' : 'Sign In'}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginRegister;