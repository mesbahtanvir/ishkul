import React, { useState } from 'react';
import Modal from './modal/Modal'; // Import the Modal component
import './LandingPage.css';

const LandingPage = () => {
    const [showModal, setShowModal] = useState(false);

    const handleOpenModal = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    return (
        <div className="landing-container">
            <div className="top-art">
                {/* Your art element */}
            </div>
            <h1>AI Powered Admission Test Preparation Tool</h1>
            <button className="notify-button" onClick={handleOpenModal}>Get Notified</button>
            <Modal show={showModal} onClose={handleCloseModal} />
        </div>
    );
}

export default LandingPage;
