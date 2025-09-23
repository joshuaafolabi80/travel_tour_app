// src/components/QuizQuestion.jsx
import React, { useState } from 'react';
import ExplanationPanel from './ExplanationPanel';

const QuizQuestion = ({ question, questionNumber, totalQuestions, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleOptionClick = (option) => {
    if (selectedOption) return; // Prevent re-selecting
    
    setSelectedOption(option);
    const isCorrect = option === question.correctAnswer;
    onAnswer(option, isCorrect);
  };

  const getOptionClass = (option) => {
    if (!selectedOption) return "option";
    
    if (option === question.correctAnswer) {
      return "option correct";
    } else if (option === selectedOption && option !== question.correctAnswer) {
      return "option incorrect";
    }
    return "option";
  };

  return (
    <div className="quiz-question-container">
      <div className="progress-indicator">
        Question {questionNumber} of {totalQuestions}
      </div>
      
      <div className="question-content">
        <h3 className="question-text">{question.question}</h3>
        
        <div className="options-container">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={getOptionClass(option)}
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </div>
          ))}
        </div>

        <button 
          className="explanation-toggle"
          onClick={() => setShowExplanation(!showExplanation)}
        >
          {showExplanation ? 'Hide Explanation' : 'Want more explanation? Ask our AI'}
        </button>

        {showExplanation && (
          <ExplanationPanel 
            question={question.question}
            correctAnswer={question.correctAnswer}
          />
        )}
      </div>
    </div>
  );
};

export default QuizQuestion;