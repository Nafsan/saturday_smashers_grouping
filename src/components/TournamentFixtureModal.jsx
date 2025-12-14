import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Checkbox,
    FormControlLabel,
    Box,
    Typography,
    IconButton,
    InputAdornment
} from '@mui/material';
import { X, Search, UserPlus, Calendar } from 'lucide-react';
import { togglePlayerSelection, setTournamentDate, addTemporaryPlayer, selectAllPlayerNames } from '../store/appSlice';
import { calculateRankings } from '../logic/ranking';
import { useToast } from '../context/ToastContext';
import './TournamentFixtureModal.scss';

const TournamentFixtureModal = ({ open, onClose, onGenerate }) => {
    const dispatch = useDispatch();
    const allPlayers = useSelector(selectAllPlayerNames);
    const { selectedPlayers, history, tournamentDate, temporaryPlayers } = useSelector(state => state.app);
    const { warningNotification } = useToast();

    const [ratingPromptOpen, setRatingPromptOpen] = useState(false);
    const [pendingUnratedPlayers, setPendingUnratedPlayers] = useState([]);
    const [initialRatings, setInitialRatings] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    // Calculate rankings for all players
    const playerRankings = useMemo(() => {
        const rankings = calculateRankings(history, allPlayers, temporaryPlayers);

        // Create a map for quick lookup
        const rankMap = {};
        rankings.forEach((player, index) => {
            rankMap[player.name] = {
                position: index + 1,
                average: player.playedCount === 0 ? '-' : player.average.toFixed(2),
                playedCount: player.playedCount,
                hasNoHistory: player.playedCount === 0
            };
        });

        // Add temporary players with their initial ranks
        // Find the average of the player at that position
        temporaryPlayers.forEach(tempPlayer => {
            // Find the player at the position matching the initial rank
            const playerAtPosition = rankings.find((p, idx) => (idx + 1) === tempPlayer.initialRank);
            const averageAtPosition = playerAtPosition
                ? (playerAtPosition.playedCount === 0 ? '-' : playerAtPosition.average.toFixed(2))
                : tempPlayer.initialRank.toFixed(2);

            rankMap[tempPlayer.name] = {
                position: tempPlayer.initialRank,
                average: averageAtPosition,
                playedCount: 0,
                isTemporary: true,
                hasNoHistory: false
            };
        });

        return rankMap;
    }, [history, allPlayers, temporaryPlayers]);

    // Filter players based on search query
    const filteredPlayers = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return allPlayers.filter(player =>
            player.toLowerCase().includes(query)
        ).sort((a, b) => {
            // Sort by ranking position
            const rankA = playerRankings[a]?.position || 999;
            const rankB = playerRankings[b]?.position || 999;
            return rankA - rankB;
        });
    }, [allPlayers, searchQuery, playerRankings]);

    const handleGenerate = () => {
        if (selectedPlayers.length < 2) {
            warningNotification("Please select at least 2 players.");
            return;
        }

        // Check for unrated players
        const unrated = selectedPlayers.filter(player => {
            const ranking = playerRankings[player];
            // Check if player has no history AND is not already a temporary player (already assigned rank)
            return ranking?.hasNoHistory && !ranking?.isTemporary;
        });

        if (unrated.length > 0) {
            setPendingUnratedPlayers(unrated);
            setRatingPromptOpen(true);
            return;
        }

        onGenerate();
        onClose();
    };

    const handleConfirmRatings = () => {
        // Validate all ratings are entered
        const missingRatings = pendingUnratedPlayers.some(player => !initialRatings[player]);
        if (missingRatings) {
            warningNotification("Please provide ratings for all players.");
            return;
        }

        // Dispatch temporary players
        pendingUnratedPlayers.forEach(player => {
            dispatch(addTemporaryPlayer({
                name: player,
                initialRank: parseInt(initialRatings[player])
            }));
        });

        setRatingPromptOpen(false);
        setPendingUnratedPlayers([]);
        setInitialRatings({});

        onGenerate();
        onClose();
    };

    const handleRatingChange = (player, value) => {
        setInitialRatings(prev => ({
            ...prev,
            [player]: value
        }));
    };

    const handleClose = () => {
        setSearchQuery('');
        setRatingPromptOpen(false);
        setPendingUnratedPlayers([]);
        setInitialRatings({});
        onClose();
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                className="tournament-fixture-modal"
            >
                <DialogTitle>
                    Create Tournament Fixture
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <X />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {/* Tournament Date */}
                    <Box sx={{ mb: 3 }}>
                        <TextField
                            label="Tournament Date"
                            type="date"
                            value={tournamentDate}
                            onChange={(e) => dispatch(setTournamentDate(e.target.value))}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Calendar size={18} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    {/* Search Bar */}
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            placeholder="Search players..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={18} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    {/* Player List */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: '#94a3b8' }}>
                            Selected: {selectedPlayers.length} / {filteredPlayers.length} players
                        </Typography>
                    </Box>

                    <Box className="player-list">
                        {filteredPlayers.map(player => {
                            const ranking = playerRankings[player];
                            const isSelected = selectedPlayers.includes(player);

                            return (
                                <Box
                                    key={player}
                                    className={`player-item ${isSelected ? 'selected' : ''} ${ranking?.isTemporary ? 'temporary' : ''} ${ranking?.hasNoHistory ? 'no-history' : ''}`}
                                    onClick={() => dispatch(togglePlayerSelection(player))}
                                >
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={isSelected}
                                                onChange={() => dispatch(togglePlayerSelection(player))}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        }
                                        label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                                <Box className="player-rank">
                                                    #{ranking?.position || 'N/A'}
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body1">
                                                        {player}
                                                        {ranking?.isTemporary && (
                                                            <span className="temp-badge">TEMP</span>
                                                        )}
                                                        {ranking?.hasNoHistory && !ranking?.isTemporary && (
                                                            <span className="no-history-badge">NO RATING</span>
                                                        )}
                                                    </Typography>
                                                </Box>
                                                <Box className="player-stats">
                                                    <Typography variant="caption" sx={{ color: ranking?.hasNoHistory ? '#f59e0b' : '#94a3b8' }}>
                                                        Avg: {ranking?.average || '-'}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#64748b', ml: 1 }}>
                                                        ({ranking?.playedCount || 0} games)
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        }
                                        sx={{ width: '100%', m: 0 }}
                                    />
                                </Box>
                            );
                        })}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ padding: '1.5rem' }}>
                    <Button onClick={handleClose} color="inherit" sx={{ marginRight: 'auto' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        variant="contained"
                        disabled={selectedPlayers.length < 2}
                        sx={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            padding: '0.5rem 1.5rem',
                            fontWeight: 'bold'
                        }}
                    >
                        Generate Groups ({selectedPlayers.length} players)
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Initial Rating Prompt Dialog */}
            <Dialog
                open={ratingPromptOpen}
                onClose={() => setRatingPromptOpen(false)}
                maxWidth="sm"
                fullWidth
                className="tournament-fixture-modal"
            >
                <DialogTitle>Assign Initial Ratings</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 3, color: '#94a3b8' }}>
                        The following players have no tournament history. Please assign an initial rank (1-20) for this tournament to help with group generation.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {pendingUnratedPlayers.map(player => (
                            <Box key={player} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography sx={{ flex: 1, fontWeight: 500 }}>{player}</Typography>
                                <TextField
                                    type="number"
                                    label="Rank"
                                    size="small"
                                    value={initialRatings[player] || ''}
                                    onChange={(e) => handleRatingChange(player, e.target.value)}
                                    inputProps={{ min: 1, max: 20 }}
                                    sx={{ width: 100 }}
                                />
                            </Box>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ padding: '1.5rem' }}>
                    <Button onClick={() => setRatingPromptOpen(false)} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmRatings}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            fontWeight: 'bold'
                        }}
                    >
                        Confirm & Generate
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default TournamentFixtureModal;
