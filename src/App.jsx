// src/App.jsx
import React, { useState, useEffect } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { jwtDecode } from 'jwt-decode';
import api from './services/api';
import LoginRegister from './LoginRegister';
import DestinationsPage from './destinations/DestinationsPage';
import DestinationOverview from './destinations/DestinationOverview';
import FullCourseContent from './destinations/FullCourseContent';
import './App.css';

// Reusable Slider Component for both Splash Screen and Home Page
const HeroSlider = ({ images, texts, staticTitle, onLastSlide, onNextClick, isHomepage = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  const handleNextClickInternal = () => {
    if (currentIndex === images.length - 1) {
      if (onNextClick) {
        onNextClick();
      }
    } else {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }
  };

  return (
    <div className={`hero-slider-section ${isHomepage ? 'homepage-slider' : ''}`}>
      <TransitionGroup className="carousel-wrapper">
        <CSSTransition
          key={currentIndex}
          timeout={1000}
          classNames="slide-bg"
        >
          <div
            className="carousel-image"
            style={{ backgroundImage: `url(${images[currentIndex]})` }}
          >
            <div className="carousel-overlay">
              <p className="carousel-text">{texts[currentIndex]}</p>
              {staticTitle && (
                <h2 className="carousel-title">{staticTitle}</h2>
              )}
            </div>
          </div>
        </CSSTransition>
      </TransitionGroup>
      {onLastSlide && (
        <div className="splash-controls">
          <div className="splash-indicators">
            {images.map((_, index) => (
              <span
                key={index}
                className={`splash-indicator ${
                  currentIndex === index ? 'active' : ''
                }`}
              ></span>
            ))}
          </div>
          <button
            onClick={handleNextClickInternal}
            className="splash-button primary-button"
          >
            {currentIndex === images.length - 1 ? 'START' : 'NEXT'}
          </button>
        </div>
      )}
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = () => {
  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      <div className="admin-stats">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p>1,243</p>
        </div>
        <div className="stat-card">
          <h3>Active Courses</h3>
          <p>27</p>
        </div>
        <div className="stat-card">
          <h3>Revenue</h3>
          <p>$12,589</p>
        </div>
      </div>
      <div className="recent-activities">
        <h3>Recent Activities</h3>
        <ul>
          <li>User John Doe registered for "Advanced Tourism" course</li>
          <li>New webinar scheduled for next Friday</li>
          <li>5 new users joined in the last 24 hours</li>
        </ul>
      </div>
    </div>
  );
};

const splashImages = [
  "/images/travelling_and_tour_1.jpg",
  "/images/travelling_and_tour_2.jpg",
  "/images/travelling_and_tour_3.jpg",
  "/images/travelling_and_tour_4.jpg",
  "/images/travelling_and_tour_5.jpg"
];

const splashTexts = [
  "Variety of learning modules among destinations, sightseeing attractions, business skills and much more",
  "FREE LIVE Trainings organized by industry experts, from the comfort of your office/ home.",
  "Audio-Visual tutorials and introductory videos will make your learning experience par excellence",
  "Explore personalized learning paths designed to fit your unique travel and tourism career goals.",
  "Connect with a vibrant community of travel enthusiasts and industry professionals."
];

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userData, setUserData] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Function to validate tokens using jwt-decode
  const validateToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      // Check if token is expired
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      const decoded = validateToken(token);
      if (decoded) {
        setIsLoggedIn(true);
        setUserRole(decoded.role);
        setUserData(decoded);
        setShowSplash(false); // Skip splash if already logged in
      } else {
        localStorage.removeItem('authToken');
        setShowSplash(true); // Show splash if token is invalid
      }
    }
  }, []);

  const handleStartClick = () => {
    setShowSplash(false);
  };

  const handleSkipClick = () => {
    setShowSplash(false);
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('authToken', token);
        setAuthToken(token);
        setUserData(user);

        // Display success alert immediately
        setAlert({ type: 'success', message: 'Login successful! Redirecting...' });
        
        // Wait 2 seconds before redirecting to allow the user to see the message
        setTimeout(() => {
          setIsLoggedIn(true);
          setUserRole(user.role);
          if (user.role === 'admin') {
            setCurrentPage('admin-dashboard');
          } else {
            setCurrentPage('home');
          }
          setAlert({ type: '', message: '' }); // Clear the alert
        }, 2000); // 2000 milliseconds = 2 seconds

      }
    } catch (error) {
      console.error('Login error:', error);
      // Show error alert immediately
      setAlert({ type: 'error', message: 'Login failed. Please check your credentials.' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000); // Hide after 5 seconds
    }
  };

  const handleRegister = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('authToken', token);
        setAuthToken(token);
        setUserData(user);

        // Display success alert immediately
        setAlert({ type: 'success', message: 'Registration successful! Redirecting...' });
        
        // Wait 2 seconds before redirecting
        setTimeout(() => {
          setIsLoggedIn(true);
          setUserRole(user.role);
          if (user.role === 'admin') {
            setCurrentPage('admin-dashboard');
          } else {
            setCurrentPage('home');
          }
          setAlert({ type: '', message: '' }); // Clear the alert
        }, 2000);

      }
    } catch (error) {
      console.error('Registration error:', error);
      // Show error alert immediately
      setAlert({ type: 'error', message: 'Registration failed. Please try again.' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setUserData(null);
    setIsLoggedIn(false);
    setUserRole('');
    setCurrentPage('home');
    setShowMenu(false);
    setShowSplash(true); 
  };

  const handleSelectDestination = async (destinationId) => {
    setCurrentPage('loading');
    try {
      const response = await api.get(`/courses/${destinationId}`);
      if (response.data.success) {
        setSelectedCourse(response.data.course);
        setCurrentPage('destination-overview');
      } else {
        setAlert({ type: 'error', message: 'Could not find course details.' });
        setCurrentPage('destinations');
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to fetch course data.' });
      setCurrentPage('destinations');
    }
  };

  const handleStartCourse = () => {
    setCurrentPage('full-course-content');
  };

  const handleTakeQuiz = () => {
    setCurrentPage('quiz'); // You'll build this page later
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const navigateTo = (page, action) => {
    if (action) {
      action();
    } else {
      setCurrentPage(page);
      setShowMenu(false);
    }
  };

  const menuItems = [
    { name: "Webinar Registration", icon: "fa-solid fa-calendar-alt" },
    { name: "Whatsapp Chat", icon: "fa-brands fa-whatsapp" },
    { name: "Privacy and Policy", icon: "fa-solid fa-shield-alt" },
    { name: "Terms and Conditions", icon: "fa-solid fa-file-contract" },
    { name: "Disclaimer", icon: "fa-solid fa-exclamation-triangle" },
    { name: "Rate Our App", icon: "fa-solid fa-star" },
    { name: "Share Our App", icon: "fa-solid fa-share-alt" },
    ...(isLoggedIn ? [{ name: "Logout", icon: "fa-solid fa-sign-out-alt", action: handleLogout }] : []),
    { name: "Exit", icon: "fa-solid fa-times-circle" },
  ];

  return (
    <div className="app-container">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />

      {showSplash ? (
        <div className="splash-screen-wrapper">
          <div className="splash-content">
            <HeroSlider
              images={splashImages}
              texts={splashTexts}
              onLastSlide={true}
              onNextClick={handleStartClick}
            />
            <div className="splash-skip-container">
              <button onClick={handleSkipClick} className="splash-skip-button">
                SKIP
              </button>
            </div>
          </div>
        </div>
      ) : isLoggedIn ? (
        <div className="main-app-content">
          <header className="app-header">
            <button className="hamburger-menu-icon" onClick={toggleMenu}>
              <i className="fas fa-bars"></i>
            </button>
            <div className="desktop-nav">
              {menuItems.map((item) => (
                <button key={item.name} className="desktop-nav-item" onClick={() => navigateTo(item.name.toLowerCase().replace(/\s/g, ''), item.action)}>
                  <i className={item.icon}></i>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
            <div className="header-logo-container">
              <img src="https://placehold.co/120x40/ff6f00/ffffff?text=TCTTTA" alt="Logo" className="header-logo" />
            </div>
            <div className="header-right-spacer"></div>
          </header>
          <CSSTransition
            in={showMenu}
            timeout={300}
            classNames="menu"
            unmountOnExit
          >
            <div className="mobile-dropdown-menu">
              <div className="mobile-menu-header">
                <button className="mobile-menu-close" onClick={toggleMenu}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="mobile-menu-title-container">
                <h1 className="mobile-menu-title">
                  The Conclave Academy
                </h1>
              </div>
              <ul className="mobile-menu-list">
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => navigateTo(item.name.toLowerCase().replace(/\s/g, ''), item.action)}
                      className="mobile-menu-item"
                    >
                      <i className={item.icon}></i>
                      <span>{item.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </CSSTransition>
          <main className="main-content-area">
            {currentPage === 'home' && (
              <div className="home-page-container">
                <div className="homepage-hero">
                  <HeroSlider
                    images={splashImages}
                    texts={splashTexts}
                    staticTitle="The Conclave Academy"
                    isHomepage={true}
                  />
                  <div className="hero-content">
                    <h2 className="hero-subtitle"></h2>
                    <button className="hero-cta-button">
                      Get Certified Today!
                    </button>
                  </div>
                </div>
                <div className="navigation-grid">
                  <div className="nav-grid-item" onClick={() => navigateTo('destinations')}>
                    <i className="fas fa-umbrella-beach nav-icon"></i>
                    <span className="nav-text">Destinations</span>
                  </div>
                  <div className="nav-grid-item">
                    <i className="fas fa-hotel nav-icon"></i>
                    <span className="nav-text">Hotels</span>
                  </div>
                  <div className="nav-grid-item">
                    <i className="fas fa-coffee nav-icon"></i>
                    <span className="nav-text">Experiences</span>
                  </div>
                  <div className="nav-grid-item">
                    <i className="fas fa-briefcase nav-icon"></i>
                    <span className="nav-text">Business Course</span>
                  </div>
                  <div className="nav-grid-item">
                    <i className="fas fa-blog nav-icon"></i>
                    <span className="nav-text">Blog</span>
                  </div>
                  <div className="nav-grid-item">
                    <i className="fas fa-video nav-icon"></i>
                    <span className="nav-text">Online Webinar</span>
                  </div>
                </div>
                <section className="packages-section">
                  <h3 className="packages-title">Explore Travel Packages ✈️</h3>
                  <p className="packages-description">
                    Discover exciting travel packages that your students can learn to sell and earn commissions!
                    From exotic destinations to unique experiences, we've got something for everyone.
                  </p>
                  <button className="packages-button primary-button">
                    View Packages
                  </button>
                </section>
              </div>
            )}
            {currentPage === 'destinations' && <DestinationsPage onSelectDestination={handleSelectDestination} />}
            {currentPage === 'destination-overview' && selectedCourse && <DestinationOverview course={selectedCourse} onStartCourse={handleStartCourse} />}
            {currentPage === 'full-course-content' && selectedCourse && <FullCourseContent course={selectedCourse} onTakeQuiz={handleTakeQuiz} />}
            {currentPage === 'admin-dashboard' && <AdminDashboard />}
            {currentPage === 'loading' && <div>Loading...</div>}
            {currentPage !== 'home' && currentPage !== 'admin-dashboard' && currentPage !== 'destinations' && 
             currentPage !== 'destination-overview' && currentPage !== 'full-course-content' && currentPage !== 'loading' && (
              <div className="generic-page-content">
                <h2 className="generic-page-title">{currentPage} Page</h2>
                <p>Content for {currentPage} will go here.</p>
              </div>
            )}
          </main>
          <footer className="app-footer">
            &copy; {new Date().getFullYear()} The Conclave Academy. All rights reserved.
          </footer>
        </div>
      ) : (
        <div className="login-overlay">
          {alert.message && (
            <div className={`alert-bar ${alert.type}`}>
              {alert.message}
            </div>
          )}
          <LoginRegister onLogin={handleLogin} onRegister={handleRegister} />
        </div>
      )}
    </div>
  );
};

export default App;