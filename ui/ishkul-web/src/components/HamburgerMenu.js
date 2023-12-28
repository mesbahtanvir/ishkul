// @flow

import React, { useState } from 'react';

const HamburgerMenu = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div>
            <button onClick={toggleMenu}>
                {/* Here you can add an icon or text for the menu button */}
                Menu
            </button>
            {isOpen && (
                <div>
                    {/* Add your menu items here */}
                    <a href="/">Home</a>
                    <a href="/about">About</a>
                    <a href="/contact">Contact</a>
                </div>
            )}
        </div>
    );
};

export default HamburgerMenu;
