import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { X, Trophy, Info } from 'lucide-react';
import { calculateRankings } from '../logic/ranking';
import { selectAllPlayerNames } from '../store/appSlice';
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
    const { history } = useSelector(state => state.app);
    const allPlayers = useSelector(selectAllPlayerNames);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showRankingInfo, setShowRankingInfo] = useState(false);

    const globalRankings = useMemo(() => {
        return calculateRankings(history, allPlayers);
    }, [history, allPlayers]);

    const categorizedRankings = useMemo(() => {
        const filtered = globalRankings.filter(player =>
            player.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
            established: filtered.filter(p => p.playedCount >= 2),
            newPlayers: filtered.filter(p => p.playedCount === 1),
            neverPlayed: filtered.filter(p => p.playedCount === 0)
        };
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
                    <h2>
                        <Trophy size={24} color="#fbbf24" /> Group Standings
                        <button
                            className="info-btn"
                            onClick={() => setShowRankingInfo(true)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#38bdf8',
                                padding: '4px',
                                marginLeft: '0.5rem',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="How Rankings Are Calculated"
                        >
                            <Info size={20} />
                        </button>
                    </h2>
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
                    />
                </div>

                <div className="modal-content">
                    <ThemeProvider theme={darkTheme}>
                        <div className="ranking-sections-container">
                            {/* Section 1: Established Players (2+ Tournaments) */}
                            {categorizedRankings.established.length > 0 && (
                                <div className="ranking-section">
                                    <div className="section-header">
                                        <Trophy size={18} color="#fbbf24" />
                                        <h3>Global Leaderboard ({categorizedRankings.established.length})</h3>
                                    </div>
                                    <TableContainer component={Paper} sx={{ boxShadow: 'none', backgroundColor: 'transparent' }}>
                                        <Table size="small" aria-label="established players table">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ width: '60px', textAlign: 'center' }}>Rank</TableCell>
                                                    <TableCell>Player</TableCell>
                                                    <TableCell sx={{ width: '100px', textAlign: 'center' }}>Avg Rating</TableCell>
                                                    <TableCell sx={{ width: '80px', textAlign: 'center' }}>Games</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {categorizedRankings.established.map((player, index) => (
                                                    <TableRow
                                                        key={player.name}
                                                        sx={{
                                                            '&:last-child td, &:last-child th': { border: 0 },
                                                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => handleShowBreakdown(player)}
                                                    >
                                                        <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', color: '#38bdf8' }}>
                                                            #{index + 1}
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 500 }}>
                                                            {player.name}
                                                        </TableCell>
                                                        <TableCell sx={{ textAlign: 'center', fontFamily: 'monospace', color: '#4ade80' }}>
                                                            {player.average.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell sx={{ textAlign: 'center', color: '#94a3b8' }}>
                                                            {player.playedCount}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </div>
                            )}

                            {/* Section 2: New Players (1 Tournament) */}
                            {categorizedRankings.newPlayers.length > 0 && (
                                <div className="ranking-section new-players">
                                    <div className="section-header">
                                        <div className="badge new">New</div>
                                        <h3>Single Tournament Players ({categorizedRankings.newPlayers.length})</h3>
                                    </div>
                                    <p className="section-desc">Players consolidating their initial rating (need 2+ games for rank)</p>
                                    <TableContainer component={Paper} sx={{ boxShadow: 'none', backgroundColor: 'transparent' }}>
                                        <Table size="small" aria-label="new players table">
                                            <TableBody>
                                                {categorizedRankings.newPlayers.map((player) => (
                                                    <TableRow
                                                        key={player.name}
                                                        sx={{
                                                            '&:last-child td, &:last-child th': { border: 0 },
                                                            '&:hover': { backgroundColor: 'rgba(56, 189, 248, 0.05)' },
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => handleShowBreakdown(player)}
                                                    >
                                                        <TableCell sx={{ width: '60px', textAlign: 'center', color: '#94a3b8' }}>
                                                            -
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 500 }}>
                                                            {player.name}
                                                        </TableCell>
                                                        <TableCell sx={{ width: '100px', textAlign: 'center', fontFamily: 'monospace', color: '#818cf8' }}>
                                                            {player.average.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell sx={{ width: '80px', textAlign: 'center', color: '#94a3b8' }}>
                                                            1
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </div>
                            )}

                            {/* Section 3: Never Played (0 Tournaments) */}
                            {categorizedRankings.neverPlayed.length > 0 && (
                                <div className="ranking-section never-played">
                                    <div className="section-header">
                                        <div className="badge inactive">Inactive</div>
                                        <h3>No Tournament History ({categorizedRankings.neverPlayed.length})</h3>
                                    </div>
                                    <TableContainer component={Paper} sx={{ boxShadow: 'none', backgroundColor: 'transparent' }}>
                                        <Table size="small" aria-label="inactive players table">
                                            <TableBody>
                                                {categorizedRankings.neverPlayed.sort((a, b) => a.name.localeCompare(b.name)).map((player) => (
                                                    <TableRow
                                                        key={player.name}
                                                        sx={{
                                                            '&:last-child td, &:last-child th': { border: 0 },
                                                            '&:hover': { backgroundColor: 'rgba(148, 163, 184, 0.05)' },
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => handleShowBreakdown(player)}
                                                    >
                                                        <TableCell sx={{ width: '60px', textAlign: 'center', color: '#64748b' }}>
                                                            -
                                                        </TableCell>
                                                        <TableCell sx={{ color: '#94a3b8' }}>
                                                            {player.name}
                                                        </TableCell>
                                                        <TableCell sx={{ width: '100px', textAlign: 'center', color: '#64748b' }}>
                                                            -
                                                        </TableCell>
                                                        <TableCell sx={{ width: '80px', textAlign: 'center', color: '#64748b' }}>
                                                            0
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </div>
                            )}

                            {Object.values(categorizedRankings).every(arr => arr.length === 0) && (
                                <div className="no-results">
                                    No players found matching "{searchTerm}"
                                </div>
                            )}
                        </div>
                    </ThemeProvider>
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

                {/* Ranking Info Overlay */}
                {showRankingInfo && (
                    <div className="ranking-info-overlay" onClick={() => setShowRankingInfo(false)}>
                        <div className="ranking-info-modal" onClick={e => e.stopPropagation()}>
                            <div className="info-header">
                                <h3><Info size={20} color="#38bdf8" /> How Rankings Are Calculated</h3>
                                <button className="close-btn" onClick={() => setShowRankingInfo(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="info-content">
                                <div className="info-description">
                                    <strong>Ranking Methodology:</strong>
                                    Rankings are based on the average rating from your last 5 tournaments (or fewer if you've played less). Lower averages rank higher. Ratings range from 1-8, where 1 is the best. Click any player row to see their detailed breakdown.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalRanking;
