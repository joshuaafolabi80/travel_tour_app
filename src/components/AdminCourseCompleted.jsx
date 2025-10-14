import React, { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

const AdminCourseCompleted = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Filter states
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [scoreFilter, setScoreFilter] = useState({
    minScore: '',
    maxScore: ''
  });

  // Custom alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // Toast notification states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Course details state for enhanced certificates
  const [courseDetails, setCourseDetails] = useState({});
  const [userDetails, setUserDetails] = useState({});

  useEffect(() => {
    fetchResults();
    fetchNotificationCount();
  }, [activeTab]);

  useEffect(() => {
    filterResults();
  }, [results, searchTerm, dateFilter, scoreFilter, activeTab]);

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

  // Function to fetch user details by email
  const fetchUserDetailsByEmail = async (email) => {
    try {
      if (!email) return null;
      
      console.log('🔍 Admin fetching user details for email:', email);
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
      
      console.log('🔍 Admin fetching course details for:', courseName, 'Type:', courseType);
      
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
    console.log('📚 Admin pre-fetching course details for', results.length, 'results');
    
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

  // Function to pre-fetch user details for all results
  const preFetchUserDetails = async (results) => {
    const details = {};
    console.log('👤 Admin pre-fetching user details for', results.length, 'results');
    
    // Get unique usernames
    const uniqueUsernames = [...new Set(results.map(result => result.userName))];
    
    for (const username of uniqueUsernames) {
      if (!details[username]) {
        console.log(`🔄 Fetching user details for: ${username}`);
        // We need to get email first, then fetch user details
        // For now, we'll try to fetch by username directly
        try {
          const response = await api.get(`/users/username/${encodeURIComponent(username)}`);
          if (response.data.success) {
            details[username] = response.data.user;
            console.log(`✅ Stored user details for: ${username}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch details for user: ${username}`);
        }
      }
    }
    
    setUserDetails(details);
    console.log('👤 User details pre-fetch completed. Total users:', Object.keys(details).length);
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📊 Admin fetching all course results...');
      
      const response = await api.get('/course-results');
      
      if (response.data.success) {
        const resultsData = response.data.results;
        setResults(resultsData);
        console.log(`✅ Admin loaded ${resultsData.length} course results`);
        
        // Pre-fetch course details for all results
        if (resultsData.length > 0) {
          console.log('🔄 Pre-fetching course and user details...');
          await preFetchCourseDetails(resultsData);
          await preFetchUserDetails(resultsData);
        }
      } else {
        setError('Failed to load course results');
      }
    } catch (error) {
      console.error('❌ Error fetching course results:', error);
      setError('Failed to load course results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const response = await api.get('/course-results/notifications/count');
      if (response.data.success) {
        setNotificationCount(response.data.count);
        console.log(`🔔 Course completion notifications: ${response.data.count}`);
      }
    } catch (error) {
      console.error('❌ Error fetching notification count:', error);
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
        result.userName?.toLowerCase().includes(term) ||
        result.remark?.toLowerCase().includes(term) ||
        result.questionSetTitle?.toLowerCase().includes(term)
      );
    }

    // Filter by date range
    if (dateFilter.startDate) {
      filtered = filtered.filter(result => 
        new Date(result.createdAt) >= new Date(dateFilter.startDate)
      );
    }
    if (dateFilter.endDate) {
      const endDate = new Date(dateFilter.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(result => 
        new Date(result.createdAt) <= endDate
      );
    }

    // Filter by score range
    if (scoreFilter.minScore) {
      filtered = filtered.filter(result => 
        result.percentage >= parseFloat(scoreFilter.minScore)
      );
    }
    if (scoreFilter.maxScore) {
      filtered = filtered.filter(result => 
        result.percentage <= parseFloat(scoreFilter.maxScore)
      );
    }

    setFilteredResults(filtered);
  };

  const viewDetails = (result) => {
    setSelectedResult(result);
    setShowDetailsModal(true);
  };

  // ENHANCED EXPORT FUNCTIONALITY WITH USER EMAIL AND COURSE DESCRIPTION
  const exportToExcel = async () => {
    try {
      if (filteredResults.length === 0) {
        showCustomAlert('No results to export. Please adjust your filters.', 'warning');
        return;
      }

      // Enhanced data preparation with user email and course description
      const dataForExport = await Promise.all(filteredResults.map(async (result) => {
        // Get user email
        let userEmail = '';
        const userDetail = userDetails[result.userName];
        if (userDetail) {
          userEmail = userDetail.email || '';
        }

        // Get course description
        let courseDescription = '';
        const courseKey = `${result.courseType}_${result.courseName}`;
        const courseDetail = courseDetails[courseKey];
        if (courseDetail) {
          courseDescription = courseDetail.description || '';
        }

        return {
          'Student Name': result.userName,
          'Student Email': userEmail,
          'Course Name': result.courseName,
          'Course Description': courseDescription,
          'Full Course Name': courseDescription ? `${result.courseName} (${courseDescription})` : result.courseName,
          'Question Set': result.questionSetTitle,
          'Course Type': result.courseType,
          'Date Completed': result.createdAt ? new Date(result.createdAt).toLocaleDateString() : 'N/A',
          'Score': `${result.score}/${result.maxScore}`,
          'Percentage': `${result.percentage}%`,
          'Performance': result.remark,
          'Time Taken': result.timeTaken ? 
            `${Math.floor(result.timeTaken / 60)}:${(result.timeTaken % 60).toString().padStart(2, '0')}` 
            : 'N/A',
          'Total Questions': result.totalQuestions,
          'Scoring System': result.scoringSystem,
          'Status': result.readByAdmin ? 'Reviewed' : 'Pending Review'
        };
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataForExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Course Results');
      
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `admin_course_results_${timestamp}.xlsx`);
      
      showCustomAlert('Course results exported successfully with enhanced data!', 'success');
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      showCustomAlert('Failed to export course results. Please try again.', 'error');
    }
  };

  // ENHANCED CERTIFICATE DOWNLOAD FUNCTIONALITY WITH USER EMAIL AND COURSE DESCRIPTION
  const downloadCertificate = async (result) => {
    try {
      console.log('🎓 Admin generating certificate for result:', result);
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
    let userEmail = '';
    const userDetail = userDetails[result.userName];
    if (userDetail) {
      userEmail = userDetail.email || '';
    }

    const userName = result.userName || 'Valued Student';
    
    // Get course details with fallbacks
    let courseDescription = '';
    const courseKey = `${result.courseType}_${result.courseName}`;
    const courseDetail = courseDetails[courseKey];
    
    // If not found in pre-fetched data, try to fetch it directly
    if (!courseDetail && result.courseType === 'general') {
      console.log('🔄 Course detail not pre-fetched, fetching directly...');
      const fetchedCourseDetail = await fetchCourseDetails(result.courseName, result.courseType);
      if (fetchedCourseDetail) {
        courseDescription = fetchedCourseDetail.description || '';
      }
    } else if (courseDetail) {
      courseDescription = courseDetail.description || '';
    }
    
    console.log('📋 Admin certificate data:', {
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

      console.log('🎓 Admin generating certificate with:', {
        courseName,
        courseDescription,
        displayCourseName,
        userEmail
      });

      // ENHANCED Certificate HTML Content with STRONG WATERMARK
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
                }
                .certificate-container {
                    width: 297mm;
                    height: 210mm;
                    box-sizing: border-box;
                    border: 20px solid ${secondaryColor};
                    padding: 20px;
                    position: relative;
                    overflow: hidden;
                }
                .inner-border {
                    border: 5px solid ${primaryColor};
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                    padding: 30px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                }
                
                /* ENHANCED Watermark Styles - STRONG VISIBILITY */
                .watermark {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    pointer-events: none;
                    z-index: 1;
                    opacity: 0.15; /* ENHANCED VISIBILITY */
                }
                .watermark-text {
                    position: absolute;
                    font-size: 140px; /* LARGER SIZE */
                    font-weight: 900; /* BOLDER */
                    color: #d0d0d0; /* LIGHTER GRAY FOR BETTER VISIBILITY */
                    transform: rotate(-45deg);
                    white-space: nowrap;
                    top: 40%;
                    left: -20%;
                    width: 140%;
                    text-align: center;
                    font-family: 'Arial', sans-serif;
                    letter-spacing: 12px; /* INCREASED SPACING */
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.1); /* ADDED SHADOW FOR DEPTH */
                }
                
                /* Logo Styles */
                .logo-container {
                    position: absolute;
                    top: 20px;
                    left: 2px;
                    z-index: 2;
                    text-align: center;
                }
                .academy-logo {
                    width: 80px;
                    height: 80px;
                    object-fit: contain;
                    margin-bottom: 5px;
                    border-radius: 8px;
                }
                .logo-text {
                    font-size: 12px;
                    font-weight: bold;
                    color: ${secondaryColor};
                    margin: 0;
                    font-family: 'Arial', sans-serif;
                }
                
                .title {
                    color: ${secondaryColor};
                    font-size: 36pt; 
                    font-weight: bold;
                    margin-top: 30px;
                    margin-bottom: 10pt;
                    position: relative;
                    z-index: 2;
                }
                .award-text {
                    font-size: 16pt;
                    color: #333;
                    margin-bottom: 10pt;
                    position: relative;
                    z-index: 2;
                }
                .name {
                    font-size: 40pt; 
                    color: ${primaryColor};
                    font-family: 'Brush Script MT', cursive;
                    margin: 10pt 0 20pt 0;
                    border-bottom: 3px solid ${secondaryColor};
                    padding-bottom: 5pt;
                    line-height: 1.2;
                    position: relative;
                    z-index: 2;
                }
                .user-email {
                    font-size: 14pt;
                    color: #666;
                    margin-bottom: 10pt;
                    position: relative;
                    z-index: 2;
                    font-style: italic;
                }
                .course-text {
                    font-size: 20pt;
                    color: #333;
                    margin-bottom: 30pt;
                    text-align: center;
                    max-width: 80%;
                    position: relative;
                    z-index: 2;
                }
                .score-badge {
                    background-color: ${primaryColor};
                    color: white;
                    padding: 10pt 20pt;
                    border-radius: 5pt;
                    font-size: 18pt;
                    font-weight: bold;
                    margin-bottom: 30pt;
                    position: relative;
                    z-index: 2;
                }
                .signature-section {
                    display: flex;
                    justify-content: space-around;
                    width: 80%;
                    margin-top: 10pt;
                    text-align: center;
                    position: relative;
                    z-index: 2;
                }
                .signature-item {
                    border-top: 1px solid #000;
                    padding-top: 5pt;
                    width: 40%;
                    font-size: 12pt;
                }
                .certificate-info {
                    position: absolute;
                    bottom: 10px;
                    right: 20px;
                    font-size: 9pt;
                    color: #999;
                    z-index: 2;
                    text-align: right;
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
                        border: 10px solid ${secondaryColor} !important;
                        border-width: 20px;
                    }
                    .watermark {
                        opacity: 0.12 !important;
                    }
                }

                /* Button styles */
                .no-print {
                  text-align: center;
                  margin: 20px 0;
                }
                .btn-group {
                  display: flex;
                  gap: 12px;
                  justify-content: center;
                  flex-wrap: wrap;
                }
                .btn {
                  padding: 10px 20px;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                  transition: all 0.3s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-width: 150px;
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
                  transform: translateY(-2px);
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
                        height: element.offsetHeight
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
                          
                          setTimeout(() => window.close(), 100);
                      }).catch(err => {
                          console.error("Error generating PDF:", err);
                          showToast('Failed to download PDF. Please try printing manually.', 'error');
                      });
                  }

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
                top: 20px;
                right: 20px;
                z-index: 9999;
              }
              .custom-toast {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border-left: 4px solid #28a745;
                animation: slideInRight 0.3s ease-out;
                min-width: 300px;
                max-width: 400px;
                margin-bottom: 10px;
              }
              .custom-toast.error {
                border-left-color: #dc3545;
              }
              .toast-content {
                display: flex;
                align-items: center;
                padding: 16px 20px;
              }
              .toast-content i:first-child {
                margin-right: 12px;
                font-size: 20px;
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
                padding: 4px;
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
                <!-- ENHANCED WATERMARK WITH STRONG VISIBILITY -->
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
                    <p class="award-text">is proudly presented to</p>
                    
                    <h1 class="name">${userName}</h1>
                    
                    ${userEmail ? `<p class="user-email">${userEmail}</p>` : ''}
                    
                    <p class="award-text">For successfully completing the course</p>
                    
                    <h2 class="course-text">"${displayCourseName}"</h2>
                    
                    <div class="score-badge">
                        Achieved Score: ${percentageScore}%
                    </div>

                    <p class="award-text" style="margin-top: -10pt;">on ${completionDate}</p>

                    <div class="signature-section">
                        <div class="signature-item">
                            <p style="font-weight: bold;">Director</p>
                            <p>The Conclave Academy</p>
                        </div>
                        <div class="signature-item">
                            <p style="font-weight: bold;">Date Issued</p>
                            <p>${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div class="certificate-info">
                        <p>Certificate ID: ${result._id || 'N/A'}</p>
                        <p>Issued by Admin Dashboard</p>
                    </div>
                </div>
            </div>

            <div class="no-print">
              <div class="btn-group">
                <button onclick="generatePDF()" class="btn btn-success" id="download-btn">
                  <i class="fas fa-download"></i>Download PDF
                </button>
                <button onclick="window.print()" class="btn btn-primary">
                  <i class="fas fa-print"></i>Print Certificate
                </button>
                <button onclick="window.close()" class="btn btn-secondary">
                  <i class="fas fa-times"></i>Close
                </button>
              </div>
              <div style="text-align: center; margin-top: 15px; color: #666; font-size: 12px;">
                <p><strong>Enhanced Certificate Features:</strong></p>
                <p>✓ Student Email: ${userEmail || 'Not available'}</p>
                <p>✓ Course Description: ${courseDescription ? 'Included' : 'Not available'}</p>
                <p>✓ Strong Watermark Visibility</p>
              </div>
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
      
      showToastNotification('Enhanced certificate generated successfully! Download will start automatically.', 'success');
      
    } catch (error) {
      console.error('❌ Error generating certificate:', error);
      showCustomAlert('Failed to generate certificate. Please try again.', 'error');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter({ startDate: '', endDate: '' });
    setScoreFilter({ minScore: '', maxScore: '' });
    showCustomAlert('All filters cleared.', 'success');
  };

  const markAsRead = async () => {
    try {
      await api.put('/course-results/mark-read');
      setNotificationCount(0);
      showCustomAlert('All course completions marked as read', 'success');
      fetchResults();
    } catch (error) {
      console.error('❌ Error marking course completions as read:', error);
      showCustomAlert('Error marking completions as read', 'error');
    }
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'primary';
    if (percentage >= 70) return 'info';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
                <h4 className="text-primary">Loading Course Completions...</h4>
                <p className="text-muted">Please wait while we fetch all results and enhanced data</p>
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
    <div className="admin-course-completed" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
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
                      <i className="fas fa-certificate me-3"></i>
                      Course Completions - Admin Dashboard
                      {notificationCount > 0 && (
                        <span className="badge bg-warning ms-2 fs-6">
                          {notificationCount} New
                        </span>
                      )}
                    </h1>
                    <p className="lead mb-0 opacity-75">
                      Monitor all student course completions with enhanced certificates
                    </p>
                    <small className="opacity-75">
                      <i className="fas fa-database me-1"></i>
                      Enhanced with MongoDB user emails and course descriptions
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

        {/* Notification Alert */}
        {notificationCount > 0 && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="alert alert-warning alert-dismissible fade show">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <i className="fas fa-bell me-2"></i>
                    <strong>You have {notificationCount} new course completion(s)</strong>
                  </div>
                  <button 
                    className="btn btn-outline-warning btn-sm"
                    onClick={markAsRead}
                  >
                    Mark All as Read
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Filters Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search students or courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <input
                      type="date"
                      className="form-control"
                      placeholder="Start Date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter(prev => ({...prev, startDate: e.target.value}))}
                    />
                  </div>
                  <div className="col-md-2">
                    <input
                      type="date"
                      className="form-control"
                      placeholder="End Date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter(prev => ({...prev, endDate: e.target.value}))}
                    />
                  </div>
                  <div className="col-md-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Min Score %"
                      min="0"
                      max="100"
                      value={scoreFilter.minScore}
                      onChange={(e) => setScoreFilter(prev => ({...prev, minScore: e.target.value}))}
                    />
                  </div>
                  <div className="col-md-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Max Score %"
                      min="0"
                      max="100"
                      value={scoreFilter.maxScore}
                      onChange={(e) => setScoreFilter(prev => ({...prev, maxScore: e.target.value}))}
                    />
                  </div>
                  <div className="col-md-1">
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={clearFilters}
                        title="Clear Filters"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={exportToExcel}
                        title="Export to Excel with Enhanced Data"
                        disabled={filteredResults.length === 0}
                      >
                        <i className="fas fa-download"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-12">
                    <small className="text-info">
                      <i className="fas fa-info-circle me-1"></i>
                      Export includes student emails and course descriptions from MongoDB
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-white">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h5 className="mb-0">
                      {activeTab === 'all' ? 'All' : activeTab === 'general' ? 'General' : 'Masterclass'} Course Completions
                      <span className="badge bg-primary ms-2">{filteredResults.length}</span>
                    </h5>
                    <small className="text-muted">
                      Enhanced certificates available with user emails and course descriptions
                    </small>
                  </div>
                  <div className="col-md-6 text-end">
                    <small className="text-muted">
                      Showing {filteredResults.length} of {results.length} results
                    </small>
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
                        ? 'No course completions recorded yet.'
                        : 'No results match your filter criteria.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Student Name</th>
                          <th>Course Name</th>
                          <th className="text-center">Type</th>
                          <th className="text-center">Score</th>
                          <th className="text-center">Percentage</th>
                          <th className="text-center">Performance</th>
                          <th className="text-center">Time Taken</th>
                          <th className="text-center">Date Completed</th>
                          <th className="text-center">Status</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((result) => {
                          // Check if enhanced data is available
                          const userDetail = userDetails[result.userName];
                          const courseKey = `${result.courseType}_${result.courseName}`;
                          const courseDetail = courseDetails[courseKey];
                          const hasEnhancedData = userDetail || courseDetail;

                          return (
                            <tr key={result._id}>
                              <td>
                                <strong>{result.userName}</strong>
                                {userDetail && (
                                  <br />
                                )}
                                {userDetail && (
                                  <small className="text-success">
                                    <i className="fas fa-envelope me-1"></i>
                                    {userDetail.email}
                                  </small>
                                )}
                              </td>
                              <td>
                                <div>
                                  <strong>{result.courseName}</strong>
                                  {courseDetail && courseDetail.description && (
                                    <br />
                                  )}
                                  {courseDetail && courseDetail.description && (
                                    <small className="text-info">
                                      <i className="fas fa-info-circle me-1"></i>
                                      {courseDetail.description}
                                    </small>
                                  )}
                                  {result.questionSetTitle && result.questionSetTitle !== result.courseName && (
                                    <br />
                                  )}
                                  {result.questionSetTitle && result.questionSetTitle !== result.courseName && (
                                    <small className="text-muted">{result.questionSetTitle}</small>
                                  )}
                                </div>
                              </td>
                              <td className="text-center">
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
                                <span className={`badge ${result.readByAdmin ? 'bg-success' : 'bg-warning'}`}>
                                  {result.readByAdmin ? 'Read' : 'Unread'}
                                </span>
                              </td>
                              <td className="text-center">
                                <div className="btn-group" role="group">
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => viewDetails(result)}
                                    title="View detailed results"
                                  >
                                    <i className="fas fa-eye"></i>
                                  </button>
                                  <button
                                    className="btn btn-outline-success btn-sm"
                                    onClick={() => downloadCertificate(result)}
                                    title="Download enhanced certificate"
                                  >
                                    <i className="fas fa-download"></i>
                                  </button>
                                </div>
                                {hasEnhancedData && (
                                  <div className="mt-1">
                                    <small className="text-success">
                                      <i className="fas fa-star me-1"></i>
                                      Enhanced
                                    </small>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-analytics me-2"></i>
                  Course Completion Details - {selectedResult.courseName}
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
                    <h6>Student Information</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Name:</span>
                        <strong>{selectedResult.userName}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>User ID:</span>
                        <strong>{selectedResult.userId}</strong>
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
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Course Information</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Course Name:</span>
                        <strong>{selectedResult.courseName}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Question Set:</span>
                        <strong>{selectedResult.questionSetTitle}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Date Completed:</span>
                        <strong>{formatDate(selectedResult.createdAt)}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Time Taken:</span>
                        <strong>{formatTimeTaken(selectedResult.timeTaken)}</strong>
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
                        <div className="row mt-3">
                          <div className="col-12">
                            <small className="text-muted">
                              Scoring System: {selectedResult.scoringSystem} | 
                              Status: <span className={`badge ${selectedResult.readByAdmin ? 'bg-success' : 'bg-warning'}`}>
                                {selectedResult.readByAdmin ? 'Read by Admin' : 'Unread'}
                              </span>
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Enhanced Certificate Available:</strong> Download a professional certificate with student email and course description fetched directly from MongoDB collections.
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
                    Includes student email and course description with strong watermark visibility
                  </p>
                </div>

                {selectedResult.answers && selectedResult.answers.length > 0 && (
                  <>
                    <hr />
                    <h6>Detailed Question Breakdown</h6>
                    <div className="question-breakdown" style={{maxHeight: '400px', overflowY: 'auto'}}>
                      {selectedResult.answers.map((answer, index) => (
                        <div key={index} className={`card mb-3 ${answer.isCorrect ? 'border-success' : 'border-danger'}`}>
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="mb-0">Q{index + 1}: {answer.questionText}</h6>
                              <span className={`badge ${answer.isCorrect ? 'bg-success' : 'bg-danger'}`}>
                                {answer.isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                            <div className="row">
                              <div className="col-md-6">
                                <small className="text-muted">Student's Answer:</small>
                                <div className={`p-2 rounded ${answer.isCorrect ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                                  {answer.selectedAnswer}
                                </div>
                              </div>
                              <div className="col-md-6">
                                <small className="text-muted">Correct Answer:</small>
                                <div className="p-2 rounded bg-success text-white">
                                  {answer.correctAnswerText}
                                </div>
                              </div>
                            </div>
                            {answer.explanation && (
                              <div className="mt-2">
                                <small className="text-muted">Explanation:</small>
                                <div className="p-2 bg-light rounded small">
                                  {answer.explanation}
                                </div>
                              </div>
                            )}
                            <div className="mt-2">
                              <small className="text-muted">Points: </small>
                              <span className={`badge ${answer.isCorrect ? 'bg-success' : 'bg-secondary'}`}>
                                {answer.points || 0} points
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => downloadCertificate(selectedResult)}
                >
                  <i className="fas fa-download me-2"></i>Download Enhanced Certificate
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

export default AdminCourseCompleted;