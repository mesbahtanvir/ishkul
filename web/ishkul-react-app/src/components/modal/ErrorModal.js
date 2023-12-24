import React, { useEffect } from 'react';
import './ErrorModal.css';

const ErrorModal = ({ show, onClose }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

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
