import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, IconButton, TextField, Typography, useMediaQuery,
} from '@mui/material';
import { Lock, Save, X, Youtube } from 'lucide-react';
import MDEditor, { commands } from '@uiw/react-md-editor';
import ReactMarkdown from 'react-markdown';
import { updateUnofficialTournamentAsync } from '../store/appSlice';
import { useToast } from '../context/ToastContext';
import { getAdminAuthCookie, isAdminAuthenticated, setAdminAuthCookie } from '../utils/cookieUtils';
import { isYouTubePlaylistUrl } from '../utils/youtubeUtils';
import PasswordDialog from './PasswordDialog';
import './UnofficialTournamentDialog.scss';

const descriptionCommands = [
    commands.bold, commands.italic, commands.title, commands.divider,
    commands.unorderedListCommand, commands.orderedListCommand,
    commands.quote, commands.link,
];

const UnofficialTournamentDialog = ({ open, onClose, tournament }) => {
    const dispatch = useDispatch();
    const theme = useSelector(state => state.app.theme);
    const { successNotification, errorNotification } = useToast();
    const isMobile = useMediaQuery('(max-width:600px)');
    const [isAdmin, setIsAdmin] = useState(isAdminAuthenticated);
    const [showLogin, setShowLogin] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState(tournament.playlist_url || '');
    const [description, setDescription] = useState(tournament.description || '');
    const [preview, setPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [urlError, setUrlError] = useState('');

    useEffect(() => {
        const checkAuth = () => setIsAdmin(isAdminAuthenticated());
        window.addEventListener('authStatusChanged', checkAuth);
        return () => window.removeEventListener('authStatusChanged', checkAuth);
    }, []);

    const handleSave = async () => {
        const url = playlistUrl.trim();
        if (url && !isYouTubePlaylistUrl(url)) {
            setUrlError('Enter a valid YouTube playlist URL containing a list ID.');
            return;
        }
        setSaving(true);
        try {
            await dispatch(updateUnofficialTournamentAsync({
                id: tournament.id,
                details: { playlist_url: url || null, description: description.trim() || null },
                password: getAdminAuthCookie(),
            })).unwrap();
            successNotification('Unofficial tournament details saved');
            onClose();
        } catch (error) {
            errorNotification(error?.message || 'Failed to save tournament details. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogin = (password) => {
        const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'ss_admin_panel';
        if (password !== adminPassword) {
            throw new Error('Incorrect password');
        }
        setAdminAuthCookie(password);
        window.dispatchEvent(new Event('authStatusChanged'));
        setShowLogin(false);
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={saving ? undefined : onClose}
                maxWidth="md"
                fullWidth
                className="unofficial-tournament-dialog"
                aria-labelledby="unofficial-tournament-title"
                PaperProps={{ sx: { m: isMobile ? 1 : 4, width: isMobile ? 'calc(100% - 16px)' : undefined } }}
            >
                <DialogTitle id="unofficial-tournament-title" sx={{ pr: 6 }}>
                    Unofficial Tournament Details
                    <IconButton aria-label="Close tournament details" onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <X />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: isMobile ? 2 : 3 }}>
                    <Typography sx={{ mb: 2 }}>{tournament.date}</Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        This friendly tournament is unranked. Standings recorded in the description do not affect player rankings.
                    </Alert>
                    {isAdmin ? (
                        <TextField
                            label="YouTube Playlist URL (optional)"
                            type="url"
                            value={playlistUrl}
                            onChange={(event) => { setPlaylistUrl(event.target.value); setUrlError(''); }}
                            placeholder="https://www.youtube.com/playlist?list=..."
                            fullWidth
                            disabled={saving}
                            error={Boolean(urlError)}
                            helperText={urlError || 'Attach a playlist of videos from this tournament.'}
                            inputProps={{ maxLength: 500 }}
                        />
                    ) : tournament.playlist_url && (
                        <Button component="a" href={tournament.playlist_url} target="_blank" rel="noopener noreferrer" startIcon={<Youtube size={18} />}>
                            Watch YouTube playlist
                        </Button>
                    )}
                    <Box sx={{ mt: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                            <Typography component="h2" variant="subtitle1" id="unofficial-description-label">Tournament description</Typography>
                            {isAdmin && (
                                <Button size="small" onClick={() => setPreview(value => !value)} disabled={saving}>
                                    {preview ? 'Edit description' : 'Preview'}
                                </Button>
                            )}
                        </Box>
                        {isAdmin && !preview ? (
                            <div data-color-mode={theme}>
                                <Typography variant="body2" sx={{ mb: 1, color: 'var(--text-secondary)' }}>
                                    Describe the format, standings, and highlights. Use the toolbar for headings, bold, lists, and links.
                                </Typography>
                                <MDEditor
                                    value={description}
                                    onChange={value => setDescription(value || '')}
                                    preview="edit"
                                    commands={descriptionCommands}
                                    extraCommands={[]}
                                    height={isMobile ? 260 : 320}
                                    textareaProps={{
                                        'aria-label': 'Tournament description',
                                        'aria-labelledby': 'unofficial-description-label',
                                        placeholder: 'Add the format, manual standings, match notes, and highlights...',
                                        disabled: saving,
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="tournament-description">
                                {description.trim() ? (
                                    <ReactMarkdown skipHtml>{description}</ReactMarkdown>
                                ) : (
                                    <Typography color="text.secondary">No tournament description yet.</Typography>
                                )}
                            </div>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    {!isAdmin && <Button startIcon={<Lock size={18} />} onClick={() => setShowLogin(true)} sx={{ mr: 'auto' }}>Login as Admin</Button>}
                    <Button onClick={onClose} disabled={saving}>{isAdmin ? 'Cancel' : 'Close'}</Button>
                    {isAdmin && (
                        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}>
                            {saving ? 'Saving...' : 'Save details'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
            <PasswordDialog open={showLogin} onSuccess={handleLogin} onCancel={() => setShowLogin(false)} title="Admin Login" description="Enter the admin password to edit tournament details." />
        </>
    );
};

export default UnofficialTournamentDialog;
