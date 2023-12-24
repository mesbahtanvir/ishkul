// @flow

import React from 'react';
import './SuccessModal.css'; // Create this CSS file for styling

const SuccessModal = ({ show, onClose }) => {
    if (!show) {
        return null;
    }

    return (
        <div className="success-modal-backdrop">
            <div className="success-modal-content">
                <h2>Success!</h2>
                <p>Your email has been successfully registered. You will be notified!</p>
                <button onClick={onClose} className="close-button">Close</button>
            </div>
        </div>
    );
}

export default SuccessModal;
