import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadRankingAsync, updateRankingAsync, deleteRankingAsync, selectAllPlayerNames } from '../store/appSlice';
import {
    TextField,
    Autocomplete,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Box,
    Chip,
    IconButton,
    CircularProgress,
    useMediaQuery
} from '@mui/material';
import { Upload, X, Lock, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { setAdminAuthCookie, getAdminAuthCookie } from '../utils/cookieUtils';
import PasswordDialog from './PasswordDialog';
import './RankSubmission.scss';

const RankSubmission = ({ open, onClose, initialData }) => {
    const dispatch = useDispatch();
    const allPlayers = useSelector(selectAllPlayerNames);
    const { successNotification, errorNotification, warningNotification } = useToast();
    const isMobile = useMediaQuery('(max-width:600px)');

    // Form State
    const [cupChampion, setCupChampion] = useState(null);
    const [cupRunnerUp, setCupRunnerUp] = useState(null);
    const [cupSemis, setCupSemis] = useState([]);
    const [cupQuarters, setCupQuarters] = useState([]);

    const [plateChampion, setPlateChampion] = useState(null);
    const [plateRunnerUp, setPlateRunnerUp] = useState(null);
    const [plateSemis, setPlateSemis] = useState([]);
    const [plateQuarters, setPlateQuarters] = useState([]);

    const [tournamentDate, setTournamentDate] = useState(new Date().toISOString().split('T')[0]);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [embedUrl, setEmbedUrl] = useState('');

    // Admin State
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Populate form if editing
    useEffect(() => {
        if (initialData) {
            setTournamentDate(initialData.date);

            // Helper to find players by rank/rating
            const findPlayers = (rating) => {
                const group = initialData.ranks.find(r => r.rating === rating);
                return group ? group.players : [];
            };

            setCupChampion(findPlayers(1)[0] || null);
            setCupRunnerUp(findPlayers(2)[0] || null);
            setCupSemis(findPlayers(3));
            setCupQuarters(findPlayers(4));

            setPlateChampion(findPlayers(5)[0] || null);
            setPlateRunnerUp(findPlayers(6)[0] || null);
            setPlateSemis(findPlayers(7));
            setPlateQuarters(findPlayers(8));
            setEmbedUrl(initialData.embed_url || '');
            setPlaylistUrl(initialData.playlist_url || '');
        } else {
            // Reset form if not editing
            setCupChampion(null);
            setCupRunnerUp(null);
            setCupSemis([]);
            setCupQuarters([]);
            setPlateChampion(null);
            setPlateRunnerUp(null);
            setPlateSemis([]);
            setPlateQuarters([]);
            setTournamentDate(new Date().toISOString().split('T')[0]);
            setPlaylistUrl('');
            setEmbedUrl('');
        }

        // Check Admin Cookie
        const storedPassword = getAdminAuthCookie();
        if (storedPassword === 'ss_admin_panel') {
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
    }, [initialData, open]);

    // Upload State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        // 1. Mandatory Fields Validation
        if (!cupChampion || !cupRunnerUp || cupSemis.length === 0) {
            warningNotification("Cup Champion, Runner Up, and Semi Finalists are mandatory!");
            return;
        }
        if (!plateChampion || !plateRunnerUp || plateSemis.length === 0) {
            warningNotification("Plate Champion, Runner Up, and Semi Finalists are mandatory!");
            return;
        }

        // 2. Max Players Validation
        if (cupSemis.length !== 2) {
            warningNotification("Cup Semi Finals must have exactly 2 players.");
            return;
        }
        if (plateSemis.length !== 2) {
            warningNotification("Plate Semi Finals must have exactly 2 players.");
            return;
        }
        if (cupQuarters.length > 4) {
            warningNotification("Cup Quarter Finals cannot have more than 4 players.");
            return;
        }
        if (plateQuarters.length > 4) {
            warningNotification("Plate Quarter Finals cannot have more than 4 players.");
            return;
        }

        // 3. Unique Players Validation
        const allSelectedPlayers = [
            cupChampion, cupRunnerUp, ...cupSemis, ...cupQuarters,
            plateChampion, plateRunnerUp, ...plateSemis, ...plateQuarters
        ].filter(Boolean); // Remove nulls

        const uniquePlayers = new Set(allSelectedPlayers);
        if (uniquePlayers.size !== allSelectedPlayers.length) {
            warningNotification("A player cannot be selected multiple times!");
            return;
        }
        // Check if we have a stored password in cookie
        const storedPassword = getAdminAuthCookie();
        if (storedPassword && storedPassword === 'ss_admin_panel') {
            // Auto-submit with stored password without showing dialog
            confirmUpload(storedPassword);
        } else {
            // Show password dialog
            setShowPasswordModal(true);
        }
    };

    const buildTournamentData = () => {
        const ranks = [];

        // Cup - Dynamic rank assignment
        let cupRank = 1;
        let ratingCounter = 1;

        if (cupChampion) {
            ranks.push({ rank: cupRank, rating: ratingCounter, players: [cupChampion] });
            cupRank++;
            ratingCounter++;
        }

        if (cupRunnerUp) {
            ranks.push({ rank: cupRank, rating: ratingCounter, players: [cupRunnerUp] });
            cupRank++;
            ratingCounter++;
        }

        if (cupSemis.length > 0) {
            ranks.push({ rank: cupRank, rating: ratingCounter, players: cupSemis });
            cupRank += cupSemis.length;
            ratingCounter++;
        }

        if (cupQuarters.length > 0) {
            ranks.push({ rank: cupRank, rating: ratingCounter, players: cupQuarters });
            cupRank += cupQuarters.length;
            ratingCounter++;
        }

        // Calculate total cup players to determine plate starting rank
        const totalCupPlayers =
            (cupChampion ? 1 : 0) +
            (cupRunnerUp ? 1 : 0) +
            cupSemis.length +
            cupQuarters.length;

        // Plate - Dynamic ranks based on cup players
        let plateStartRank = totalCupPlayers + 1;

        if (plateChampion) {
            ranks.push({ rank: plateStartRank, rating: ratingCounter, players: [plateChampion] });
            plateStartRank++;
            ratingCounter++;
        }

        if (plateRunnerUp) {
            ranks.push({ rank: plateStartRank, rating: ratingCounter, players: [plateRunnerUp] });
            plateStartRank++;
            ratingCounter++;
        }

        if (plateSemis.length > 0) {
            ranks.push({ rank: plateStartRank, rating: ratingCounter, players: plateSemis });
            plateStartRank += plateSemis.length;
            ratingCounter++;
        }

        if (plateQuarters.length > 0) {
            ranks.push({ rank: plateStartRank, rating: ratingCounter, players: plateQuarters });
        }

        return {
            id: initialData ? initialData.id : `t_${tournamentDate.replace(/-/g, '_')}`,
            date: tournamentDate,
            playlist_url: playlistUrl || null,
            embed_url: embedUrl || null,
            ranks: ranks
        };
    };

    const confirmUpload = async (password) => {
        if (password !== "ss_admin_panel") {
            errorNotification("Incorrect Password!");
            throw new Error("Incorrect Password"); // Throw error to be caught by PasswordDialog
        }

        setIsSubmitting(true);
        try {
            const data = buildTournamentData();
            if (initialData) {
                await dispatch(updateRankingAsync({ id: initialData.id, tournamentData: data, password })).unwrap();
                successNotification("Ranking Updated Successfully! 🔄");
            } else {
                await dispatch(uploadRankingAsync({ tournamentData: data, password })).unwrap();
                successNotification("Ranking Uploaded Successfully! 🏆");
            }

            setShowPasswordModal(false);
            if (onClose) onClose();
        } catch (err) {
            errorNotification(`Upload Failed: ${err.message}`);
            throw err; // Re-throw to let PasswordDialog handle the error
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLoginSuccess = (password) => {
        if (password === "ss_admin_panel") {
            setAdminAuthCookie(password);
            setIsAdmin(true);
            setShowLoginModal(false);
            successNotification("Logged in as Admin");
        } else {
            errorNotification("Incorrect Password");
        }
    };

    const handleDelete = async (password) => {
        // Password here comes from confirmation logic or we use "ss_admin_panel"
        // If coming from PasswordDialog (if we used it), it would be passed.
        // If calling directly with "ss_admin_panel", it works.
        const effectivePassword = password || "ss_admin_panel";

        setIsDeleting(true);
        try {
            await dispatch(deleteRankingAsync({ id: initialData.id, password: effectivePassword })).unwrap();
            successNotification("Tournament Deleted Successfully!");
            setShowDeleteConfirm(false);
            if (onClose) onClose();
        } catch (err) {
            errorNotification(`Delete Failed: ${err.message}`);
            // If we used a dialog that expects throwing, we should throw. 
            // But here we use standard Dialog, so we just log/notify.
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                className="rank-submission-dialog"
                PaperProps={{
                    sx: {
                        width: isMobile ? '97%' : undefined,
                        maxHeight: isMobile ? '95vh' : undefined,
                        margin: isMobile ? '8px' : undefined
                    }
                }}
            >
                <DialogTitle sx={{ p: isMobile ? 1.5 : 2, pr: 6 }}>
                    {initialData ? (isAdmin ? 'Edit Tournament Results' : 'Tournament Details') : 'Submit Tournament Results'}
                    <IconButton
                        aria-label="close"
                        onClick={onClose}
                        sx={{
                            position: 'absolute',
                            right: isMobile ? 4 : 8,
                            top: isMobile ? 4 : 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <X />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: isMobile ? 1.5 : 3 }}>
                    <Box sx={{ mb: isMobile ? 1.5 : 3 }}>
                        <TextField
                            label="Tournament Date"
                            type="date"
                            value={tournamentDate}
                            onChange={(e) => setTournamentDate(e.target.value)}
                            fullWidth
                            size={isMobile ? "small" : "medium"}
                            InputLabelProps={{ shrink: true }}
                            disabled={!isAdmin}
                        />
                    </Box>

                    <div className="rank-section">
                        <Typography variant="h6" className="section-title cup" style={{ marginBottom: isMobile ? '0.5rem' : '1rem' }}>🏆 Cup Bracket</Typography>

                        <div className="form-group" style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
                            <Autocomplete
                                options={allPlayers}
                                value={cupChampion}
                                onChange={(e, newValue) => setCupChampion(newValue)}
                                size={isMobile ? "small" : "medium"}
                                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || String(option))}
                                isOptionEqualToValue={(option, value) => {
                                    const optionName = typeof option === 'string' ? option : option.name;
                                    const valueName = typeof value === 'string' ? value : value?.name;
                                    return optionName === valueName;
                                }}
                                renderInput={(params) => <TextField {...params} label="Cup Champion" variant="outlined" InputLabelProps={{ shrink: true }} />}
                                disabled={!isAdmin}
                                readOnly={!isAdmin}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
                            <Autocomplete
                                options={allPlayers}
                                value={cupRunnerUp}
                                onChange={(e, newValue) => setCupRunnerUp(newValue)}
                                size={isMobile ? "small" : "medium"}
                                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || String(option))}
                                isOptionEqualToValue={(option, value) => {
                                    const optionName = typeof option === 'string' ? option : option.name;
                                    const valueName = typeof value === 'string' ? value : value?.name;
                                    return optionName === valueName;
                                }}
                                renderInput={(params) => <TextField {...params} label="Cup Runner Up" variant="outlined" InputLabelProps={{ shrink: true }} />}
                                disabled={!isAdmin}
                                readOnly={!isAdmin}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
                            <Autocomplete
                                multiple
                                options={allPlayers}
                                value={cupSemis}
                                onChange={(e, newValue) => setCupSemis(newValue)}
                                size={isMobile ? "small" : "medium"}
                                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || String(option))}
                                isOptionEqualToValue={(option, value) => {
                                    const optionName = typeof option === 'string' ? option : option.name;
                                    const valueName = typeof value === 'string' ? value : value?.name;
                                    return optionName === valueName;
                                }}
                                renderInput={(params) => <TextField {...params} label="Cup Semi Finalists (2 players)" variant="outlined" InputLabelProps={{ shrink: true }} />}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const playerName = typeof option === 'string' ? option : (option.name || String(option));
                                        return <Chip key={index} variant="outlined" label={playerName} size={isMobile ? "small" : "medium"} {...getTagProps({ index })} />;
                                    })
                                }
                                disabled={!isAdmin}
                                readOnly={!isAdmin}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
                            <Autocomplete
                                multiple
                                options={allPlayers}
                                value={cupQuarters}
                                onChange={(e, newValue) => setCupQuarters(newValue)}
                                size={isMobile ? "small" : "medium"}
                                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || String(option))}
                                isOptionEqualToValue={(option, value) => {
                                    const optionName = typeof option === 'string' ? option : option.name;
                                    const valueName = typeof value === 'string' ? value : value?.name;
                                    return optionName === valueName;
                                }}
                                renderInput={(params) => <TextField {...params} label="Cup Quarter Finalists" variant="outlined" InputLabelProps={{ shrink: true }} />}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const playerName = typeof option === 'string' ? option : (option.name || String(option));
                                        return <Chip key={index} variant="outlined" label={playerName} size={isMobile ? "small" : "medium"} {...getTagProps({ index })} />;
                                    })
                                }
                                disabled={!isAdmin}
                                readOnly={!isAdmin}
                            />
                        </div>
                    </div>

                    <div className="rank-section">
                        <Typography variant="h6" className="section-title plate" style={{ marginBottom: isMobile ? '0.5rem' : '1rem' }}>🍽️ Plate Bracket</Typography>

                        <div className="form-group" style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
                            <Autocomplete
                                options={allPlayers}
                                value={plateChampion}
                                onChange={(e, newValue) => setPlateChampion(newValue)}
                                size={isMobile ? "small" : "medium"}
                                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || String(option))}
                                isOptionEqualToValue={(option, value) => {
                                    const optionName = typeof option === 'string' ? option : option.name;
                                    const valueName = typeof value === 'string' ? value : value?.name;
                                    return optionName === valueName;
                                }}
                                renderInput={(params) => <TextField {...params} label="Plate Champion" variant="outlined" InputLabelProps={{ shrink: true }} />}
                                disabled={!isAdmin}
                                readOnly={!isAdmin}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
                            <Autocomplete
                                options={allPlayers}
                                value={plateRunnerUp}
                                onChange={(e, newValue) => setPlateRunnerUp(newValue)}
                                size={isMobile ? "small" : "medium"}
                                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || String(option))}
                                isOptionEqualToValue={(option, value) => {
                                    const optionName = typeof option === 'string' ? option : option.name;
                                    const valueName = typeof value === 'string' ? value : value?.name;
                                    return optionName === valueName;
                                }}
                                renderInput={(params) => <TextField {...params} label="Plate Runner Up" variant="outlined" InputLabelProps={{ shrink: true }} />}
                                disabled={!isAdmin}
                                readOnly={!isAdmin}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
                            <Autocomplete
                                multiple
                                options={allPlayers}
                                value={plateSemis}
                                onChange={(e, newValue) => setPlateSemis(newValue)}
                                size={isMobile ? "small" : "medium"}
                                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || String(option))}
                                isOptionEqualToValue={(option, value) => {
                                    const optionName = typeof option === 'string' ? option : option.name;
                                    const valueName = typeof value === 'string' ? value : value?.name;
                                    return optionName === valueName;
                                }}
                                renderInput={(params) => <TextField {...params} label="Plate Semi Finalists" variant="outlined" InputLabelProps={{ shrink: true }} />}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const playerName = typeof option === 'string' ? option : (option.name || String(option));
                                        return <Chip key={index} variant="outlined" label={playerName} size={isMobile ? "small" : "medium"} {...getTagProps({ index })} />;
                                    })
                                }
                                disabled={!isAdmin}
                                readOnly={!isAdmin}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
                            <Autocomplete
                                multiple
                                options={allPlayers}
                                value={plateQuarters}
                                onChange={(e, newValue) => setPlateQuarters(newValue)}
                                size={isMobile ? "small" : "medium"}
                                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || String(option))}
                                isOptionEqualToValue={(option, value) => {
                                    const optionName = typeof option === 'string' ? option : option.name;
                                    const valueName = typeof value === 'string' ? value : value?.name;
                                    return optionName === valueName;
                                }}
                                renderInput={(params) => <TextField {...params} label="Plate Quarter Finalists" variant="outlined" InputLabelProps={{ shrink: true }} />}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const playerName = typeof option === 'string' ? option : (option.name || String(option));
                                        return <Chip key={index} variant="outlined" label={playerName} size={isMobile ? "small" : "medium"} {...getTagProps({ index })} />;
                                    })
                                }
                                disabled={!isAdmin}
                                readOnly={!isAdmin}
                            />
                        </div>
                    </div>

                    {/* YouTube Fields - Only Visible to Admin */}
                    {isAdmin && (
                        <Box sx={{ mt: 4, mb: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#FF0000', fontWeight: 'bold' }}>
                                📺 YouTube Links (Optional)
                            </Typography>

                            <Box sx={{ mb: 2 }}>
                                <TextField
                                    label="YouTube Playlist URL"
                                    type="url"
                                    value={playlistUrl}
                                    onChange={(e) => setPlaylistUrl(e.target.value)}
                                    fullWidth
                                    placeholder="https://www.youtube.com/playlist?list=..."
                                    helperText="Link to tournament video playlist"
                                />
                            </Box>

                            <Box>
                                <TextField
                                    label="YouTube Embed Code"
                                    multiline
                                    rows={3}
                                    value={embedUrl}
                                    onChange={(e) => setEmbedUrl(e.target.value)}
                                    fullWidth
                                    placeholder='<iframe width="560" height="315" src="https://www.youtube.com/embed/..." ...></iframe>'
                                    helperText="Paste the full iframe embed code from YouTube"
                                />
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ padding: isMobile ? '0.75rem 1rem' : '1.5rem' }}>

                    {!isAdmin && (
                        <Button
                            onClick={() => setShowLoginModal(true)}
                            color="primary"
                            startIcon={<Lock size={18} />}
                            sx={{ marginRight: 'auto' }}
                        >
                            Login as Admin
                        </Button>
                    )}

                    {isAdmin && initialData && (
                        <Button
                            onClick={() => setShowDeleteConfirm(true)}
                            color="error"
                            startIcon={<Trash2 size={18} />}
                            sx={{ marginRight: 'auto' }}
                        >
                            Delete Tournament
                        </Button>
                    )}

                    <Button onClick={onClose} color="inherit">
                        {isAdmin ? 'Cancel' : 'Close'}
                    </Button>

                    {isAdmin && (
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={isSubmitting}
                            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Upload size={18} />}
                            sx={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                padding: '0.5rem 1.5rem',
                                fontWeight: 'bold'
                            }}
                        >
                            {isSubmitting ? 'Processing...' : (initialData ? 'Update Results' : 'Upload Results')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Login Modal */}
            <PasswordDialog
                open={showLoginModal}
                onSuccess={handleLoginSuccess}
                onCancel={() => setShowLoginModal(false)}
                title="Admin Login"
                description="Enter admin password to edit details."
            />

            {/* Upload/Update Authentication (Only if not already admin authenticated via cookie) */}
            <PasswordDialog
                open={showPasswordModal}
                onSuccess={confirmUpload}
                onCancel={() => setShowPasswordModal(false)}
                title="Admin Authentication"
                description="Please enter the admin password to submit tournament results."
            />

            {/* Simple Delete Confirmation Dialog */}
            <Dialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                PaperProps={{
                    sx: {
                        width: isMobile ? '97%' : undefined,
                        maxHeight: isMobile ? '95vh' : undefined,
                        margin: isMobile ? '8px' : undefined
                    }
                }}
            >
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this tournament? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                    <Button
                        onClick={() => handleDelete("ss_admin_panel")}
                        color="error"
                        variant="contained"
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default RankSubmission;
