import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('info'); // 'success' | 'info' | 'warning' | 'error'

    const showNotification = useCallback((msg, sev = 'info') => {
        setMessage(msg);
        setSeverity(sev);
        setOpen(true);
    }, []);

    const successNotification = useCallback((msg) => {
        showNotification(msg, 'success');
    }, [showNotification]);

    const errorNotification = useCallback((msg) => {
        showNotification(msg, 'error');
    }, [showNotification]);

    const warningNotification = useCallback((msg) => {
        showNotification(msg, 'warning');
    }, [showNotification]);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    return (
        <ToastContext.Provider value={{ successNotification, errorNotification, warningNotification }}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }} variant="filled">
                    {message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
