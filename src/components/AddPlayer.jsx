import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addPlayerAsync } from '../store/appSlice';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    IconButton
} from '@mui/material';
import { UserPlus, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import './AddPlayer.scss';

const AddPlayer = ({ open, onClose }) => {
    const dispatch = useDispatch();
    const { successNotification, errorNotification, warningNotification } = useToast();
    const [playerName, setPlayerName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [password, setPassword] = useState('');

    const handleInitialSubmit = () => {
        // Validation
        if (!playerName || !playerName.trim()) {
            warningNotification("Player name cannot be empty!");
            return;
        }
        setShowPasswordPrompt(true);
    };

    const handleFinalSubmit = async () => {
        if (!password) {
            warningNotification("Please enter the admin password.");
            return;
        }

        setIsSubmitting(true);
        try {
            await dispatch(addPlayerAsync({ playerName: playerName.trim(), password })).unwrap();
            successNotification(`Player "${playerName.trim()}" added successfully! 🎉`);
            setPlayerName('');
            setPassword('');
            setShowPasswordPrompt(false);
            onClose();
        } catch (err) {
            errorNotification(`Failed to add player: ${err.message || 'Unknown error'}`);
            if (err.message && err.message.includes('password')) {
                // Keep password prompt open if it's just a password error
                setIsSubmitting(false);
            } else {
                setShowPasswordPrompt(false);
                setIsSubmitting(false);
            }
        }
    };

    const handleClose = () => {
        setPlayerName('');
        setPassword('');
        setShowPasswordPrompt(false);
        onClose();
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                className="add-player-dialog"
            >
                <DialogTitle sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    pb: 1,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}>
                    <UserPlus size={28} />
                    <Typography variant="h5" sx={{ fontWeight: 'bold', flex: 1, color: 'white' }}>
                        Add New Player
                    </Typography>
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{
                            color: 'white',
                            '&:hover': {
                                background: 'rgba(255, 255, 255, 0.1)'
                            }
                        }}
                    >
                        <X />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 3, pb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 3, color: '#94a3b8' }}>
                        Enter the name of the new player to add to the system.
                    </Typography>

                    <TextField
                        autoFocus
                        label="Player Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleInitialSubmit();
                            }
                        }}
                        placeholder="Enter player name..."
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset': {
                                    borderColor: '#667eea',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#667eea',
                                },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                                color: '#667eea',
                            },
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button
                        onClick={handleClose}
                        sx={{
                            color: '#94a3b8',
                            '&:hover': {
                                background: 'rgba(148, 163, 184, 0.1)'
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInitialSubmit}
                        variant="contained"
                        startIcon={<UserPlus size={18} />}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '0.5rem 1.5rem',
                            fontWeight: 'bold',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                            }
                        }}
                    >
                        Add Player
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Password Prompt Dialog */}
            <Dialog
                open={showPasswordPrompt}
                onClose={() => setShowPasswordPrompt(false)}
                maxWidth="xs"
                fullWidth
                className="add-player-dialog"
            >
                <DialogTitle sx={{ background: '#1e293b', color: 'white' }}>Admin Authentication</DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 3, background: '#1e293b' }}>
                    <Typography variant="body2" sx={{ mb: 2, color: '#94a3b8' }}>
                        Please enter the admin password to confirm adding <strong>{playerName}</strong>.
                    </Typography>
                    <TextField
                        autoFocus
                        label="Password"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !isSubmitting) {
                                handleFinalSubmit();
                            }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: 'white',
                                '& fieldset': { borderColor: '#475569' },
                                '&:hover fieldset': { borderColor: '#667eea' },
                                '&.Mui-focused fieldset': { borderColor: '#667eea' },
                            },
                            '& .MuiInputLabel-root': { color: '#94a3b8' },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#667eea' },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, background: '#1e293b' }}>
                    <Button
                        onClick={() => setShowPasswordPrompt(false)}
                        sx={{ color: '#94a3b8' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleFinalSubmit}
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontWeight: 'bold'
                        }}
                    >
                        {isSubmitting ? 'Verifying...' : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AddPlayer;
