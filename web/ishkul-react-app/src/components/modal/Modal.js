import React from 'react';
import './Modal.css'; // Updated CSS file

const Modal = ({ show, onClose }) => {
    if (!show) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Stay Updated!</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="modal-body">
                    <p>Enter your email to get the latest updates:</p>
                    <input type="email" placeholder="Your Email" />
                    <button className="submit-button">Notify Me</button>
                </div>
            </div>
        </div>
    );
}

export default Modal;
