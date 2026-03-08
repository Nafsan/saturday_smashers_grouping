import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Autocomplete,
    Box,
    IconButton,
    CircularProgress,
    Typography
} from '@mui/material';
import { X, Calendar } from 'lucide-react';
import { getAdminAuthCookie } from '../utils/cookieUtils';
import {
    fetchClubVenues,
    createClubTournament,
    updateClubTournament,
} from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    TOURNAMENT_CREATED_MESSAGE,
    TOURNAMENT_UPDATED_MESSAGE,
} from '../utils/clubTournamentConstants';
import MDEditor from '@uiw/react-md-editor';

const AddClubTournamentDialog = ({ open, onClose, tournament }) => {
    const { successNotification, errorNotification } = useToast();
    const isEditing = !!tournament;

    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [category, setCategory] = useState('');
    const [tournamentDatetime, setTournamentDatetime] = useState('');
    const [announcement, setAnnouncement] = useState('');
    const [totalPlayers, setTotalPlayers] = useState(0);
    const [onlineLink, setOnlineLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [venueLoading, setVenueLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadVenues();
            if (tournament) {
                setSelectedVenue(tournament.venue);
                setCategory(tournament.category || '');
                // Format datetime for input
                const dt = new Date(tournament.tournament_datetime);
                const localISO = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                setTournamentDatetime(localISO);
                setAnnouncement(tournament.announcement || '');
                setTotalPlayers(tournament.total_players || 0);
                setOnlineLink(tournament.online_link || '');
            } else {
                resetForm();
            }
        }
    }, [open, tournament]);

    const loadVenues = async () => {
        setVenueLoading(true);
        try {
            const data = await fetchClubVenues();
            setVenues(data);
        } catch (err) {
            errorNotification('Failed to load venues');
        } finally {
            setVenueLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedVenue(null);
        setCategory('');
        
        // Default to today at 3 PM (15:00)
        const now = new Date();
        now.setHours(15, 0, 0, 0);
        const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        setTournamentDatetime(localISO);
        
        setAnnouncement('');
        setTotalPlayers(0);
        setOnlineLink('');
    };

    const handleSubmit = async () => {
        if (!selectedVenue) {
            errorNotification('Please select a venue');
            return;
        }
        if (!category.trim()) {
            errorNotification('Please enter a tournament category');
            return;
        }
        if (!tournamentDatetime) {
            errorNotification('Please select date and time');
            return;
        }

        setLoading(true);
        try {
            const password = getAdminAuthCookie();
            const payload = {
                venue_id: selectedVenue.id,
                category: category.trim(),
                tournament_datetime: tournamentDatetime,
                announcement: announcement.trim() || null,
                total_players: totalPlayers || 0,
                online_link: onlineLink.trim() || null,
            };

            if (isEditing) {
                await updateClubTournament(tournament.id, payload, password);
                successNotification(TOURNAMENT_UPDATED_MESSAGE);
            } else {
                await createClubTournament(payload, password);
                successNotification(TOURNAMENT_CREATED_MESSAGE);
            }
            onClose(true);
        } catch (err) {
            errorNotification(err.response?.data?.detail || 'Failed to save tournament');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => onClose(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: '16px', overflow: 'hidden' },
            }}
        >
            <DialogTitle
                sx={{
                    background: 'var(--gradient-primary)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Calendar size={22} />
                    {isEditing ? 'Edit Tournament' : 'Add Tournament'}
                </Box>
                <IconButton onClick={() => onClose(false)} sx={{ color: 'white' }}>
                    <X />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Autocomplete
                    options={venues}
                    getOptionLabel={(option) => option.name || ''}
                    value={selectedVenue}
                    onChange={(e, newValue) => setSelectedVenue(newValue)}
                    loading={venueLoading}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Tournament Venue"
                            variant="outlined"
                            required
                            sx={{ mt: 1 }}
                        />
                    )}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {option.logo_base64 ? (
                                <img
                                    src={option.logo_base64}
                                    alt={option.name}
                                    style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }}
                                />
                            ) : null}
                            {option.name}
                        </Box>
                    )}
                />

                <TextField
                    label="Tournament Category"
                    placeholder="e.g. Men's Singles, Open, Mixed Doubles"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    fullWidth
                />

                <TextField
                    label="Date & Time"
                    type="datetime-local"
                    value={tournamentDatetime}
                    onChange={(e) => setTournamentDatetime(e.target.value)}
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    label="Total Players"
                    type="number"
                    value={totalPlayers}
                    onChange={(e) => setTotalPlayers(parseInt(e.target.value))}
                    fullWidth
                    inputProps={{ min: 0 }}
                />

                <TextField
                    label="Tournament Online Link"
                    value={onlineLink}
                    onChange={(e) => setOnlineLink(e.target.value)}
                    fullWidth
                    placeholder="https://stadiumcompete.com/..."
                />

                <Box>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 1, display: 'block' }}>
                        Announcement / Notes (Markdown supported)
                    </Typography>
                    <div data-color-mode="light">
                        <MDEditor
                            value={announcement}
                            onChange={(val) => setAnnouncement(val || '')}
                            preview="edit"
                            height={200}
                            textareaProps={{
                                placeholder: 'Optional announcement or notes about the tournament...'
                            }}
                        />
                    </div>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={() => onClose(false)} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    sx={{ background: 'var(--gradient-primary)', color: 'white' }}
                >
                    {loading ? <CircularProgress size={24} /> : isEditing ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddClubTournamentDialog;
