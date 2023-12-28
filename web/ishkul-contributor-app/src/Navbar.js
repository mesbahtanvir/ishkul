import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <ul>
        <li><Link to="/add-question-paper">Add Question Paper</Link></li>
        <li><Link to="/review-question-paper">Review Question Paper</Link></li>
      </ul>
    </nav>
  );
}

export default Navbar;
