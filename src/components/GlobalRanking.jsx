import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { X, Trophy, Info } from 'lucide-react';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showBreakdown, setShowBreakdown] = useState(false);

    const globalRankings = useMemo(() => {
        return calculateRankings(history, allPlayers);
    }, [history, allPlayers]);

    const filteredRankings = useMemo(() => {
        return globalRankings.filter(player =>
            player.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [globalRankings, searchTerm]);

    // Get detailed tournament breakdown for a player
    const getPlayerBreakdown = (playerName) => {
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        const tournaments = [];

        sortedHistory.forEach(tournament => {
            tournament.ranks.forEach(rankGroup => {
                if (rankGroup.players.includes(playerName)) {
                    tournaments.push({
                        date: tournament.date,
                        rank: rankGroup.rank,
                        rating: rankGroup.rating
                    });
                }
            });
        });

        return tournaments;
    };

    const handleShowBreakdown = (player) => {
        setSelectedPlayer(player);
        setShowBreakdown(true);
    };

    const handleCloseBreakdown = () => {
        setShowBreakdown(false);
        setSelectedPlayer(null);
    };

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
                                        <TableCell sx={{ width: '60px', textAlign: 'center' }}>Info</TableCell>
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
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleShowBreakdown(player)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#38bdf8',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '4px',
                                                        borderRadius: '4px',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    title="View Rank Breakdown"
                                                >
                                                    <Info size={18} />
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredRankings.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                No players found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </ThemeProvider>

                    {/* Ranking Calculation Description */}
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(56, 189, 248, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        fontSize: '0.875rem',
                        color: '#94a3b8',
                        lineHeight: '1.6'
                    }}>
                        <strong style={{ color: '#38bdf8' }}>How Rankings Are Calculated:</strong>
                        <br />
                        Rankings are based on the average rating from your last 5 tournaments (or fewer if you've played less). Lower averages rank higher. Ratings range from 1-8, where 1 is the best. Click the info icon to see the detailed breakdown for each player.
                    </div>
                </div>

                {/* Rank Breakdown Modal */}
                {showBreakdown && selectedPlayer && (
                    <div className="breakdown-overlay" onClick={handleCloseBreakdown}>
                        <div className="breakdown-modal" onClick={e => e.stopPropagation()}>
                            <div className="breakdown-header">
                                <h3>Rank Breakdown: {selectedPlayer.name}</h3>
                                <button className="close-btn" onClick={handleCloseBreakdown}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="breakdown-content">
                                {selectedPlayer.playedCount === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                                        This player hasn't participated in any tournaments yet.
                                    </p>
                                ) : (
                                    <>
                                        <div className="calculation-summary">
                                            <div className="summary-item">
                                                <span className="label">Total Tournaments Played:</span>
                                                <span className="value">{selectedPlayer.playedCount}</span>
                                            </div>
                                            <div className="summary-item">
                                                <span className="label">Tournaments Considered:</span>
                                                <span className="value">{Math.min(selectedPlayer.playedCount, 5)}</span>
                                            </div>
                                            <div className="summary-item">
                                                <span className="label">Average Rating:</span>
                                                <span className="value highlight">{selectedPlayer.average.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="tournaments-list">
                                            <h4>Recent Tournaments (Last 5)</h4>
                                            {getPlayerBreakdown(selectedPlayer.name).slice(0, 5).map((tournament, index) => (
                                                <div key={index} className="tournament-item">
                                                    <div className="tournament-date">
                                                        {new Date(tournament.date).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                    <div className="tournament-details">
                                                        <span>Rank: <strong>#{tournament.rank}</strong></span>
                                                        <span className="rating">Rating: <strong>{tournament.rating}</strong></span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="calculation-formula">
                                            <h4>Calculation</h4>
                                            <div className="formula">
                                                <div className="formula-line">
                                                    Average = ({selectedPlayer.ranks.slice(0, 5).join(' + ')}) / {Math.min(selectedPlayer.playedCount, 5)}
                                                </div>
                                                <div className="formula-line result">
                                                    Average = {selectedPlayer.ranks.slice(0, 5).reduce((a, b) => a + b, 0)} / {Math.min(selectedPlayer.playedCount, 5)} = <strong>{selectedPlayer.average.toFixed(2)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalRanking;
