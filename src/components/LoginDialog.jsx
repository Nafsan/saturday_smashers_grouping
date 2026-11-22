import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

const LoginDialog = ({ open, onClose }) => (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Admin sign in</DialogTitle>
        <DialogContent><Typography>Sign in with an approved Google account.</Typography></DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button component="a" href={`${import.meta.env.VITE_API_URL || '/api'}/auth/google/login`} variant="contained">
                Sign in with Google
            </Button>
        </DialogActions>
    </Dialog>
);
export default LoginDialog;
