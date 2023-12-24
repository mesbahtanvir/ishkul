// @flow

import React, { useState } from 'react';
import './GetNotifiedModal.css'; // Updated CSS file

const Modal = ({ show, onClose, onSuccess, onError}) => {
    const [email, setEmail] = useState('');
    if (!show) {
        return null;
    }
    const handleEmailChange = (event) => {
        setEmail(event.target.value);
    };
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevents the default form submission behavior
        var apiUrl = process.env.ISHKUL_BACKEND_API_HOST;
        if (process.env.NODE_ENV === 'development') {
            apiUrl = "http://0.0.0.0:8080"
        } else if (process.env.NODE_ENV === 'production') {
            // Code that will run only in production environment
            apiUrl = "https://api.ishkul.org"
        } else {
            apiUrl = "https://api.ishkul.org"
        }

        const endpoint = apiUrl + "/notifyme"; // Replace with your actual endpoint URL
        const payload = { email };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            console.log(response)
            if (response.ok) {
                // Handle successful response
                console.log('Email submitted:', email);
                onSuccess()
            } else {
                // Handle errors
                console.error('Submission failed');
                onError()
            }
        } catch (error) {
            console.error('Error:', error);
            onError()
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Latest Updates</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="modal-body">
                    <p>To receive timely information about our newest product features:</p>
                    <input
                        type="email"
                        placeholder="Enter Your Email Address"
                        value={email}
                        onChange={handleEmailChange} />
                    <button
                        className="submit-button"
                        onClick={handleSubmit}>Subscribe</button>
                </div>
            </div>
        </div>
    );
    
}

export default Modal;
