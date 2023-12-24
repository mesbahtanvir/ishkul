// @flow

import React from 'react';
import './ErrorModal.css'; // Create this CSS file for styling

const ErrorModal = ({ show, onClose }) => {
    if (!show) {
        return null;
    }

    return (
        <div className="error-modal-backdrop">
            <div className="error-modal-content">
                <h2>Error!</h2>
                <p>There was a problem registering your email. Please try again.</p>
                <button onClick={onClose} className="close-button">Close</button>
            </div>
        </div>
    );
}

export default ErrorModal;
