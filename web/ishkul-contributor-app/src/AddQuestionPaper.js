import React, { useState } from 'react';
import axios from 'axios';

function AddQuestionPaper() {
  const [formData, setFormData] = useState({
    resource_url: '',
    institution: '',
    year: '',
    subject: '',
    exam_name: '',
    exam_type: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://api.ishkul.org/contrib/exam_paper', {
        resource_url: formData.resource_url,
        metadata: { ...formData }
      });
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        name="resource_url" 
        value={formData.resource_url} 
        onChange={handleChange} 
        placeholder="Resource URL" 
      />
      <input 
        type="text" 
        name="institution" 
        value={formData.institution} 
        onChange={handleChange} 
        placeholder="Institution" 
      />
      <input 
        type="text" 
        name="year" 
        value={formData.year} 
        onChange={handleChange} 
        placeholder="Year" 
      />
      <input 
        type="text" 
        name="subject" 
        value={formData.subject} 
        onChange={handleChange} 
        placeholder="Subject" 
      />
      <input 
        type="text" 
        name="exam_name" 
        value={formData.exam_name} 
        onChange={handleChange} 
        placeholder="Exam Name" 
      />
      <input 
        type="text" 
        name="exam_type" 
        value={formData.exam_type} 
        onChange={handleChange} 
        placeholder="Exam Type" 
      />
      <button type="submit">Submit</button>
    </form>
  );
}

export default AddQuestionPaper;
