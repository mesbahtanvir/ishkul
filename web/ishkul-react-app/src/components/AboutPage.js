import React from 'react';

const AboutPage = () => {
 console.log("im here")
  return (
    <div className="about-container">
      <h1>About Us</h1>
      <p>Welcome to our company! We are dedicated to providing the best service possible.</p>
      
      {/* Company History Section */}
      <section className="history-section">
        <h2>Our History</h2>
        <p>Founded in 2010, we have been committed to innovation and excellence.</p>
        {/* You can add more detailed history here */}
      </section>

      {/* Team Section */}
      <section className="team-section">
        <h2>Meet Our Team</h2>
        <div className="team-members">
          {/* Example team member */}
          <div className="team-member">
            <img src="path-to-image.jpg" alt="Team Member" />
            <h3>Jane Doe</h3>
            <p>CEO & Founder</p>
          </div>
          {/* Repeat for other team members */}
        </div>
      </section>

      {/* Fun Facts or Statistics */}
      <section className="fun-facts">
        <h2>Fun Facts</h2>
        <ul>
          <li><strong>100K+</strong> Happy Customers</li>
          <li><strong>50+</strong> Awards Won</li>
          <li><strong>10 Years</strong> in Business</li>
          {/* Add more facts as desired */}
        </ul>
      </section>
    </div>
  );
};

export default AboutPage;
