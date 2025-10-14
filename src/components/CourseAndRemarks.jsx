import React, { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

const CourseAndRemarks = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Custom alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // Toast notification states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // User data state
  const [userData, setUserData] = useState(null);
  // Course details state
  const [courseDetails, setCourseDetails] = useState({});

  useEffect(() => {
    // Get user data from localStorage
    const storedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
    setUserData(storedUserData);
    fetchResults(storedUserData);
  }, []);

  useEffect(() => {
    filterResults();
  }, [results, searchTerm, activeTab]);

  // Function to fetch user details by email
  const fetchUserDetailsByEmail = async (email) => {
    try {
      if (!email) return null;
      
      console.log('🔍 Fetching user details for email:', email);
      const response = await api.get(`/users/email/${encodeURIComponent(email)}`);
      
      if (response.data.success) {
        console.log('✅ User details fetched successfully:', response.data.user);
        return response.data.user;
      }
      console.log('❌ No user found for email:', email);
      return null;
    } catch (error) {
      console.error('❌ Error fetching user details:', error);
      console.error('Error details:', error.response?.data || error.message);
      return null;
    }
  };

  // Function to fetch course details by course name or ID
  const fetchCourseDetails = async (courseName, courseType) => {
    try {
      if (!courseName) return null;
      
      console.log('🔍 Fetching course details for:', courseName, 'Type:', courseType);
      
      // For general courses, search in general_course_questions collection
      if (courseType === 'general') {
        const response = await api.get(`/courses/general/details`, {
          params: {
            courseName: courseName
          }
        });
        
        if (response.data.success) {
          console.log('✅ Course details fetched successfully:', response.data.course);
          return response.data.course;
        }
      }
      
      console.log('❌ No course details found for:', courseName);
      return null;
    } catch (error) {
      console.error('❌ Error fetching course details:', error);
      console.error('Error details:', error.response?.data || error.message);
      return null;
    }
  };

  // Function to pre-fetch course details for all results
  const preFetchCourseDetails = async (results) => {
    const details = {};
    console.log('📚 Pre-fetching course details for', results.length, 'results');
    
    for (const result of results) {
      const key = `${result.courseType}_${result.courseName}`;
      if (!details[key]) {
        console.log(`🔄 Fetching details for: ${result.courseName} (${result.courseType})`);
        const courseDetail = await fetchCourseDetails(result.courseName, result.courseType);
        if (courseDetail) {
          details[key] = courseDetail;
          console.log(`✅ Stored course details for key: ${key}`);
        }
      }
    }
    
    setCourseDetails(details);
    console.log('📖 Course details pre-fetch completed. Total courses:', Object.keys(details).length);
  };

  const showCustomAlert = (message, type = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  const showToastNotification = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const fetchResults = async (userData = null) => {
    try {
      setLoading(true);
      setError('');
      
      // Get current user info
      const currentUserData = userData || JSON.parse(localStorage.getItem('userData') || '{}');
      const userName = currentUserData.name || currentUserData.userName || currentUserData.username || 'Unknown User';
      const userEmail = currentUserData.email;
      
      console.log('📊 Fetching course results for user:', userName);
      console.log('📧 User email:', userEmail);
      console.log('🔍 Available user data from localStorage:', currentUserData);
      
      // Fetch additional user details from MongoDB using email
      let enhancedUserData = { ...currentUserData };
      if (userEmail) {
        console.log('🔄 Fetching enhanced user data from MongoDB...');
        const userDetails = await fetchUserDetailsByEmail(userEmail);
        if (userDetails) {
          enhancedUserData = { ...enhancedUserData, ...userDetails };
          console.log('✅ Enhanced user data from MongoDB:', enhancedUserData);
          // Update localStorage with enhanced data
          localStorage.setItem('userData', JSON.stringify(enhancedUserData));
        } else {
          console.log('⚠️ Could not fetch enhanced user data from MongoDB');
        }
      }
      
      setUserData(enhancedUserData);

      const response = await api.get(`/course-results/user/${encodeURIComponent(userName)}`);
      
      if (response.data.success) {
        const resultsData = response.data.results;
        setResults(resultsData);
        console.log(`✅ Loaded ${resultsData.length} course results`);
        
        // Pre-fetch course details for all results
        if (resultsData.length > 0) {
          console.log('🔄 Pre-fetching course details...');
          await preFetchCourseDetails(resultsData);
        }
        
        // DEBUG: If no results, try fetching all results to see what's in the database
        if (resultsData.length === 0) {
          console.log('🔍 No results found for user, checking all results in database...');
          try {
            const allResultsResponse = await api.get('/course-results');
            if (allResultsResponse.data.success) {
              console.log('📊 All results in database:', allResultsResponse.data.results);
              console.log('👤 All usernames in database:', allResultsResponse.data.results.map(r => r.userName));
            }
          } catch (debugError) {
            console.error('❌ Debug error fetching all results:', debugError);
          }
        }
      } else {
        setError('Failed to load course results');
        console.log('❌ API response indicated failure');
      }
    } catch (error) {
      console.error('❌ Error fetching course results:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError('Failed to load course results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    let filtered = results;
    
    // Filter by tab
    if (activeTab === 'general') {
      filtered = filtered.filter(result => result.courseType === 'general');
    } else if (activeTab === 'masterclass') {
      filtered = filtered.filter(result => result.courseType === 'masterclass');
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(result =>
        result.courseName?.toLowerCase().includes(term) ||
        result.questionSetTitle?.toLowerCase().includes(term) ||
        result.remark?.toLowerCase().includes(term)
      );
    }
    
    setFilteredResults(filtered);
  };

  const viewDetails = (result) => {
    setSelectedResult(result);
    setShowDetailsModal(true);
  };

  // ENHANCED CERTIFICATE DOWNLOAD FUNCTIONALITY
  const downloadCertificate = async (result) => {
    try {
      console.log('🎓 Generating certificate for result:', result);
      // Get enhanced user and course data for certificate
      const certificateData = await getEnhancedCertificateData(result);
      generateCertificate(result, certificateData);
    } catch (error) {
      console.error('❌ Error preparing certificate data:', error);
      showCustomAlert('Failed to prepare certificate data. Please try again.', 'error');
    }
  };

  const getEnhancedCertificateData = async (result) => {
    // Get user details with fallbacks
    const userName = userData?.name || userData?.username || result.userName || 'Valued Participant';
    const userEmail = userData?.email || '';
    
    // Get course details with fallbacks - MORE AGGRESSIVE APPROACH
    let courseDescription = '';
    let courseDetail = null;
    
    // Try to get from pre-fetched course details first
    const courseKey = `${result.courseType}_${result.courseName}`;
    courseDetail = courseDetails[courseKey];
    
    // If not found in pre-fetched data, try to fetch it directly
    if (!courseDetail && result.courseType === 'general') {
      console.log('🔄 Course detail not pre-fetched, fetching directly...');
      courseDetail = await fetchCourseDetails(result.courseName, result.courseType);
    }
    
    // Set course description
    if (courseDetail) {
      courseDescription = courseDetail.description || courseDetail.title || '';
      console.log('✅ Using course description from MongoDB:', courseDescription);
    } else {
      console.log('⚠️ No course details found, using fallbacks');
      courseDescription = result.questionSetTitle || result.courseName || 'Course Completion';
    }
    
    console.log('📋 Final certificate data:', {
      userName,
      userEmail,
      courseDescription,
      courseName: result.courseName,
      hasCourseDetail: !!courseDetail
    });
    
    return {
      userName,
      userEmail,
      courseDescription,
      courseName: result.courseName || 'Course Completion',
      percentageScore: result.percentage || 0,
      completionDate: result.createdAt ? new Date(result.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 'a recent date'
    };
  };

  const generateCertificate = (result, certificateData) => {
    try {
      // Use enhanced data from MongoDB
      const { userName, userEmail, courseDescription, courseName, percentageScore, completionDate } = certificateData;
      
      const isPassed = percentageScore >= 60;
      const badgeText = isPassed ? 'CERTIFICATE OF ACHIEVEMENT' : 'CERTIFICATE OF PARTICIPATION';
      const primaryColor = '#ff6f00';
      const secondaryColor = '#1a237e';
      
      // Enhanced filename with username and email
      const safeUserName = (userName || 'Student').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const safeCourseName = (courseName || 'Course').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `${safeUserName}_${safeCourseName}_Certificate.pdf`;

      // Format course name with description - ENSURING IT APPEARS
      const displayCourseName = courseDescription && courseDescription !== courseName 
        ? `${courseName} (${courseDescription})`
        : courseName;

      console.log('🎓 Generating certificate with:', {
        courseName,
        courseDescription,
        displayCourseName
      });

      // COMPACT Certificate HTML Content - Everything on one page
      const certificateContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${badgeText} - ${courseName}</title>
            <style>
                @page { 
                    size: A4 landscape;
                    margin: 0;
                }
                body { 
                    margin: 0; 
                    padding: 0; 
                    background: #fff;
                    font-family: 'Times New Roman', Times, serif; 
                    position: relative;
                    overflow: hidden;
                }
                .certificate-container {
                    width: 297mm;
                    height: 210mm;
                    box-sizing: border-box;
                    border: 15px solid ${secondaryColor};
                    padding: 15px;
                    position: relative;
                    overflow: hidden;
                }
                .inner-border {
                    border: 3px solid ${primaryColor};
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    text-align: center;
                }
                
                /* Watermark Styles - Smaller */
                .watermark {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    pointer-events: none;
                    z-index: 1;
                    opacity: 0.1;
                }
                .watermark-text {
                    position: absolute;
                    font-size: 100px;
                    font-weight: 900;
                    color: #e0e0e0;
                    transform: rotate(-45deg);
                    white-space: nowrap;
                    top: 35%;
                    left: -15%;
                    width: 130%;
                    text-align: center;
                    font-family: 'Arial', sans-serif;
                    letter-spacing: 8px;
                }
                
                /* Logo Styles - Smaller */
                .logo-container {
                    position: absolute;
                    top: 15px;
                    left: 15px;
                    z-index: 2;
                    text-align: center;
                }
                .academy-logo {
                    width: 60px;
                    height: 60px;
                    object-fit: contain;
                    margin-bottom: 3px;
                    border-radius: 6px;
                }
                .logo-text {
                    font-size: 10px;
                    font-weight: bold;
                    color: ${secondaryColor};
                    margin: 0;
                    font-family: 'Arial', sans-serif;
                }
                
                /* Compact Text Styles */
                .title {
                    color: ${secondaryColor};
                    font-size: 28pt; 
                    font-weight: bold;
                    margin-top: 10px;
                    margin-bottom: 8pt;
                    position: relative;
                    z-index: 2;
                    line-height: 1.1;
                }
                .award-text {
                    font-size: 14pt;
                    color: #333;
                    margin-bottom: 8pt;
                    position: relative;
                    z-index: 2;
                    line-height: 1.2;
                }
                .name {
                    font-size: 32pt; 
                    color: ${primaryColor};
                    font-family: 'Brush Script MT', cursive;
                    margin: 8pt 0 15pt 0;
                    border-bottom: 2px solid ${secondaryColor};
                    padding-bottom: 3pt;
                    line-height: 1.1;
                    position: relative;
                    z-index: 2;
                    max-width: 80%;
                }
                .user-email {
                    font-size: 11pt;
                    color: #666;
                    margin-bottom: 8pt;
                    position: relative;
                    z-index: 2;
                    font-style: italic;
                }
                .course-text {
                    font-size: 16pt;
                    color: #333;
                    margin-bottom: 15pt;
                    text-align: center;
                    max-width: 85%;
                    position: relative;
                    z-index: 2;
                    line-height: 1.3;
                    padding: 0 10px;
                }
                .score-badge {
                    background-color: ${primaryColor};
                    color: white;
                    padding: 8pt 15pt;
                    border-radius: 4pt;
                    font-size: 16pt;
                    font-weight: bold;
                    margin-bottom: 20pt;
                    position: relative;
                    z-index: 2;
                }
                .signature-section {
                    display: flex;
                    justify-content: space-around;
                    width: 80%;
                    margin-top: 25pt;
                    text-align: center;
                    position: relative;
                    z-index: 2;
                }
                .signature-item {
                    border-top: 1px solid #000;
                    padding-top: 4pt;
                    width: 40%;
                    font-size: 10pt;
                }
                .certificate-id {
                    position: absolute;
                    bottom: 8px;
                    right: 15px;
                    font-size: 8pt;
                    color: #999;
                    z-index: 2;
                }
                
                /* Compact layout adjustments */
                .compact-spacing {
                    margin-bottom: 5pt !important;
                }
                
                /* Print media queries */
                @media print {
                    .certificate-container {
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .inner-border {
                        border: 8px solid ${secondaryColor} !important;
                    }
                    .watermark {
                        opacity: 0.08 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }

                /* Button styles */
                .no-print {
                  text-align: center;
                  margin: 15px 0;
                  padding: 15px;
                }
                .btn-group {
                  display: flex;
                  gap: 10px;
                  justify-content: center;
                  flex-wrap: wrap;
                }
                .btn {
                  padding: 8px 16px;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  font-weight: 600;
                  transition: all 0.3s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-width: 120px;
                }
                .btn-primary {
                  background: #ff6f00;
                  color: white;
                }
                .btn-secondary {
                  background: #6c757d;
                  color: white;
                }
                .btn-success {
                  background: #28a745;
                  color: white;
                }
                .btn:hover {
                  opacity: 0.9;
                  transform: translateY(-1px);
                }
            </style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
            <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
            <script>
              function generatePDF() {
                  const element = document.getElementById('certificate-to-download');
                  
                  if (!element) {
                      showToast('Certificate element not found', 'error');
                      return;
                  }

                  document.body.style.padding = '0';
                  document.body.style.margin = '0';

                  // Wait for images to load
                  const images = element.getElementsByTagName('img');
                  let imagesLoaded = 0;
                  const totalImages = images.length;

                  if (totalImages === 0) {
                      captureAndDownload();
                      return;
                  }

                  Array.from(images).forEach(img => {
                      if (img.complete) {
                          imagesLoaded++;
                      } else {
                          img.onload = () => {
                              imagesLoaded++;
                              if (imagesLoaded === totalImages) {
                                  captureAndDownload();
                              }
                          };
                          img.onerror = () => {
                              imagesLoaded++;
                              if (imagesLoaded === totalImages) {
                                  captureAndDownload();
                              }
                          };
                      }
                  });

                  function captureAndDownload() {
                      html2canvas(element, { 
                        scale: 3,
                        logging: true,
                        useCORS: true,
                        width: element.offsetWidth,
                        height: element.offsetHeight,
                        backgroundColor: '#ffffff'
                      }).then(canvas => {
                          const imgData = canvas.toDataURL('image/jpeg', 1.0);
                          const pdf = new window.jspdf.jsPDF({
                              orientation: 'l',
                              unit: 'mm',
                              format: 'a4'
                          });
                          
                          const width = pdf.internal.pageSize.getWidth();
                          const height = pdf.internal.pageSize.getHeight();
                          
                          pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
                          pdf.save("${fileName}");
                          
                          showToast('Certificate downloaded successfully!', 'success');
                          
                          setTimeout(() => {
                              if (window.print) {
                                  window.print();
                              }
                          }, 1000);
                      }).catch(err => {
                          console.error("Error generating PDF:", err);
                          showToast('Failed to download PDF. Please try printing manually.', 'error');
                      });
                  }

                  // Fallback in case images don't load
                  setTimeout(captureAndDownload, 3000);
              }

              function showToast(message, type = 'success') {
                const toastContainer = document.getElementById('toastContainer');
                const toastId = 'toast-' + Date.now();
                
                const toastHTML = \`
                  <div id="\${toastId}" class="custom-toast \${type === 'error' ? 'error' : ''}">
                    <div class="toast-content">
                      <i class="fas \${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                      <span>\${message}</span>
                      <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                \`;
                
                if (!toastContainer) {
                  const container = document.createElement('div');
                  container.id = 'toastContainer';
                  container.className = 'toast-container';
                  document.body.appendChild(container);
                }
                
                document.getElementById('toastContainer').insertAdjacentHTML('beforeend', toastHTML);
                
                setTimeout(() => {
                  const toast = document.getElementById(toastId);
                  if (toast) {
                    toast.remove();
                  }
                }, 4000);
              }

              window.onload = function() {
                  setTimeout(generatePDF, 1000);
              };
            </script>
            <style>
              .toast-container {
                position: fixed;
                top: 15px;
                right: 15px;
                z-index: 9999;
              }
              .custom-toast {
                background: white;
                border-radius: 6px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.15);
                border-left: 3px solid #28a745;
                animation: slideInRight 0.3s ease-out;
                min-width: 250px;
                max-width: 350px;
                margin-bottom: 8px;
              }
              .custom-toast.error {
                border-left-color: #dc3545;
              }
              .toast-content {
                display: flex;
                align-items: center;
                padding: 12px 16px;
              }
              .toast-content i:first-child {
                margin-right: 10px;
                font-size: 16px;
                color: #28a745;
              }
              .custom-toast.error .toast-content i:first-child {
                color: #dc3545;
              }
              .toast-close {
                background: none;
                border: none;
                color: #6c757d;
                cursor: pointer;
                margin-left: auto;
                padding: 3px;
                opacity: 0.7;
              }
              @keyframes slideInRight {
                from {
                  transform: translateX(100%);
                  opacity: 0;
                }
                to {
                  transform: translateX(0);
                  opacity: 1;
                }
              }
            </style>
        </head>
        <body>
            <div id="toastContainer" class="toast-container"></div>

            <div id="certificate-to-download" class="certificate-container">
                <!-- COMPACT WATERMARK -->
                <div class="watermark">
                    <div class="watermark-text">THE CONCLAVE ACADEMY</div>
                </div>
                
                <div class="inner-border">
                    <!-- Logo Container -->
                    <div class="logo-container">
                        <img src="https://res.cloudinary.com/dnc3s4u7q/image/upload/v1760389693/conclave_logo_ygplob.jpg" alt="The Conclave Academy Logo" class="academy-logo">
                        <p class="logo-text">THE CONCLAVE ACADEMY</p>
                    </div>

                    <p class="title">${badgeText}</p>
                    <p class="award-text compact-spacing">is proudly presented to</p>
                    
                    <h1 class="name">${userName}</h1>
                    
                    ${userEmail ? `<p class="user-email compact-spacing">${userEmail}</p>` : ''}
                    
                    <p class="award-text compact-spacing">For successfully completing the course</p>
                    
                    <h2 class="course-text">"${displayCourseName}"</h2>
                    
                    <div class="score-badge">
                        Achieved Score: ${percentageScore}%
                    </div>

                    <p class="award-text compact-spacing">Completed on ${completionDate}</p>

                    <div class="signature-section">
                        <div class="signature-item">
                            <p style="font-weight: bold;">Director</p>
                            <p>The Conclave Academy</p>
                        </div>
                        <div class="signature-item">
                            <p style="font-weight: bold;">Date Issued</p>
                            <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>

                    <div class="certificate-id">
                        Certificate ID: ${result._id || 'N/A'}
                    </div>
                </div>
            </div>

            <div class="no-print">
              <div class="btn-group">
                <button onclick="generatePDF()" class="btn btn-success" id="download-btn">
                  <i class="fas fa-download"></i> Download PDF
                </button>
                <button onclick="window.print()" class="btn btn-primary">
                  <i class="fas fa-print"></i> Print Certificate
                </button>
                <button onclick="window.close()" class="btn btn-secondary">
                  <i class="fas fa-times"></i> Close Window
                </button>
              </div>
              <p style="text-align: center; color: #666; margin-top: 8px; font-size: 11px;">
                <small>Certificate contains enhanced details from MongoDB</small>
              </p>
            </div>
        </body>
        </html>
      `;

      const certificateWindow = window.open('', '_blank');
      if (!certificateWindow) {
        showCustomAlert('Please allow pop-ups to download certificates.', 'warning');
        return;
      }
      
      certificateWindow.document.write(certificateContent);
      certificateWindow.document.close();
      
      showToastNotification('Certificate generated successfully! Download will start automatically.', 'success');
      
    } catch (error) {
      console.error('❌ Error generating certificate:', error);
      showCustomAlert('Failed to generate certificate. Please try again.', 'error');
    }
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'primary';
    if (percentage >= 70) return 'info';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  const getPerformanceText = (percentage) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Very Good';
    if (percentage >= 70) return 'Good';
    if (percentage >= 60) return 'Satisfactory';
    return 'Needs Improvement';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeTaken = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-primary">Loading Course Results...</h4>
                <p className="text-muted">Please wait while we fetch your results and course details</p>
                <div className="mt-3">
                  <small className="text-info">
                    <i className="fas fa-sync-alt me-1"></i>
                    Fetching user details and course descriptions from database
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="alert alert-danger text-center">
              <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
              <h4>Error Loading Results</h4>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchResults}>
                <i className="fas fa-refresh me-2"></i>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-remarks" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Custom Alert Component */}
      {showAlert && (
        <div className={`custom-alert custom-alert-${alertType}`}>
          <div className="alert-content">
            <i className={`fas ${
              alertType === 'success' ? 'fa-check-circle' :
              alertType === 'error' ? 'fa-exclamation-circle' :
              'fa-info-circle'
            } me-2`}></i>
            {alertMessage}
            <button 
              className="alert-close" 
              onClick={() => setShowAlert(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className={`position-fixed top-0 end-0 p-3`} style={{zIndex: 9999}}>
          <div className={`toast show align-items-center text-white bg-${toastType === 'success' ? 'success' : 'danger'} border-0`} role="alert">
            <div className="d-flex">
              <div className="toast-body">
                <i className={`fas ${toastType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2`}></i>
                {toastMessage}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setShowToast(false)}></button>
            </div>
          </div>
        </div>
      )}

      <div className="container-fluid py-4">
        {/* Header Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card text-white bg-primary shadow-lg">
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-graduation-cap me-3"></i>
                      Course Results & Certificates
                    </h1>
                    <p className="lead mb-0 opacity-75">
                      Track your course completion and download achievement certificates
                    </p>
                    <small className="opacity-75">
                      <i className="fas fa-database me-1"></i>
                      Enhanced with MongoDB user details and course descriptions
                    </small>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block text-primary">
                      <h4 className="mb-0 fw-bold">{results.length}</h4>
                      <small>Total Completions</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body p-0">
                <ul className="nav nav-tabs nav-justified">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveTab('all')}
                    >
                      <i className="fas fa-list me-2"></i>All Results
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'general' ? 'active' : ''}`}
                      onClick={() => setActiveTab('general')}
                    >
                      <i className="fas fa-book me-2"></i>General Courses
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'masterclass' ? 'active' : ''}`}
                      onClick={() => setActiveTab('masterclass')}
                    >
                      <i className="fas fa-crown me-2"></i>Masterclass Courses
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Results */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-white">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h5 className="mb-0">
                      {activeTab === 'all' ? 'All' : activeTab === 'general' ? 'General' : 'Masterclass'} Course Results
                      <span className="badge bg-primary ms-2">{filteredResults.length}</span>
                    </h5>
                    <small className="text-muted">
                      Showing certificates with enhanced user and course data
                    </small>
                  </div>
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by course name or remark..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {filteredResults.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-clipboard-list fa-4x text-muted mb-3"></i>
                    <h5 className="text-muted">No Results Found</h5>
                    <p className="text-muted">
                      {results.length === 0 
                        ? "You haven't completed any courses yet. Complete a course quiz to see your results here!"
                        : 'No results match your search criteria.'
                      }
                    </p>
                    {results.length === 0 && (
                      <button 
                        className="btn btn-primary mt-3"
                        onClick={() => window.location.href = '/general-courses'}
                      >
                        <i className="fas fa-play-circle me-2"></i>
                        Start a Course
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Course Name</th>
                          <th>Course Type</th>
                          <th className="text-center">Score</th>
                          <th className="text-center">Percentage</th>
                          <th className="text-center">Performance</th>
                          <th className="text-center">Time Taken</th>
                          <th className="text-center">Date Completed</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((result) => (
                          <tr key={result._id}>
                            <td>
                              <strong>{result.courseName}</strong>
                              {result.questionSetTitle && result.questionSetTitle !== result.courseName && (
                                <br />
                              )}
                              {result.questionSetTitle && result.questionSetTitle !== result.courseName && (
                                <small className="text-muted">{result.questionSetTitle}</small>
                              )}
                              <br />
                              <small className="text-info">
                                <i className="fas fa-database me-1"></i>
                                Enhanced certificate available
                              </small>
                            </td>
                            <td>
                              <span className={`badge ${
                                result.courseType === 'general' ? 'bg-info' : 'bg-warning'
                              }`}>
                                {result.courseType}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-secondary fs-6">
                                {result.score}/{result.maxScore}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`badge bg-${getPerformanceColor(result.percentage)} fs-6`}>
                                {result.percentage}%
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`badge bg-${getPerformanceColor(result.percentage)}`}>
                                {result.remark}
                              </span>
                            </td>
                            <td className="text-center">
                              <small>{formatTimeTaken(result.timeTaken)}</small>
                            </td>
                            <td className="text-center">
                              <small>{formatDate(result.createdAt)}</small>
                            </td>
                            <td className="text-center">
                              <div className="btn-group" role="group">
                                <button
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => viewDetails(result)}
                                  title="View details"
                                >
                                  <i className="fas fa-eye me-1"></i>Details
                                </button>
                                <button
                                  className="btn btn-outline-success btn-sm"
                                  onClick={() => downloadCertificate(result)}
                                  title="Download enhanced certificate"
                                >
                                  <i className="fas fa-download me-1"></i>Certificate
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedResult && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-analytics me-2"></i>
                  Result Details - {selectedResult.courseName}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Course Information</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Course Name:</span>
                        <strong>{selectedResult.courseName}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Course Type:</span>
                        <strong>
                          <span className={`badge ${
                            selectedResult.courseType === 'general' ? 'bg-info' : 'bg-warning'
                          }`}>
                            {selectedResult.courseType}
                          </span>
                        </strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Question Set:</span>
                        <strong>{selectedResult.questionSetTitle}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>User:</span>
                        <strong>{userData?.username || userData?.name || selectedResult.userName}</strong>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Performance Summary</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Date Completed:</span>
                        <strong>{formatDate(selectedResult.createdAt)}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Time Taken:</span>
                        <strong>{formatTimeTaken(selectedResult.timeTaken)}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Scoring System:</span>
                        <strong>{selectedResult.scoringSystem}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Data Source:</span>
                        <strong>
                          <span className="badge bg-success">
                            <i className="fas fa-database me-1"></i>
                            MongoDB Enhanced
                          </span>
                        </strong>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <div className="row">
                          <div className="col-md-3">
                            <h3 className="text-primary">{selectedResult.percentage}%</h3>
                            <p className="mb-0">Overall Score</p>
                          </div>
                          <div className="col-md-3">
                            <h3 className="text-info">{selectedResult.score}/{selectedResult.maxScore}</h3>
                            <p className="mb-0">Points Earned</p>
                          </div>
                          <div className="col-md-3">
                            <h3 className="text-success">{selectedResult.totalQuestions}</h3>
                            <p className="mb-0">Total Questions</p>
                          </div>
                          <div className="col-md-3">
                            <h3 className={`text-${getPerformanceColor(selectedResult.percentage)}`}>
                              {selectedResult.remark}
                            </h3>
                            <p className="mb-0">Performance</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Enhanced Certificate Available:</strong> Download a professional certificate with your username, email, and course description fetched directly from MongoDB.
                </div>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    className="btn btn-success btn-lg"
                    onClick={() => downloadCertificate(selectedResult)}
                  >
                    <i className="fas fa-download me-2"></i>Download Enhanced Certificate
                  </button>
                  <p className="text-muted mt-2">
                    Download a professional certificate with enhanced details from MongoDB
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-alert {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          min-width: 300px;
          max-width: 500px;
          animation: slideInRight 0.3s ease-out;
        }

        .custom-alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .custom-alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .custom-alert-warning {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .alert-content {
          padding: 15px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .alert-close {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 5px;
          margin-left: 10px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .alert-close:hover {
          opacity: 1;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default CourseAndRemarks;