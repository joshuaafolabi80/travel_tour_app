// src/App.jsx
import React, { useState, useEffect } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { jwtDecode } from 'jwt-decode';
import api from './services/api';
import LoginRegister from './LoginRegister';
import DestinationsPage from './destinations/DestinationsPage';
import DestinationOverview from './destinations/DestinationOverview';
import FullCourseContent from './destinations/FullCourseContent';
import QuizPlatform from './components/QuizPlatform';
import QuizScores from './components/QuizScores';
import AdminQuizCompleted from './components/AdminQuizCompleted';
// import CourseRemarks from './components/CourseRemarks';
// import GeneralCourses from './components/GeneralCourses';
// import MasterclassCourses from './components/MasterclassCourses';
// import ImportantInformation from './components/ImportantInformation';
// import AdminMessages from './components/AdminMessages';
// import Community from './components/Community';
// import ContactUs from './components/ContactUs';
// import RateShare from './components/RateShare';
// import AdminDashboard from './components/AdminDashboard';
import AdminStudents from './components/AdminStudents';
import AdminMessageStudents from './components/AdminMessageStudents';
// import AdminCourseCompleted from './components/AdminCourseCompleted';
import AdminManageCourses from './components/AdminManageCourses';
// import AdminSendInformation from './components/AdminSendInformation';
// import AdminCommunity from './components/AdminCommunity';
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
  const [quizQuestions, setQuizQuestions] = useState([]);
  
  const [notificationCounts, setNotificationCounts] = useState({
    quizScores: 0,
    courseRemarks: 0,
    generalCourses: 0,
    masterclassCourses: 0,
    importantInfo: 0,
    adminMessages: 0,
    quizCompleted: 0,
    courseCompleted: 0,
    manageCourses: 0
  });

  const validateToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  };

  // Update fetchNotificationCounts to respect cleared notifications
  const fetchNotificationCounts = async () => {
    if (!isLoggedIn || !userData) return;
    
    try {
      const response = await api.get('/notifications/counts', {
        params: {
          userId: userData.name || userData.userName || userData.email,
          userRole: userRole
        }
      });
      
      if (response.data.success) {
        const clearedNotifications = JSON.parse(localStorage.getItem('clearedNotifications') || '{}');
        const currentTime = Date.now();
        const oneHour = 60 * 60 * 1000; // Notifications stay cleared for 1 hour
        
        const updatedCounts = { ...response.data.counts };
        
        // Filter out notifications that were cleared recently
        Object.keys(clearedNotifications).forEach(key => {
          if (currentTime - clearedNotifications[key] < oneHour) {
            updatedCounts[key] = 0;
          }
        });
        
        setNotificationCounts(updatedCounts);
      }
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  // Function to clear specific notification when menu is clicked
  const clearNotification = (notificationType) => {
    setNotificationCounts(prev => ({
      ...prev,
      [notificationType]: 0
    }));
    
    // Store in localStorage to persist across refreshes
    const clearedNotifications = JSON.parse(localStorage.getItem('clearedNotifications') || '{}');
    clearedNotifications[notificationType] = Date.now();
    localStorage.setItem('clearedNotifications', JSON.stringify(clearedNotifications));
  };

  // Function to mark notifications as read when menu is clicked
  const markNotificationsAsRead = async (notificationType) => {
    try {
      if (notificationType === 'quizScores' && userData) {
        await api.put('/notifications/mark-read', { 
          type: 'quiz_completed',
          userId: userData.name || userData.userName || userData.email
        });
      } else if (notificationType === 'quizCompleted' && userRole === 'admin') {
        await api.put('/quiz/results/mark-read-admin');
        // Also refetch quiz results to update the read status
        fetchNotificationCounts();
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Add this function to handle notification clearing properly
  const handleMenuClick = (item) => {
    // Correctly clear notification badge using the specific notificationKey
    if (item.notificationKey && item.notification > 0) {
      clearNotification(item.notificationKey);
      // Mark notifications as read in the database
      markNotificationsAsRead(item.notificationKey);
    }
    // Execute the original action
    if (item.action) {
      item.action();
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
        setShowSplash(false);
        fetchNotificationCounts();
      } else {
        localStorage.removeItem('authToken');
        setShowSplash(true);
      }
    }
  }, []);

  useEffect(() => {
    let interval;
    if (isLoggedIn) {
      // Fetch notifications immediately when logged in
      fetchNotificationCounts();
      // Then set up interval for periodic updates
      interval = setInterval(fetchNotificationCounts, 30000);
    }
    return () => clearInterval(interval);
  }, [isLoggedIn, userData, userRole]);

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
        localStorage.setItem('userData', JSON.stringify(user));
        setAuthToken(token);
        setUserData(user);

        setAlert({ type: 'success', message: 'Login successful! Redirecting...' });
        
        setTimeout(() => {
          setIsLoggedIn(true);
          setUserRole(user.role);
          fetchNotificationCounts();
          
          if (user.role === 'admin') {
            setCurrentPage('admin-dashboard');
          } else {
            setCurrentPage('home');
          }
          setAlert({ type: '', message: '' });
        }, 2000);

      }
    } catch (error) {
      console.error('Login error:', error);
      setAlert({ type: 'error', message: 'Login failed. Please check your credentials.' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const handleRegister = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        setAuthToken(token);
        setUserData(user);

        setAlert({ type: 'success', message: 'Registration successful! Redirecting...' });
        
        setTimeout(() => {
          setIsLoggedIn(true);
          setUserRole(user.role);
          fetchNotificationCounts();
          
          if (user.role === 'admin') {
            setCurrentPage('admin-dashboard');
          } else {
            setCurrentPage('home');
          }
          setAlert({ type: '', message: '' });
        }, 2000);

      }
    } catch (error) {
      console.error('Registration error:', error);
      setAlert({ type: 'error', message: 'Registration failed. Please try again.' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
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

  const handleTakeQuiz = async () => {
    try {
      const response = await api.get(`/quiz/questions?courseId=${selectedCourse._id}`);
      if (response.data.success) {
        setQuizQuestions(response.data.questions);
        setCurrentPage('quiz-platform');
      } else {
        setAlert({ type: 'error', message: 'Failed to load quiz questions.' });
      }
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      setAlert({ type: 'error', message: 'Failed to load quiz. Please try again.' });
    }
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const navigateTo = (page) => {
    setCurrentPage(page);
    setShowMenu(false);
  };

  const renderNotificationBadge = (count) => {
    if (count > 0) {
      return (
        <span className="notification-badge">
          {count > 99 ? '99+' : count}
        </span>
      );
    }
    return null;
  };

  const userMenuItems = [
    { 
      name: "Quiz and Score", 
      icon: "fa-solid fa-chart-line",
      notificationKey: 'quizScores',
      notification: notificationCounts.quizScores,
      action: () => navigateTo('quiz-scores')
    },
    { 
      name: "Course and Remarks", 
      icon: "fa-solid fa-graduation-cap",
      notificationKey: 'courseRemarks',
      notification: notificationCounts.courseRemarks,
      action: () => navigateTo('course-remarks')
    },
    { 
      name: "General Courses", 
      icon: "fa-solid fa-book",
      notificationKey: 'generalCourses',
      notification: notificationCounts.generalCourses,
      action: () => navigateTo('general-courses')
    },
    { 
      name: "Masterclass Courses", 
      icon: "fa-solid fa-crown",
      notificationKey: 'masterclassCourses',
      notification: notificationCounts.masterclassCourses,
      action: () => navigateTo('masterclass-courses')
    },
    { 
      name: "Important Information", 
      icon: "fa-solid fa-info-circle",
      notificationKey: 'importantInfo',
      notification: notificationCounts.importantInfo,
      action: () => navigateTo('important-information')
    },
    { 
      name: "Message from Admin", 
      icon: "fa-solid fa-envelope",
      notificationKey: 'adminMessages',
      notification: notificationCounts.adminMessages,
      action: () => navigateTo('admin-messages')
    },
    { 
      name: "Community", 
      icon: "fa-solid fa-users",
      action: () => navigateTo('community')
    },
    { 
      name: "Contact Us", 
      icon: "fa-solid fa-phone",
      action: () => navigateTo('contact-us')
    },
    { 
      name: "Rate and Share our App", 
      icon: "fa-solid fa-share-alt",
      action: () => navigateTo('rate-share')
    },
    { 
      name: "Logout", 
      icon: "fa-solid fa-sign-out-alt", 
      action: handleLogout
    },
  ];

  const adminMenuItems = [
    { 
      name: "Registered Students", 
      icon: "fa-solid fa-user-graduate",
      action: () => navigateTo('admin-students')
    },
    { 
      name: "Message your Students", 
      icon: "fa-solid fa-comments",
      action: () => navigateTo('admin-message-students')
    },
    { 
      name: "Quiz Completed", 
      icon: "fa-solid fa-tasks",
      notificationKey: 'quizCompleted',
      notification: notificationCounts.quizCompleted,
      action: () => navigateTo('admin-quiz-completed')
    },
    { 
      name: "Course Completed", 
      icon: "fa-solid fa-certificate",
      notificationKey: 'courseCompleted',
      notification: notificationCounts.courseCompleted,
      action: () => navigateTo('admin-course-completed')
    },
    { 
      name: "Manage my Courses", 
      icon: "fa-solid fa-cog",
      notificationKey: 'manageCourses',
      notification: notificationCounts.manageCourses,
      action: () => navigateTo('admin-manage-courses')
    },
    { 
      name: "Send Information", 
      icon: "fa-solid fa-bullhorn",
      action: () => navigateTo('admin-send-information')
    },
    { 
      name: "Community", 
      icon: "fa-solid fa-users",
      action: () => navigateTo('admin-community')
    },
    { 
      name: "Logout", 
      icon: "fa-solid fa-sign-out-alt", 
      action: handleLogout
    },
  ];

  const getMenuItems = () => {
    if (userRole === 'admin') {
      return adminMenuItems;
    }
    return userMenuItems;
  };

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
              {getMenuItems().map((item) => (
                <button 
                  key={item.name} 
                  className="desktop-nav-item" 
                  onClick={() => handleMenuClick(item)}
                  style={{position: 'relative'}}
                >
                  <i className={item.icon}></i>
                  <span>{item.name}</span>
                  {item.notification !== undefined && renderNotificationBadge(item.notification)}
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
              <div className="mobile-menu-scroll-container">
                <ul className="mobile-menu-list">
                  {getMenuItems().map((item) => (
                    <li key={item.name}>
                      <button
                        onClick={() => handleMenuClick(item)}
                        className="mobile-menu-item"
                        style={{position: 'relative'}}
                      >
                        <i className={item.icon}></i>
                        <span>{item.name}</span>
                        {item.notification !== undefined && renderNotificationBadge(item.notification)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
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
            {currentPage === 'destination-overview' && selectedCourse && (
              <DestinationOverview course={selectedCourse} onStartCourse={handleStartCourse} />
            )}
            {currentPage === 'full-course-content' && selectedCourse && (
              <FullCourseContent course={selectedCourse} onTakeQuiz={handleTakeQuiz} />
            )}
            {currentPage === 'quiz-platform' && selectedCourse && quizQuestions.length > 0 && (
              <QuizPlatform course={selectedCourse} questions={quizQuestions} />
            )}
            
            {/* User Pages */}
            {currentPage === 'quiz-scores' && <QuizScores />}
            {/* {currentPage === 'course-remarks' && <CourseRemarks />} */}
            {/* {currentPage === 'general-courses' && <GeneralCourses />} */}
            {/* {currentPage === 'masterclass-courses' && <MasterclassCourses />} */}
            {/* {currentPage === 'important-information' && <ImportantInformation />} */}
            {/* {currentPage === 'admin-messages' && <AdminMessages />} */}
            {/* {currentPage === 'community' && <Community />} */}
            {/* {currentPage === 'contact-us' && <ContactUs />} */}
            {/* {currentPage === 'rate-share' && <RateShare />} */}
            
            {/* Admin Pages */}
            {/* {currentPage === 'admin-dashboard' && <AdminDashboard />} */}
            {currentPage === 'admin-students' && <AdminStudents />}
            {currentPage === 'admin-message-students' && <AdminMessageStudents />}
            {currentPage === 'admin-quiz-completed' && <AdminQuizCompleted />}
            {/* {currentPage === 'admin-course-completed' && <AdminCourseCompleted />} */}
            {currentPage === 'admin-manage-courses' && <AdminManageCourses />}
            {/* {currentPage === 'admin-send-information' && <AdminSendInformation />} */}
            {/* {currentPage === 'admin-community' && <AdminCommunity />} */}
            
            {currentPage === 'loading' && (
              <div className="d-flex justify-content-center align-items-center" style={{height: '50vh'}}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
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