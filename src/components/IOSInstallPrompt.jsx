import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import './IOSInstallPrompt.scss';

const IOSInstallPrompt = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 1. Detect if it's an iOS device
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        // 2. Detect if it's already running in standalone mode (installed)
        const isStandalone = window.navigator.standalone === true || 
                            window.matchMedia('(display-mode: standalone)').matches;

        // 3. Check if we've already shown this in this session
        const hasDismissed = sessionStorage.getItem('ios-prompt-dismissed');

        if (isIOS && !isStandalone && !hasDismissed) {
            // Show prompt after a short delay to not annoy the user immediately
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('ios-prompt-dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="ios-install-prompt">
            <button className="close-btn" onClick={handleDismiss}>
                <X size={18} />
            </button>
            <div className="prompt-content">
                <div className="app-icon-mini">
                    <img src="/favicon.png" alt="App Icon" />
                </div>
                <div className="text-content">
                    <h3>Install Saturday Smashers</h3>
                    <p>Install this app on your home screen for quick access and a native experience.</p>
                </div>
            </div>
            <div className="instruction-steps">
                <div className="step">
                    <span className="icon-wrapper share">
                        <Share size={20} />
                    </span>
                    <p>Tap the <strong>Share</strong> button</p>
                </div>
                <div className="step">
                    <span className="icon-wrapper plus">
                        <PlusSquare size={20} />
                    </span>
                    <p>Select <strong>'Add to Home Screen'</strong></p>
                </div>
            </div>
            <div className="prompt-arrow"></div>
        </div>
    );
};

export default IOSInstallPrompt;
