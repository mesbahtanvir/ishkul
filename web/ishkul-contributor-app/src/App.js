import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './Navbar';
import AddQuestionPaper from './AddQuestionPaper';
import ReviewQuestionPaper from './ReviewQuestionPaper';
import './App.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/add-question-paper" element={<AddQuestionPaper />} />
        <Route path="/review-question-paper" element={<ReviewQuestionPaper />} />
      </Routes>
    </Router>
  );
}

export default App;
