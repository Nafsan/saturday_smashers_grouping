import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../store/appSlice';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.scss';

const ThemeToggle = () => {
    const dispatch = useDispatch();
    const theme = useSelector(state => state.app.theme);

    const handleToggle = () => {
        dispatch(toggleTheme());
    };

    // Temporarily hidden the button. Will reintroduce after it's implemented properly.

    return (
        <button
            className="theme-toggle"
            onClick={handleToggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? (
                <Sun className="theme-icon" size={20} />
            ) : (
                <Moon className="theme-icon" size={20} />
            )}
        </button>
    );
};

export default ThemeToggle;
