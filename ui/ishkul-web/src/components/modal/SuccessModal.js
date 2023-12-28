import React, { useEffect } from 'react';
import './SuccessModal.css';

const SuccessModal = ({ show, onClose }) => {
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
