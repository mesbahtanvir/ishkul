import React, { useState } from 'react';
import axios from 'axios';
import GetIshkulBaseURL from 'ishkul-common/utils';
import Input from "@mui/material/Input"
import Form from "@mui/material/FormGroup"
import Button from "@mui/material/Button"

function SubmitExamPaper() {
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
      const baseUrl = GetIshkulBaseURL();
      const endpoint = baseUrl + "/contrib/exam_paper"
      await axios.post(endpoint, {
        resource_url: formData.resource_url,
        metadata: { ...formData }
      });
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input 
        type="text" 
        name="resource_url" 
        value={formData.resource_url} 
        onChange={handleChange} 
        placeholder="Resource URL" 
      />
      <Input 
        type="text" 
        name="institution" 
        value={formData.institution} 
        onChange={handleChange} 
        placeholder="Institution" 
      />
      <Input 
        type="text" 
        name="year" 
        value={formData.year} 
        onChange={handleChange} 
        placeholder="Year" 
      />
      <Input 
        type="text" 
        name="subject" 
        value={formData.subject} 
        onChange={handleChange} 
        placeholder="Subject" 
      />
      <Input 
        type="text" 
        name="exam_name" 
        value={formData.exam_name} 
        onChange={handleChange} 
        placeholder="Exam Name" 
      />
      <Input 
        type="text" 
        name="exam_type" 
        value={formData.exam_type} 
        onChange={handleChange} 
        placeholder="Exam Type" 
      />
      <Button type="submit">Submit</Button>
    </Form>
  );
}

export default SubmitExamPaper;
