import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { X, Trophy } from 'lucide-react';
import { calculateRankings } from '../logic/ranking';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    ThemeProvider,
    createTheme
} from '@mui/material';
import './GlobalRanking.scss';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            paper: '#1e293b', // Matches var(--bg-card)
        },
        text: {
            primary: '#f8fafc', // Matches var(--text-primary)
            secondary: '#94a3b8', // Matches var(--text-secondary)
        },
    },
    components: {
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '16px',
                },
                head: {
                    backgroundColor: '#1e293b',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    letterSpacing: '1px',
                    fontSize: '0.85rem',
                },
                body: {
                    fontSize: '0.95rem',
                }
            }
        }
    }
});

const GlobalRanking = ({ onClose }) => {
    const { history, allPlayers } = useSelector(state => state.app);
    const [searchTerm, setSearchTerm] = React.useState('');

    const globalRankings = useMemo(() => {
        return calculateRankings(history, allPlayers);
    }, [history, allPlayers]);

    const filteredRankings = useMemo(() => {
        return globalRankings.filter(player =>
            player.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [globalRankings, searchTerm]);

    return (
        <div className="global-ranking-overlay" onClick={onClose}>
            <div className="global-ranking-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><Trophy size={24} color="#fbbf24" /> Group Standings</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="modal-content">
                    <ThemeProvider theme={darkTheme}>
                        <TableContainer component={Paper} sx={{ boxShadow: 'none', backgroundColor: 'transparent', height: '100%' }}>
                            <Table stickyHeader aria-label="ranking table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: '80px', textAlign: 'center' }}>Rank</TableCell>
                                        <TableCell>Player</TableCell>
                                        <TableCell sx={{ width: '120px', textAlign: 'center' }}>Avg (Last 5)</TableCell>
                                        <TableCell sx={{ width: '80px', textAlign: 'center' }}>Games</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredRankings.map((player, index) => (
                                        <TableRow
                                            key={player.name}
                                            sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' } }}
                                        >
                                            <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', color: '#38bdf8' }}>
                                                #{index + 1}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>
                                                {player.name}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center', fontFamily: 'monospace', color: player.playedCount === 0 ? '#94a3b8' : '#4ade80' }}>
                                                {player.playedCount === 0 ? '-' : player.average.toFixed(2)}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center', color: '#94a3b8' }}>
                                                {player.playedCount > 5 ? 5 : player.playedCount}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredRankings.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                No players found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </ThemeProvider>
                </div>
            </div>
        </div>
    );
};

export default GlobalRanking;
