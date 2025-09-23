// src/services/quizService.js
import api from './api';

export const submitQuizResults = async (resultsData) => {
  try {
    const response = await api.post('/quiz/results', resultsData);
    return response.data;
  } catch (error) {
    console.error('Error submitting quiz results:', error);
    throw error;
  }
};

export const fetchQuizResults = async (userId = null) => {
  try {
    const url = userId ? `/quiz-results?userId=${userId}` : '/quiz-results';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    throw error;
  }
};

// New function to fetch quiz questions
export const fetchQuizQuestions = async (courseId) => {
  try {
    const response = await api.get(`/quiz/questions?courseId=${courseId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    throw error;
  }
};