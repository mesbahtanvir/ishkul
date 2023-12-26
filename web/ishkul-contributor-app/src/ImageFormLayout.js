import React from 'react';
import QuestionInputForm from './QuestionInputForm';
import ImageComponent from './ImageComponent';

const ImageFormLayout = () => {
  return (
    <div className="image-form-layout">
      <ImageComponent />
      <QuestionInputForm />
    </div>
  );
}

export default ImageFormLayout;
