import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress } from '@mui/material';
import { setAdminAuthCookie } from '../utils/cookieUtils';

const LoginDialog = ({ open, onClose, onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!password.trim()) {
            setError('Please enter a password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'ss_admin_panel';

            if (password !== adminPassword) {
                setError('Incorrect password');
                setLoading(false);
                return;
            }

            // Store the password in cookie
            setAdminAuthCookie(password);

            // Notify parent component
            onLoginSuccess();

            // Reset and close
            setPassword('');
            onClose();
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPassword('');
        setError('');
        onClose();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !loading) {
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>Admin Login</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Admin Password"
                    type="password"
                    fullWidth
                    variant="outlined"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    error={!!error}
                    helperText={error}
                    disabled={loading}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'Login'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LoginDialog;
