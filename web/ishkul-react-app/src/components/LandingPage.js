// @flow

import React, { useState } from 'react';
import Modal from './modal/GetNotifiedModal'; // Import the Modal component
import ErrorModal from './modal/ErrorModal';
import SuccessModal from './modal/SuccessModal';
import './LandingPage.css';

const LandingPage = () => {
     const [showModal, setShowModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    const handleOpenModal = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    return (
        <div className="landing-container">
            <div className="top-art"></div>
            <h1>AI Powered Admission Test Preparation Tool</h1>
            <p className="intro-text">
                Unlock the future of education with our cutting-edge AI tool, tailored to 
                revolutionize your admission test preparation. Stay ahead of the curve by 
                getting access to personalized learning paths, real-time feedback, and 
                insights that align perfectly with your academic goals. Don't miss out on 
                transforming the way you learn. Be the first to experience the power of AI 
                in education.
            </p>
            <button className="notify-button" onClick={handleOpenModal}>Get Notified</button>
            <Modal show={showModal} onClose={handleCloseModal}
                   onSuccess={() => { setShowSuccessModal(true); setShowModal(false); }}
                   onError={() => { setShowErrorModal(true); setShowModal(false); }} />
            <SuccessModal show={showSuccessModal} onClose={() => setShowSuccessModal(false)} />
            <ErrorModal show={showErrorModal} onClose={() => setShowErrorModal(false)} />
        </div>
    );
}

export default LandingPage;
