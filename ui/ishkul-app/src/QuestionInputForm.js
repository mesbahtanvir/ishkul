import React, { useState } from 'react';

const QuestionInputForm = () => {
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''] }]);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''] }]);
  };

  const handleQuestionChange = (index, event) => {
    const newQuestions = [...questions];
    newQuestions[index].question = event.target.value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (questionIndex, optionIndex, event) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = event.target.value;
    setQuestions(newQuestions);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Add your form submission logic here
    console.log('Form submitted', questions);
  };

  return (
    <div className="form-side">
      <h2>Exam Details</h2>
      {/* Add input fields for exam name, date, institution, etc here */}
      <div>
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="question-block">
            <div className="question-number">
              <input
                type="text"
                readOnly
                value={`Question ${qIndex + 1}`}
              />
            </div>
            <div className="question-text">
              <input
                type="text"
                value={q.question}
                onChange={(e) => handleQuestionChange(qIndex, e)}
                placeholder="Question"
              />
            </div>
            <div className="options">
              {q.options.map((option, oIndex) => (
                <input
                  key={oIndex}
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(qIndex, oIndex, e)}
                  placeholder={`Option ${oIndex + 1}`}
                  className={`option ${oIndex % 2 === 0 ? 'option-left' : 'option-right'}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={addQuestion}>Add Question</button>
      <form onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default QuestionInputForm;
