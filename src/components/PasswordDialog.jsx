import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';
import { Lock } from 'lucide-react';
import { getAdminAuthCookie, setAdminAuthCookie } from '../utils/cookieUtils';

/**
 * Reusable Password Dialog Component
 * Handles admin authentication with cookie persistence
 * 
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onSuccess - Callback when authentication succeeds (receives password)
 * @param {function} onCancel - Callback when user cancels
 * @param {string} title - Optional custom title
 * @param {string} description - Optional description text
 */
const PasswordDialog = ({
    open,
    onSuccess,
    onCancel,
    title = "Admin Authentication",
    description = null
}) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-load password from cookie when dialog opens
    useEffect(() => {
        if (open) {
            const storedPassword = getAdminAuthCookie();
            if (storedPassword) {
                setPassword(storedPassword);
                // Auto-submit if we have a stored password
                handleSubmit(storedPassword);
            }
        } else {
            // Reset state when dialog closes
            setPassword('');
            setError('');
            setIsSubmitting(false);
        }
    }, [open]);

    const handleSubmit = async (passwordToVerify = password) => {
        if (!passwordToVerify) {
            setError('Please enter a password');
            return;
        }

        if (passwordToVerify !== 'ss_admin_panel') {
            setError('Incorrect password');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Store password in cookie after successful verification
            setAdminAuthCookie(passwordToVerify);

            // Call success callback
            if (onSuccess) {
                await onSuccess(passwordToVerify);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
            setIsSubmitting(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isSubmitting) {
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Lock size={24} />
                    {title}
                </Box>
            </DialogTitle>
            <DialogContent sx={{ mt: 3 }}>
                {description && (
                    <Box sx={{ mb: 2, color: '#94a3b8', fontSize: '0.875rem' }}>
                        {description}
                    </Box>
                )}
                <TextField
                    fullWidth
                    type="password"
                    label="Enter Admin Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    error={!!error}
                    helperText={error}
                    autoFocus
                    disabled={isSubmitting}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onCancel} color="inherit" disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    onClick={() => handleSubmit()}
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        }
                    }}
                >
                    {isSubmitting ? 'Verifying...' : 'Submit'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PasswordDialog;
