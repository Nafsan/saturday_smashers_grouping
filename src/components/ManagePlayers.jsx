import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { User, ShieldCheck, UserX, Search } from 'lucide-react';
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
    InputAdornment 
} from '@mui/material';
import { updatePlayerAsync } from '../store/appSlice';
import { getAdminAuthCookie } from '../utils/cookieUtils';
import { useToast } from '../context/ToastContext';
import './ManagePlayers.scss';

const ManagePlayers = () => {
    const dispatch = useDispatch();
    const allPlayers = useSelector(state => state.app.allPlayers);
    const [searchTerm, setSearchTerm] = useState('');
    const { successNotification, errorNotification } = useToast();

    const handleToggleGuest = async (player, currentStatus) => {
        const password = getAdminAuthCookie();
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
                    <p>Set player roles and manage guest status</p>
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

            <TableContainer component={Paper} className="players-table-container">
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Player Name</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="center">Guest Player</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredPlayers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} align="center" className="empty-cell">
                                    No players found matching your search
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
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};

export default ManagePlayers;
