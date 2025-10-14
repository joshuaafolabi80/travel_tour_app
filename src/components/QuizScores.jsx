// src/components/QuizScores.jsx - COMPLETE UPDATED VERSION WITH ENHANCED WATERMARK
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

const QuizScores = () => {
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [filteredResults, setFilteredResults] = useState([]);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    minScore: '',
    maxScore: '',
    dateFrom: '',
    dateTo: '',
    performance: ''
  });
  
  // Custom alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // Toast notification states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Get user data properly
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Get user data from localStorage
    const storedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
    setUserData(storedUserData);
    fetchQuizResults(storedUserData);
  }, []);

  useEffect(() => {
    filterResults();
  }, [quizResults, searchTerm, filterCriteria]);

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

  // Fetch quiz results with detailed answers - USING YOUR EXISTING API STRUCTURE
  const fetchQuizResults = async (userData = null) => {
    try {
      setLoading(true);
      setError('');
      
      // Get user data properly
      const currentUserData = userData || JSON.parse(localStorage.getItem('userData') || '{}');
      const userName = currentUserData.name || currentUserData.userName || currentUserData.email;
      const userId = currentUserData._id || currentUserData.id;
      
      console.log('🔍 Fetching quiz results for user:', { 
        userName, 
        userId,
        currentUserData 
      });
      
      if (!userId) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      // Use the correct endpoint and handle different response structures
      const response = await api.get('/quiz/results', {
        params: { userId }
      });
      
      console.log('📥 Quiz results API response:', response.data);
      
      if (response.data.success) {
        let results = response.data.results || response.data.data || [];
        
        console.log(`✅ Found ${results.length} quiz results`);
        
        // Ensure results have the required fields with detailed answers
        const formattedResults = results.map(result => {
          // CRITICAL FIX: Ensure answers have proper structure
          const formattedAnswers = (result.answers || []).map(answer => ({
            questionId: answer.questionId || answer._id,
            question: answer.question || answer.questionText || 'Question not available',
            selectedOption: answer.selectedOption || answer.selectedAnswer || 'No answer selected',
            correctAnswer: answer.correctAnswer || answer.correctAnswerText || 'Correct answer not available',
            isCorrect: answer.isCorrect !== undefined ? answer.isCorrect : false,
            explanation: answer.explanation || '',
            options: answer.options || []
          }));
          
          return {
            _id: result._id || result.id,
            userName: result.userName || userData?.name || userData?.userName || 'Unknown User',
            destination: result.destination || result.courseName || 'Unknown Course',
            score: result.score || 0,
            totalQuestions: result.totalQuestions || 1,
            percentage: result.percentage || 0,
            date: result.date || result.submittedAt || result.createdAt,
            timeTaken: result.timeTaken || 0,
            remark: result.remark || getRemark(result.percentage || 0),
            answers: formattedAnswers, // Use formatted answers
            status: result.status || 'completed'
          };
        });
        
        setQuizResults(formattedResults);
        
        // Mark notifications as read when user views their quiz scores
        await markQuizNotificationsAsRead(userId);
        
        console.log('✅ Quiz results loaded successfully with detailed answers');
        
      } else {
        console.warn('⚠️ API returned success: false');
        setQuizResults([]);
      }
    } catch (error) {
      console.error('❌ Error fetching quiz results:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        setError('Quiz results endpoint not found. Please contact support.');
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load quiz results. Please try again later.');
      }
      
      setQuizResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced notifications marking
  const markQuizNotificationsAsRead = async (userId) => {
    try {
      console.log('🔔 Marking quiz notifications as read for user:', userId);
      
      // Try multiple notification endpoints
      const endpoints = [
        '/notifications/mark-read',
        '/notifications/quiz/mark-read',
        '/quiz/notifications/mark-read'
      ];
      
      let marked = false;
      
      for (const endpoint of endpoints) {
        try {
          await api.put(endpoint, { 
            type: 'quiz_completed',
            userId: userId
          });
          console.log(`✅ Notifications marked as read via ${endpoint}`);
          marked = true;
          break;
        } catch (endpointError) {
          console.log(`⚠️ Endpoint ${endpoint} not available, trying next...`);
        }
      }
      
      if (!marked) {
        console.log('ℹ️ No notification endpoints available, continuing without marking as read');
      }
      
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error);
      // Don't throw error - this shouldn't break the main functionality
    }
  };

  // Helper function to get performance remark
  const getRemark = (percentage) => {
    if (percentage >= 80) return "Excellent";
    if (percentage >= 60) return "Good";
    if (percentage >= 40) return "Fair";
    return "Needs Improvement";
  };

  const filterResults = () => {
    let filtered = quizResults;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(result =>
        result.userName?.toLowerCase().includes(term) ||
        result.destination?.toLowerCase().includes(term) ||
        result.remark?.toLowerCase().includes(term) ||
        result.score?.toString().includes(term) ||
        result.percentage?.toString().includes(term) ||
        (result.date && new Date(result.date).toLocaleDateString().toLowerCase().includes(term))
      );
    }

    if (filterCriteria.minScore) {
      filtered = filtered.filter(result => result.percentage >= parseFloat(filterCriteria.minScore));
    }

    if (filterCriteria.maxScore) {
      filtered = filtered.filter(result => result.percentage <= parseFloat(filterCriteria.maxScore));
    }

    if (filterCriteria.dateFrom) {
      filtered = filtered.filter(result => result.date && new Date(result.date) >= new Date(filterCriteria.dateFrom));
    }

    if (filterCriteria.dateTo) {
      const toDate = new Date(filterCriteria.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(result => result.date && new Date(result.date) <= toDate);
    }

    if (filterCriteria.performance) {
      filtered = filtered.filter(result => result.remark === filterCriteria.performance);
    }

    setFilteredResults(filtered);
  };

  const handleFilterClick = () => {
    setShowFilterOptions(!showFilterOptions);
  };

  const handleExportClick = () => {
    exportToExcel();
  };

  const exportToExcel = () => {
    try {
      if (filteredResults.length === 0) {
        showCustomAlert('No results to export. Please adjust your filters.', 'warning');
        return;
      }

      const dataForExport = filteredResults.map(result => ({
        'Student Name': result.userName,
        'Course': result.destination,
        'Date': result.date ? new Date(result.date).toLocaleDateString() : 'N/A',
        'Score': `${result.score}/${result.totalQuestions}`,
        'Percentage': `${result.percentage}%`,
        'Performance': result.remark,
        'Time Taken': result.timeTaken ? `${Math.floor(result.timeTaken / 60)}:${(result.timeTaken % 60).toString().padStart(2, '0')}` : 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataForExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Quiz Results');
      
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `quiz_results_${timestamp}.xlsx`);
      
      showCustomAlert('Quiz results exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showCustomAlert('Failed to export quiz results. Please try again.', 'error');
    }
  };

  const printResults = () => {
    if (!selectedResult) {
      showCustomAlert('No result selected for printing.', 'warning');
      return;
    }
    
    const printContent = `
      <html>
        <head>
          <title>Quiz Results - ${selectedResult.destination}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section h3 { color: #ff6f00; border-bottom: 2px solid #ff6f00; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .score-display { text-align: center; background: #f5f5f5; padding: 20px; border-radius: 10px; }
            .question-item { margin-bottom: 15px; padding: 10px; border-left: 3px solid #ccc; }
            .correct { border-left-color: #28a745; background-color: #f8fff8; }
            .incorrect { border-left-color: #dc3545; background-color: #fff8f8; }
            .question-text { font-weight: bold; margin-bottom: 8px; }
            .answer-text { margin: 4px 0; }
            .correct-answer { color: #28a745; font-weight: bold; }
            .user-answer { color: #dc3545; }
            .explanation { background: #f8f9fa; padding: 8px; border-radius: 4px; margin-top: 8px; font-style: italic; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Quiz Results Certificate</h1>
            <h2>${selectedResult.destination}</h2>
          </div>
          
          <div class="section">
            <h3>Student Information</h3>
            <div class="info-grid">
              <div><strong>Student Name:</strong> ${selectedResult.userName}</div>
              <div><strong>Course/Destination:</strong> ${selectedResult.destination}</div>
              <div><strong>Date Taken:</strong> ${selectedResult.date ? new Date(selectedResult.date).toLocaleString() : 'N/A'}</div>
              ${selectedResult.timeTaken ? `<div><strong>Time Taken:</strong> ${Math.floor(selectedResult.timeTaken / 60)}:${(selectedResult.timeTaken % 60).toString().padStart(2, '0')}</div>` : ''}
            </div>
          </div>
          
          <div class="section">
            <h3>Performance Summary</h3>
            <div class="score-display">
              <div style="font-size: 48px; font-weight: bold; color: #ff6f00;">${selectedResult.percentage}%</div>
              <div style="font-size: 24px; color: ${getPerformanceColor(selectedResult.percentage)};">${selectedResult.remark}</div>
              <div>Score: ${selectedResult.score} out of ${selectedResult.totalQuestions}</div>
            </div>
          </div>
          
          <div class="section">
            <h3>Question Breakdown</h3>
            ${selectedResult.answers && selectedResult.answers.length > 0 ? selectedResult.answers.map((answer, index) => `
              <div class="question-item ${answer.isCorrect ? 'correct' : 'incorrect'}">
                <div class="question-text"><strong>Q${index + 1}:</strong> ${answer.question}</div>
                <div class="answer-text ${answer.isCorrect ? 'correct-answer' : 'user-answer'}">
                  <strong>Your Answer:</strong> ${answer.selectedOption} ${answer.isCorrect ? '✓' : '✗'}
                </div>
                <div class="answer-text correct-answer">
                  <strong>Correct Answer:</strong> ${answer.correctAnswer}
                </div>
                ${answer.explanation ? `<div class="explanation"><strong>Explanation:</strong> ${answer.explanation}</div>` : ''}
              </div>
            `).join('') : '<p>No answer details available.</p>'}
          </div>
          
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #ff6f00; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Print Results
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const downloadCertificate = (result) => {
    generateCertificate(result);
  };

  // UPDATED CERTIFICATE GENERATION WITH ENHANCED WATERMARK VISIBILITY
  const generateCertificate = (result) => {
    try {
      // Safe data extraction with fallbacks
      const certificateName = (userData?.name && userData.name !== 'Student' ? userData.name : (result.userName || 'Valued Participant')) || 'Valued Participant';
      const courseName = result.destination || 'Course Completion';
      const completionDate = result.date ? new Date(result.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'a recent date';
      const percentageScore = result.percentage || 0;
      const isPassed = percentageScore >= 60;
      const badgeText = isPassed ? 'CERTIFICATE OF ACHIEVEMENT' : 'CERTIFICATE OF PARTICIPATION';
      const primaryColor = '#ff6f00';
      const secondaryColor = '#1a237e';
      
      // Safe filename generation
      const safeCertificateName = (certificateName || 'Student').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const safeCourseName = (courseName || 'Course').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `${safeCertificateName}_${safeCourseName}_Certificate.pdf`;

      // Certificate HTML Content with Cloudinary Logo and ENHANCED WATERMARK
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
                
                /* Watermark Styles - ENHANCED VISIBILITY */
                .watermark {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    pointer-events: none;
                    z-index: 1;
                    opacity: 0.15; /* INCREASED FROM 0.1 to 0.15 */
                }
                .watermark-text {
                    position: absolute;
                    font-size: 140px; /* INCREASED SIZE */
                    font-weight: 900; /* BOLDER */
                    color: #e0e0e0; /* LIGHTER GRAY FOR BETTER VISIBILITY */
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
                
                /* Logo Styles - ADJUSTED TO PREVENT OVERLAP */
                .logo-container {
                    position: absolute;
                    top: 20px; /* MOVED HIGHER */
                    left: 2px; /* MOVED MORE TO THE LEFT */
                    z-index: 2;
                    text-align: center;
                }
                .academy-logo {
                    width: 80px; /* REDUCED SIZE */
                    height: 80px; /* REDUCED SIZE */
                    object-fit: contain;
                    margin-bottom: 5px;
                    border-radius: 8px;
                }
                .logo-text {
                    font-size: 12px; /* SMALLER TEXT */
                    font-weight: bold;
                    color: ${secondaryColor};
                    margin: 0;
                    font-family: 'Arial', sans-serif;
                }
                
                .title {
                    color: ${secondaryColor};
                    font-size: 36pt; 
                    font-weight: bold;
                    margin-top: 30px; /* ADDED TOP MARGIN TO PREVENT OVERLAP */
                    margin-bottom: 10pt;
                    position: relative;
                    z-index: 2;
                }
                .subtitle {
                    color: ${primaryColor};
                    font-size: 20pt; 
                    margin-bottom: 20pt;
                    text-transform: uppercase;
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
                    margin-top: 40pt;
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
                        opacity: 0.12 !important; /* SLIGHTLY REDUCED FOR PRINT */
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
                <!-- ENHANCED WATERMARK -->
                <div class="watermark">
                    <div class="watermark-text">THE CONCLAVE ACADEMY</div>
                </div>
                
                <div class="inner-border">
                    <!-- Logo Container with Cloudinary URL -->
                    <div class="logo-container">
                        <img src="https://res.cloudinary.com/dnc3s4u7q/image/upload/v1760389693/conclave_logo_ygplob.jpg" alt="The Conclave Academy Logo" class="academy-logo">
                        <p class="logo-text">THE CONCLAVE ACADEMY</p>
                    </div>

                    <p class="title">${badgeText}</p>
                    <p class="award-text">is proudly presented to</p>
                    
                    <h1 class="name">${certificateName}</h1>
                    
                    <p class="award-text">For successfully completing the course</p>
                    
                    <h2 class="course-text">"${courseName}"</h2>
                    
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
                            <p style="font-weight: bold;">Date</p>
                            <p>${new Date().toLocaleDateString()}</p>
                        </div>
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

  const clearFilters = () => {
    setFilterCriteria({
      minScore: '',
      maxScore: '',
      dateFrom: '',
      dateTo: '',
      performance: ''
    });
    setSearchTerm('');
    showCustomAlert('All filters cleared.', 'success');
  };

  const groupResultsByCourse = () => {
    const groups = {};
    filteredResults.forEach(result => {
      const course = result.destination || 'Unknown Course';
      if (!groups[course]) {
        groups[course] = {
          courseName: course,
          results: [],
          totalAttempts: 0,
          averageScore: 0,
          bestScore: 0
        };
      }
      groups[course].results.push(result);
      groups[course].totalAttempts++;
      groups[course].averageScore = (
        groups[course].results.reduce((sum, r) => sum + r.percentage, 0) / 
        groups[course].results.length
      ).toFixed(1);
      groups[course].bestScore = Math.max(...groups[course].results.map(r => r.percentage));
    });
    return groups;
  };

  const toggleGroup = (courseName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [courseName]: !prev[courseName]
    }));
  };

  const viewDetailedResult = (result) => {
    setSelectedResult(result);
    setShowModal(true);
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return '#28a745';
    if (percentage >= 60) return '#007bff';
    if (percentage >= 40) return '#ffc107';
    return '#dc3545';
  };

  const getRemarkColor = (remark) => {
    switch (remark) {
      case 'Excellent': return 'success';
      case 'Good': return 'primary';
      case 'Fair': return 'warning';
      case 'Needs Improvement': return 'danger';
      default: return 'secondary';
    }
  };

  // Enhanced detailed answer display
  const renderQuestionBreakdown = (answers) => {
    if (!answers || answers.length === 0) {
      return (
        <div className="alert alert-info">
          <i className="fas fa-info-circle me-2"></i>
          No detailed answer breakdown available for this quiz.
        </div>
      );
    }

    return answers.map((answer, index) => (
      <div key={index} className={`card mb-3 border-${answer.isCorrect ? 'success' : 'danger'}`}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="flex-grow-1">
              <h6 className="mb-1 text-dark">
                <span className="badge bg-secondary me-2">Q{index + 1}</span>
                {answer.question}
              </h6>
            </div>
            <div className="text-end">
              <span className={`badge bg-${answer.isCorrect ? 'success' : 'danger'} fs-6`}>
                {answer.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
              </span>
            </div>
          </div>
          
          <div className="row mt-2">
            <div className="col-md-6">
              <div className="mb-2">
                <strong className="text-muted">Your Answer:</strong>
                <div className={`p-2 rounded ${answer.isCorrect ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                  {answer.selectedOption}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2">
                <strong className="text-muted">Correct Answer:</strong>
                <div className="p-2 rounded bg-success text-white">
                  {answer.correctAnswer}
                </div>
              </div>
            </div>
          </div>
          
          {answer.explanation && (
            <div className="mt-3 p-3 bg-light rounded">
              <strong className="text-primary">Explanation:</strong>
              <p className="mb-0 mt-1">{answer.explanation}</p>
            </div>
          )}
          
          {answer.options && answer.options.length > 0 && (
            <div className="mt-3">
              <strong className="text-muted">All Options:</strong>
              <div className="d-flex flex-wrap gap-2 mt-1">
                {answer.options.map((option, optIndex) => (
                  <span 
                    key={optIndex}
                    className={`badge ${
                      option === answer.correctAnswer 
                        ? 'bg-success' 
                        : option === answer.selectedOption 
                          ? 'bg-danger' 
                          : 'bg-secondary'
                    }`}
                  >
                    {option}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    ));
  };

  const courseGroups = groupResultsByCourse();

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem', color: '#ff6f00'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-primary" style={{color: '#ff6f00'}}>Loading Your Quiz Results...</h4>
                <p className="text-muted">Please wait while we fetch your performance data</p>
                <button 
                  className="btn btn-outline-primary mt-3"
                  onClick={() => fetchQuizResults()}
                >
                  <i className="fas fa-redo me-2"></i>Retry
                </button>
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
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="fas fa-exclamation-triangle fa-2x me-3"></i>
              <div>
                <h4 className="alert-heading">Oops! Something went wrong</h4>
                <p className="mb-0">{error}</p>
                <div className="mt-3">
                  <button className="btn btn-outline-danger me-2" onClick={() => fetchQuizResults()}>
                    <i className="fas fa-redo me-2"></i>Try Again
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => window.location.reload()}>
                    <i className="fas fa-sync-alt me-2"></i>Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-scores-container" style={{ background: '#f9fafb', minHeight: '100vh' }}>
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
            <div className="card text-white shadow-lg" style={{backgroundColor: '#ff6f00'}}>
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-chart-line me-3"></i>
                      Quiz Scores & Performance
                    </h1>
                    <p className="lead mb-0 opacity-75">Track your learning progress and achievements</p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block" style={{color: '#ff6f00'}}>
                      <h4 className="mb-0 fw-bold">{quizResults.length}</h4>
                      <small>Quizzes Completed</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="row g-3 align-items-center">
                  <div className="col-md-8">
                    <div className="input-group input-group-lg">
                      <span className="input-group-text bg-primary text-white">
                        <i className="fas fa-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name, course, score, date, or performance..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-primary btn-lg w-50"
                        onClick={handleFilterClick}
                      >
                        <i className="fas fa-filter me-2"></i>Filter
                      </button>
                      <button 
                        className="btn btn-primary btn-lg w-50" 
                        style={{backgroundColor: '#ff6f00', borderColor: '#ff6f00'}}
                        onClick={handleExportClick}
                        disabled={filteredResults.length === 0}
                      >
                        <i className="fas fa-download me-2"></i>Export
                      </button>
                    </div>
                  </div>
                </div>

                {/* Advanced Filter Options */}
                {showFilterOptions && (
                  <div className="row mt-4 p-3 bg-light rounded">
                    <div className="col-md-3 mb-2">
                      <label className="form-label">Min Score (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="100"
                        value={filterCriteria.minScore}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, minScore: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">Max Score (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="100"
                        value={filterCriteria.maxScore}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, maxScore: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">From Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterCriteria.dateFrom}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, dateFrom: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">To Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterCriteria.dateTo}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, dateTo: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="form-label">Performance</label>
                      <select
                        className="form-select"
                        value={filterCriteria.performance}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, performance: e.target.value}))}
                      >
                        <option value="">All Performances</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Needs Improvement">Needs Improvement</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-2 d-flex align-items-end">
                      <button 
                        className="btn btn-outline-secondary me-2"
                        onClick={clearFilters}
                      >
                        Clear Filters
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowFilterOptions(false)}
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                )}

                {searchTerm && (
                  <div className="mt-2">
                    <small className="text-muted">
                      Found {filteredResults.length} results for "{searchTerm}"
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {quizResults.length === 0 ? (
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center py-5">
                  <div className="empty-state-icon mb-4">
                    <i className="fas fa-clipboard-list fa-4x text-muted"></i>
                  </div>
                  <h3 className="text-muted fw-bold mb-3">No Quiz Results Found</h3>
                  <p className="text-muted mb-4">
                    {userData && userData.name ? 
                      `No quiz results found for ${userData.name}. Start your learning journey by taking a course quiz!` : 
                      'No quiz results found. Please complete a quiz to see your results here.'
                    }
                  </p>
                  <div className="d-flex flex-column gap-2 align-items-center">
                    <small className="text-muted mb-3">
                      Recent quiz submissions may take a few moments to appear.
                    </small>
                    <div className="row g-3 justify-content-center">
                      <div className="col-auto">
                        <button 
                          className="btn btn-primary btn-lg" 
                          style={{backgroundColor: '#ff6f00', borderColor: '#ff6f00'}}
                          onClick={() => window.location.href = '/destinations'}
                        >
                          <i className="fas fa-book me-2"></i>Browse Courses
                        </button>
                      </div>
                      <div className="col-auto">
                        <button 
                          className="btn btn-outline-primary btn-lg" 
                          style={{borderColor: '#ff6f00', color: '#ff6f00'}}
                          onClick={() => fetchQuizResults()}
                        >
                          <i className="fas fa-sync-alt me-2"></i>Refresh Results
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="row mb-4">
              <div className="col-md-3 mb-3">
                <div className="card text-white h-100 shadow" style={{backgroundColor: '#28a745'}}>
                  <div className="card-body text-center">
                    <i className="fas fa-trophy fa-2x mb-2"></i>
                    <h3 className="fw-bold">
                      {quizResults.length > 0 ? Math.round(quizResults.reduce((acc, curr) => acc + curr.percentage, 0) / quizResults.length) : 0}%
                    </h3>
                    <p className="mb-0">Average Score</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card text-white h-100 shadow" style={{backgroundColor: '#17a2b8'}}>
                  <div className="card-body text-center">
                    <i className="fas fa-check-circle fa-2x mb-2"></i>
                    <h3 className="fw-bold">
                      {quizResults.filter(r => r.percentage >= 60).length}
                    </h3>
                    <p className="mb-0">Passed Quizzes</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card text-white h-100 shadow" style={{backgroundColor: '#ffc107', color: '#000'}}>
                  <div className="card-body text-center">
                    <i className="fas fa-star fa-2x mb-2"></i>
                    <h3 className="fw-bold">
                      {quizResults.length > 0 ? Math.max(...quizResults.map(r => r.percentage)) : 0}%
                    </h3>
                    <p className="mb-0">Best Score</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card text-white h-100 shadow" style={{backgroundColor: '#dc3545'}}>
                  <div className="card-body text-center">
                    <i className="fas fa-clock fa-2x mb-2"></i>
                    <h3 className="fw-bold">
                      {quizResults.length}
                    </h3>
                    <p className="mb-0">Total Attempts</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grouped Results Table */}
            <div className="row">
              <div className="col-12">
                <div className="card shadow-lg border-0">
                  <div className="card-header bg-white py-3">
                    <h4 className="mb-0" style={{color: '#1a237e'}}>
                      <i className="fas fa-list-alt me-2"></i>
                      Quiz Results by Course
                    </h4>
                    <small className="text-muted">
                      Showing {filteredResults.length} of {quizResults.length} results
                    </small>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-dark" style={{backgroundColor: '#1a237e'}}>
                          <tr>
                            <th className="ps-4" style={{width: '50px'}}></th>
                            <th>Course & Performance Summary</th>
                            <th className="text-center">Attempts</th>
                            <th className="text-center">Average Score</th>
                            <th className="text-center">Best Score</th>
                            <th className="text-center pe-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(courseGroups).map((group, groupIndex) => (
                            <React.Fragment key={group.courseName}>
                              {/* Group Header Row */}
                              <tr 
                                className="group-header hover-shadow" 
                                style={{cursor: 'pointer', backgroundColor: expandedGroups[group.courseName] ? '#f8f9fa' : 'white'}}
                                onClick={() => toggleGroup(group.courseName)}
                              >
                                <td className="ps-4">
                                  <i className={`fas fa-chevron-${expandedGroups[group.courseName] ? 'down' : 'right'} text-primary`}></i>
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div className="me-3">
                                      <i className="fas fa-book fa-2x text-primary"></i>
                                    </div>
                                    <div>
                                      <h6 className="mb-1 fw-bold text-dark">{group.courseName}</h6>
                                      <small className="text-muted">
                                        {group.results.length} submission{group.results.length !== 1 ? 's' : ''}
                                      </small>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-center">
                                  <span className="badge fs-6 py-2 px-3" style={{backgroundColor: '#ff6f00'}}>
                                    {group.totalAttempts}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span className={`badge fs-6 py-2 px-3 bg-${getPerformanceColor(group.averageScore)}`}>
                                    {group.averageScore}%
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span className={`badge fs-6 py-2 px-3 bg-${getPerformanceColor(group.bestScore)}`}>
                                    {group.bestScore}%
                                  </span>
                                </td>
                                <td className="text-center pe-4">
                                  <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGroup(group.courseName);
                                    }}
                                  >
                                    <i className={`fas fa-${expandedGroups[group.courseName] ? 'minus' : 'plus'} me-1`}></i>
                                    {expandedGroups[group.courseName] ? 'Collapse' : 'Expand'}
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Expanded Rows */}
                              {expandedGroups[group.courseName] && group.results.map((result, index) => (
                                <tr key={result._id || index} className="group-detail">
                                  <td className="ps-5">
                                    <i className="fas fa-user text-muted"></i>
                                  </td>
                                  <td>
                                    <div className="ps-3">
                                      <h6 className="mb-1 fw-bold text-dark">{result.userName}</h6>
                                      <small className="text-muted">
                                        Completed on {result.date ? new Date(result.date).toLocaleDateString() : 'Unknown date'}
                                        {result.timeTaken && ` • ${Math.floor(result.timeTaken / 60)}:${(result.timeTaken % 60).toString().padStart(2, '0')}`}
                                      </small>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge bg-info fs-6">
                                      {result.score}/{result.totalQuestions}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span className={`badge fs-6 bg-${getPerformanceColor(result.percentage)}`}>
                                      {result.percentage}%
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span className={`badge fs-6 bg-${getRemarkColor(result.remark)}`}>
                                      {result.remark}
                                    </span>
                                  </td>
                                  <td className="text-center pe-4">
                                    <div className="btn-group" role="group">
                                      <button 
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => viewDetailedResult(result)}
                                        title="View Details"
                                        style={{borderColor: '#ff6f00', color: '#ff6f00'}}
                                      >
                                        <i className="fas fa-eye"></i>
                                      </button>
                                      <button 
                                        className="btn btn-outline-success btn-sm"
                                        onClick={() => downloadCertificate(result)}
                                        title="Download Certificate"
                                      >
                                        <i className="fas fa-download"></i>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Detailed Result Modal */}
        {showModal && selectedResult && (
          <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header text-white" style={{backgroundColor: '#ff6f00'}}>
                  <h5 className="modal-title">
                    <i className="fas fa-analytics me-2"></i>
                    Detailed Quiz Results - {selectedResult.destination}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Quiz Information</h6>
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Student Name:</span>
                          <strong>{selectedResult.userName}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Course/Destination:</span>
                          <strong>{selectedResult.destination}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Date Taken:</span>
                          <strong>{selectedResult.date ? new Date(selectedResult.date).toLocaleString() : 'N/A'}</strong>
                        </li>
                        {selectedResult.timeTaken && (
                          <li className="list-group-item d-flex justify-content-between">
                            <span>Time Taken:</span>
                            <strong>{Math.floor(selectedResult.timeTaken / 60)}:{(selectedResult.timeTaken % 60).toString().padStart(2, '0')}</strong>
                          </li>
                        )}
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <h6>Performance Summary</h6>
                      <div className="text-center p-3 bg-light rounded">
                        <div className="display-4 fw-bold" style={{color: '#ff6f00'}}>{selectedResult.percentage}%</div>
                        <div className={`badge bg-${getPerformanceColor(selectedResult.percentage)} fs-6`}>
                          {selectedResult.remark}
                        </div>
                        <div className="mt-2">
                          <small className="text-muted">
                            Score: {selectedResult.score} out of {selectedResult.totalQuestions}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <hr />
                  
                  <h6>Question Breakdown</h6>
                  <div className="question-breakdown">
                    {renderQuestionBreakdown(selectedResult.answers)}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Close
                  </button>
                  <button type="button" className="btn btn-primary" style={{backgroundColor: '#ff6f00', borderColor: '#ff6f00'}} onClick={printResults}>
                    <i className="fas fa-print me-2"></i>Print Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .group-header:hover {
          background-color: #f8f9fa !important;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        .group-detail {
          background-color: #fafafa;
          border-left: 4px solid #ff6f00;
        }
        
        .group-detail:hover {
          background-color: #f0f0f0;
        }
        
        .hover-shadow:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        /* Custom Alert Styles */
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

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default QuizScores;