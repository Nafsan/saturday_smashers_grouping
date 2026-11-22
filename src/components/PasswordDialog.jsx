import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Alert } from '@mui/material';
import { isAdminAuthenticated } from '../utils/cookieUtils';

const PasswordDialog = ({ open, onSuccess, onCancel, title = 'Admin authentication', description }) => {
    const [error, setError] = useState('');
    useEffect(() => {
        if (open && isAdminAuthenticated() && onSuccess) {
            Promise.resolve().then(() => onSuccess()).catch(err => setError(err.message || 'Action failed'));
        }
        if (!open) setError('');
    }, [open]);
    return <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
            <Typography>{description || 'Sign in with an approved Google account to continue.'}</Typography>
            {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
            <Button onClick={onCancel}>Cancel</Button>
            <Button component="a" href={`${import.meta.env.VITE_API_URL || '/api'}/auth/google/login`} variant="contained">Sign in with Google</Button>
        </DialogActions>
    </Dialog>;
};
export default PasswordDialog;
