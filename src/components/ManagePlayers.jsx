import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ShieldCheck, UserX, Search, Edit2 } from 'lucide-react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper, 
    Switch, 
    TextField, 
    InputAdornment,
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
} from '@mui/material';
import { fetchPlayersAsync, updatePlayerAsync } from '../store/appSlice';
import { getAdminAuthCookie } from '../utils/cookieUtils';
import { useToast } from '../context/ToastContext';
import './ManagePlayers.scss';

const ManagePlayers = () => {
    const dispatch = useDispatch();
    const allPlayers = useSelector(state => state.app.allPlayers);
    const { playersStatus, playersError } = useSelector(state => state.app);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [playerName, setPlayerName] = useState('');
    const [nameError, setNameError] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [updatingPlayerId, setUpdatingPlayerId] = useState(null);
    const { successNotification, errorNotification } = useToast();
    const loading = playersStatus === 'idle' || playersStatus === 'loading';

    useEffect(() => {
        dispatch(fetchPlayersAsync());
    }, [dispatch]);

    const handleEditName = (player) => {
        setEditingPlayer(player);
        setPlayerName(player.name);
        setNameError('');
    };

    const handleSaveName = async (event) => {
        event.preventDefault();
        if (!editingPlayer || savingName) return;
        const name = playerName.trim();
        if (!name) {
            setNameError('Player name cannot be empty.');
            return;
        }
        if (allPlayers.some(player => player.id !== editingPlayer.id && player.name.toLowerCase() === name.toLowerCase())) {
            setNameError('A player with this name already exists.');
            return;
        }
        if (name === editingPlayer.name) {
            setEditingPlayer(null);
            return;
        }
        setSavingName(true);
        try {
            await dispatch(updatePlayerAsync({
                playerId: editingPlayer.id, name, password: getAdminAuthCookie(),
            })).unwrap();
            setEditingPlayer(null);
            successNotification(`Player renamed to ${name}`);
        } catch (error) {
            setNameError(error.message || 'Failed to save the player name. Please try again.');
        } finally {
            setSavingName(false);
        }
    };

    const handleToggleGuest = async (player, currentStatus) => {
        const password = getAdminAuthCookie();
        setUpdatingPlayerId(player.id);
        try {
            await dispatch(updatePlayerAsync({ 
                playerId: player.id, 
                isGuest: !currentStatus, 
                password 
            })).unwrap();
            successNotification(`Updated guest status for ${player.name}`);
        } catch (error) {
            console.error('Failed to update player:', error);
            errorNotification(`Failed to update player: ${error.message || 'Unknown error'}`);
        } finally {
            setUpdatingPlayerId(null);
        }
    };

    const filteredPlayers = allPlayers.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="manage-players">
            <div className="section-header">
                <div className="header-info">
                    <h3>Manage Players</h3>
                    <p>Edit player names and manage guest status</p>
                </div>
                <div className="header-search">
                    <TextField
                        size="small"
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={18} color="#94a3b8" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                color: '#f8fafc',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                            }
                        }}
                    />
                </div>
            </div>

            {playersStatus === 'failed' && (
                <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => dispatch(fetchPlayersAsync())}>Retry</Button>}>
                    Could not load players. {playersError}
                </Alert>
            )}

            <TableContainer component={Paper} className="players-table-container" aria-busy={loading}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Player Name</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="center">Guest Player</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center" className="empty-cell">
                                    <span role="status"><CircularProgress size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />Loading players...</span>
                                </TableCell>
                            </TableRow>
                        ) : filteredPlayers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center" className="empty-cell">
                                    {playersStatus === 'failed' ? 'Players could not be loaded.' : searchTerm ? 'No players found matching your search' : 'No players available yet.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPlayers.map((player) => (
                                <TableRow key={player.id} className={player.is_guest ? 'guest-row' : ''}>
                                    <TableCell className="name-cell">
                                        <div className="player-info-cell">
                                            <div className={`avatar ${player.is_guest ? 'guest' : 'regular'}`}>
                                                {player.is_guest ? <UserX size={16} /> : <ShieldCheck size={16} />}
                                            </div>
                                            <span>{player.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell align="center">
                                        <span className={`status-badge ${player.is_guest ? 'guest' : 'regular'}`}>
                                            {player.is_guest ? 'Guest' : 'Regular'}
                                        </span>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Switch
                                            checked={player.is_guest}
                                            onChange={() => handleToggleGuest(player, player.is_guest)}
                                            color="warning"
                                            disabled={updatingPlayerId !== null || savingName}
                                            slotProps={{ input: { role: 'switch', 'aria-label': `Guest status for ${player.name}` } }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            aria-label={`Edit name for ${player.name}`}
                                            title="Edit player name"
                                            onClick={() => handleEditName(player)}
                                            disabled={updatingPlayerId !== null || savingName}
                                            sx={{ color: 'var(--accent-primary)' }}
                                        >
                                            <Edit2 size={18} />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <Dialog open={Boolean(editingPlayer)} onClose={savingName ? undefined : () => setEditingPlayer(null)} maxWidth="sm" fullWidth aria-labelledby="edit-player-name-title">
                <form onSubmit={handleSaveName}>
                    <DialogTitle id="edit-player-name-title">Edit player name</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            fullWidth
                            margin="dense"
                            label="Player name"
                            value={playerName}
                            onChange={(event) => { setPlayerName(event.target.value); setNameError(''); }}
                            error={Boolean(nameError)}
                            helperText={nameError || 'Tournament history and fund records stay linked to this player.'}
                            disabled={savingName}
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setEditingPlayer(null)} disabled={savingName}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={savingName} startIcon={savingName ? <CircularProgress size={18} color="inherit" /> : undefined}>
                            {savingName ? 'Saving...' : 'Save name'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </div>
    );
};

export default ManagePlayers;
