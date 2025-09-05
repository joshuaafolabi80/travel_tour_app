import React, { useState } from 'react';

const LoginRegister = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
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
      // Login logic - For now, just pass to parent
      if (!formData.email || !formData.password) {
        setMessage({ text: 'Please enter email and password.', type: 'danger' });
        return;
      }
      
      // Call parent handler with email and password
      // The actual authentication will be handled by the parent component
      onLogin(formData.email, formData.password);
      
    } else {
      // Registration logic
      if (formData.password !== formData.confirmPassword) {
        setMessage({ text: "Passwords don't match!", type: 'danger' });
        return;
      }
      
      if (!formData.email || !formData.password || !formData.username) {
        setMessage({ text: 'Please fill all required fields.', type: 'danger' });
        return;
      }
      
      // Call parent handler with user data
      onRegister({
        username: formData.username,
        email: formData.email,
        password: formData.password, // In real app, this would be hashed
      });
    }
  };

  const handleGoogleSignIn = () => {
    // Placeholder for Google auth
    setMessage({ text: "Google sign-in would be implemented here.", type: 'info' });
    
    // For demo purposes, simulate a Google user
    const googleUser = {
      username: 'Google User',
      email: 'googleuser@example.com',
    };
    
    // Simulate successful registration with Google
    onRegister(googleUser);
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
          {/* Top text */}
          <h2 className="display-5 fw-bold text-white text-shadow p-4">Your Journey to New Horizons Awaits</h2>
          {/* Bottom text with its own overlay container */}
          <div className="position-absolute bottom-0 start-0 w-100 p-4" style={{
            background: 'rgba(0,0,0,0.4)',
          }}>
            <p className="lead fw-bold text-white text-shadow mb-0">Take flight with us and explore the world of travel and tourism.</p>
          </div>
        </div>

        {/* Right side: Form section */}
        <div className="col-lg-6 bg-white p-4 p-md-5 d-flex align-items-center">
          <div className="w-100">
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
                  placeholder="Enter your password"
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
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary w-100 py-2 fw-bold mt-2">
                {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            </form>

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
        </div>
      </div>
    </div>
  );
};

export default LoginRegister;