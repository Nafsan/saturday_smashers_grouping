import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    IconButton,
    Typography,
    CircularProgress,
    Divider,
} from '@mui/material';
import { X, Trophy } from 'lucide-react';
import { getAdminAuthCookie } from '../utils/cookieUtils';
import {
    submitClubTournamentResults,
    updateClubTournamentResults,
} from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    RESULTS_SUBMITTED_MESSAGE,
    RESULTS_UPDATED_MESSAGE,
    RANK_CHAMPION,
    RANK_RUNNER_UP,
    RANK_SEMI_FINALIST,
    RANK_QUARTER_FINALIST,
    RANK_EMOJIS,
} from '../utils/clubTournamentConstants';

const SubmitClubResultsDialog = ({ open, onClose, tournament }) => {
    const { successNotification, errorNotification } = useToast();
    const isEditing = !!tournament?.result;

    const [totalPlayers, setTotalPlayers] = useState(0);
    const [champion, setChampion] = useState('');
    const [runnerUp, setRunnerUp] = useState('');
    const [semi1, setSemi1] = useState('');
    const [semi2, setSemi2] = useState('');
    const [qf1, setQf1] = useState('');
    const [qf2, setQf2] = useState('');
    const [qf3, setQf3] = useState('');
    const [qf4, setQf4] = useState('');
    const [onlineLink, setOnlineLink] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && tournament) {
            if (tournament.result) {
                setTotalPlayers(tournament.total_players || 0);
                setChampion(tournament.result.champion || '');
                setRunnerUp(tournament.result.runner_up || '');
                setSemi1(tournament.result.semi_finalist_1 || '');
                setSemi2(tournament.result.semi_finalist_2 || '');
                setQf1(tournament.result.quarter_finalist_1 || '');
                setQf2(tournament.result.quarter_finalist_2 || '');
                setQf3(tournament.result.quarter_finalist_3 || '');
                setQf4(tournament.result.quarter_finalist_4 || '');
                setOnlineLink(tournament.online_link || '');
            } else {
                resetForm();
                setTotalPlayers(tournament.total_players || 0);
                setOnlineLink(tournament.online_link || '');
            }
        }
    }, [open, tournament]);

    const resetForm = () => {
        setTotalPlayers(0);
        setChampion('');
        setRunnerUp('');
        setSemi1('');
        setSemi2('');
        setQf1('');
        setQf2('');
        setQf3('');
        setQf4('');
        setOnlineLink('');
    };

    const handleSubmit = async () => {
        if (!champion.trim() || !runnerUp.trim()) {
            errorNotification('Champion and Runner Up are required');
            return;
        }
        if (!semi1.trim() || !semi2.trim()) {
            errorNotification('Both Semi Finalists are required');
            return;
        }


        setLoading(true);
        try {
            const password = getAdminAuthCookie();
            const payload = {
                total_players: totalPlayers || 0,
                champion: champion.trim(),
                runner_up: runnerUp.trim(),
                semi_finalist_1: semi1.trim(),
                semi_finalist_2: semi2.trim(),
                quarter_finalist_1: qf1.trim() || null,
                quarter_finalist_2: qf2.trim() || null,
                quarter_finalist_3: qf3.trim() || null,
                quarter_finalist_4: qf4.trim() || null,
                online_link: onlineLink.trim() || null,
            };

            if (isEditing) {
                await updateClubTournamentResults(tournament.id, payload, password);
                successNotification(RESULTS_UPDATED_MESSAGE);
            } else {
                await submitClubTournamentResults(tournament.id, payload, password);
                successNotification(RESULTS_SUBMITTED_MESSAGE);
            }
            onClose(true);
        } catch (err) {
            errorNotification(err.response?.data?.detail || 'Failed to save results');
        } finally {
            setLoading(false);
        }
    };

    if (!tournament) return null;

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
                    background: 'var(--gradient-success)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Trophy size={22} />
                    {isEditing ? 'Edit Results' : 'Submit Results'}
                </Box>
                <IconButton onClick={() => onClose(false)} sx={{ color: 'white' }}>
                    <X />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>
                    {tournament.category} at {tournament.venue?.name}
                </Typography>

                <TextField
                    label="Tournament Online Link"
                    value={onlineLink}
                    onChange={(e) => setOnlineLink(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="https://stadiumcompete.com/..."
                />

                <TextField
                    label="Total Players"
                    type="number"
                    value={totalPlayers}
                    onChange={(e) => setTotalPlayers(parseInt(e.target.value) || 0)}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                />

                <Divider sx={{ my: 0.5 }} />

                {/* Champion */}
                <TextField
                    label={`${RANK_EMOJIS.champion} ${RANK_CHAMPION}`}
                    value={champion}
                    onChange={(e) => setChampion(e.target.value)}
                    required
                    fullWidth
                    size="small"
                />

                {/* Runner Up */}
                <TextField
                    label={`${RANK_EMOJIS.runner_up} ${RANK_RUNNER_UP}`}
                    value={runnerUp}
                    onChange={(e) => setRunnerUp(e.target.value)}
                    required
                    fullWidth
                    size="small"
                />

                <Divider sx={{ my: 0.5 }} />

                {/* Semi Finalists */}
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {RANK_EMOJIS.semi_finalist} {RANK_SEMI_FINALIST}S
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <TextField
                        label="Semi Finalist 1"
                        value={semi1}
                        onChange={(e) => setSemi1(e.target.value)}
                        required
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="Semi Finalist 2"
                        value={semi2}
                        onChange={(e) => setSemi2(e.target.value)}
                        required
                        fullWidth
                        size="small"
                    />
                </Box>

                <Divider sx={{ my: 0.5 }} />

                {/* Quarter Finalists */}
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {RANK_EMOJIS.quarter_finalist} {RANK_QUARTER_FINALIST}S
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <TextField
                        label="QF 1"
                        value={qf1}
                        onChange={(e) => setQf1(e.target.value)}
                        sx={{ flex: '1 1 45%' }}
                        size="small"
                    />
                    <TextField
                        label="QF 2"
                        value={qf2}
                        onChange={(e) => setQf2(e.target.value)}
                        sx={{ flex: '1 1 45%' }}
                        size="small"
                    />
                    <TextField
                        label="QF 3"
                        value={qf3}
                        onChange={(e) => setQf3(e.target.value)}
                        sx={{ flex: '1 1 45%' }}
                        size="small"
                    />
                    <TextField
                        label="QF 4"
                        value={qf4}
                        onChange={(e) => setQf4(e.target.value)}
                        sx={{ flex: '1 1 45%' }}
                        size="small"
                    />
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
                    sx={{ background: 'var(--gradient-success)', color: 'white' }}
                >
                    {loading ? <CircularProgress size={24} /> : isEditing ? 'Update Results' : 'Submit Results'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SubmitClubResultsDialog;
