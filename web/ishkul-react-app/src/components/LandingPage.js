// @flow

import React, { useState } from 'react';
import Modal from './modal/GetNotifiedModal'; // Import the Modal component
import SuccessModal from './modal/ErrorModal';
import ErrorModal from './modal/SuccessModal';
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
