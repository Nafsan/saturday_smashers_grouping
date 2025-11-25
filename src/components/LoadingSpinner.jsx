import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import './LoadingSpinner.scss';

const sportsQuotes = [
    "Champions keep playing until they get it right.",
    "The harder the battle, the sweeter the victory.",
    "It's not whether you get knocked down, it's whether you get up.",
    "The only way to prove you're a good sport is to lose.",
    "Winning isn't everything, but wanting to win is.",
    "The difference between the impossible and the possible lies in determination.",
    "You miss 100% of the shots you don't take.",
    "Success is where preparation and opportunity meet.",
    "The more difficult the victory, the greater the happiness in winning.",
    "A champion is someone who gets up when they can't.",
    "Talent wins games, but teamwork wins championships.",
    "The only place success comes before work is in the dictionary."
];

const LoadingSpinner = () => {
    const [currentQuote, setCurrentQuote] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentQuote((prev) => (prev + 1) % sportsQuotes.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <Box className="loading-spinner-container">
            <Box className="table-tennis-scene">
                {/* Table Tennis Table */}
                <div className="ping-pong-table">
                    <div className="table-surface"></div>
                    <div className="table-net"></div>
                    <div className="table-line"></div>
                </div>

                {/* Animated Ball */}
                <div className="ball-container">
                    <div className="ping-pong-ball"></div>
                </div>

                {/* Paddles */}
                <div className="paddle paddle-left">
                    <div className="paddle-handle"></div>
                    <div className="paddle-rubber"></div>
                </div>
                <div className="paddle paddle-right">
                    <div className="paddle-handle"></div>
                    <div className="paddle-rubber"></div>
                </div>

                {/* Players (simplified) */}
                <div className="player player-left">
                    <div className="player-head"></div>
                    <div className="player-body"></div>
                </div>
                <div className="player player-right">
                    <div className="player-head"></div>
                    <div className="player-body"></div>
                </div>
            </Box>

            {/* Loading Text */}
            <Typography variant="h5" className="loading-text">
                Loading Tournament Data...
            </Typography>

            {/* Rotating Quotes */}
            <Box className="quote-container">
                <Typography variant="body1" className="quote-text">
                    "{sportsQuotes[currentQuote]}"
                </Typography>
            </Box>

            {/* Spinning Dots */}
            <Box className="dots-container">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
            </Box>
        </Box>
    );
};

export default LoadingSpinner;
