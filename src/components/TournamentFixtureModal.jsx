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
import { togglePlayerSelection, setTournamentDate, addTemporaryPlayer } from '../store/appSlice';
import { calculateRankings } from '../logic/ranking';
import { useToast } from '../context/ToastContext';
import './TournamentFixtureModal.scss';

const TournamentFixtureModal = ({ open, onClose, onGenerate }) => {
    const dispatch = useDispatch();
    const { allPlayers, selectedPlayers, history, tournamentDate, temporaryPlayers } = useSelector(state => state.app);
    const { warningNotification } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerRank, setNewPlayerRank] = useState('');

    // Calculate rankings for all players
    const playerRankings = useMemo(() => {
        const rankings = calculateRankings(history, allPlayers, temporaryPlayers);

        // Create a map for quick lookup
        const rankMap = {};
        rankings.forEach((player, index) => {
            rankMap[player.name] = {
                position: index + 1,
                average: player.average === 999 ? 'N/A' : player.average.toFixed(2),
                playedCount: player.playedCount
            };
        });

        // Add temporary players with their initial ranks
        // Find the average of the player at that position
        temporaryPlayers.forEach(tempPlayer => {
            // Find the player at the position matching the initial rank
            const playerAtPosition = rankings.find((p, idx) => (idx + 1) === tempPlayer.initialRank);
            const averageAtPosition = playerAtPosition
                ? (playerAtPosition.average === 999 ? 'N/A' : playerAtPosition.average.toFixed(2))
                : tempPlayer.initialRank.toFixed(2);

            rankMap[tempPlayer.name] = {
                position: tempPlayer.initialRank,
                average: averageAtPosition,
                playedCount: 0,
                isTemporary: true
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

    const handleAddTemporaryPlayer = (e) => {
        e.preventDefault();

        if (!newPlayerName.trim()) {
            warningNotification("Please enter a player name.");
            return;
        }

        if (!newPlayerRank || newPlayerRank < 1 || newPlayerRank > 20) {
            warningNotification("Please enter a valid initial rank (1-20).");
            return;
        }

        if (allPlayers.includes(newPlayerName.trim())) {
            warningNotification("This player already exists!");
            return;
        }

        dispatch(addTemporaryPlayer({
            name: newPlayerName.trim(),
            initialRank: parseInt(newPlayerRank)
        }));

        setNewPlayerName('');
        setNewPlayerRank('');
    };

    const handleGenerate = () => {
        if (selectedPlayers.length < 2) {
            warningNotification("Please select at least 2 players.");
            return;
        }

        onGenerate();
        onClose();
    };

    const handleClose = () => {
        setSearchQuery('');
        onClose();
    };

    return (
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

                {/* Add Temporary Player Form */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(56, 189, 248, 0.1)', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#38bdf8' }}>
                        Add Temporary Player
                    </Typography>
                    <form onSubmit={handleAddTemporaryPlayer}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                placeholder="Player Name"
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                size="small"
                                sx={{ flex: 2 }}
                            />
                            <TextField
                                placeholder="Initial Rank (1-20)"
                                type="number"
                                value={newPlayerRank}
                                onChange={(e) => setNewPlayerRank(e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                                inputProps={{ min: 1, max: 20 }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                size="small"
                                disabled={!newPlayerName.trim() || !newPlayerRank}
                                startIcon={<UserPlus size={16} />}
                            >
                                Add
                            </Button>
                        </Box>
                    </form>
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
                                className={`player-item ${isSelected ? 'selected' : ''} ${ranking?.isTemporary ? 'temporary' : ''}`}
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
                                                </Typography>
                                            </Box>
                                            <Box className="player-stats">
                                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                                    Avg: {ranking?.average || 'N/A'}
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
    );
};

export default TournamentFixtureModal;
