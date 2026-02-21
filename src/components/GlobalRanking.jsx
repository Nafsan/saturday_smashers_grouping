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

// MUI Theme constants for consistency
const tableCellHeadStyle = {
    backgroundColor: 'var(--bg-surface-soft)',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: '1px',
    fontSize: '0.75rem',
    borderBottom: '2px solid var(--border-main)',
    padding: '16px',
};

const tableCellBodyStyle = {
    borderBottom: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    padding: '16px',
};

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

    const establishedPlayers = useMemo(() => {
        return globalRankings
            .filter(p => p.playedCount >= 2)
            .map((p, i) => ({ ...p, rank: i + 1 }));
    }, [globalRankings]);

    const categorizedRankings = useMemo(() => {
        const query = searchTerm.toLowerCase();

        return {
            established: establishedPlayers.filter(p => p.name.toLowerCase().includes(query)),
            newPlayers: globalRankings
                .filter(p => p.playedCount === 1)
                .filter(p => p.name.toLowerCase().includes(query)),
            neverPlayed: globalRankings
                .filter(p => p.playedCount === 0)
                .filter(p => p.name.toLowerCase().includes(query))
        };
    }, [globalRankings, establishedPlayers, searchTerm]);

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
                    <div className="ranking-sections-container">
                        {/* Section 1: Established Players (2+ Tournaments) */}
                        {categorizedRankings.established.length > 0 && (
                            <div className="ranking-section">
                                <div className="section-header">
                                    <Trophy size={18} color="#fbbf24" />
                                    <h3>Global Leaderboard ({categorizedRankings.established.length})</h3>
                                </div>
                                <TableContainer component={Paper} sx={{ boxShadow: 'none', backgroundColor: 'transparent' }}>
                                    <Table aria-label="established players table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ ...tableCellHeadStyle, width: '60px', textAlign: 'center' }}>Rank</TableCell>
                                                <TableCell sx={tableCellHeadStyle}>Player</TableCell>
                                                <TableCell sx={{ ...tableCellHeadStyle, width: '100px', textAlign: 'center' }}>Avg Rating</TableCell>
                                                <TableCell sx={{ ...tableCellHeadStyle, width: '80px', textAlign: 'center' }}>Games</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {categorizedRankings.established.map((player, index) => (
                                                <TableRow
                                                    key={player.name}
                                                    sx={{
                                                        '&:last-child td, &:last-child th': { border: 0 },
                                                        '&:hover': { backgroundColor: 'var(--bg-surface-soft)' },
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => handleShowBreakdown(player)}
                                                >
                                                    <TableCell sx={{ ...tableCellBodyStyle, textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                                                        #{player.rank}
                                                    </TableCell>
                                                    <TableCell sx={{ ...tableCellBodyStyle, fontWeight: 500 }}>
                                                        {player.name}
                                                    </TableCell>
                                                    <TableCell sx={{ ...tableCellBodyStyle, textAlign: 'center', fontFamily: 'monospace', color: 'var(--accent-success)' }}>
                                                        {player.average.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell sx={{ ...tableCellBodyStyle, textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                                    <Table aria-label="new players table">
                                        <TableBody>
                                            {categorizedRankings.newPlayers.map((player) => (
                                                <TableRow
                                                    key={player.name}
                                                    sx={{
                                                        '&:last-child td, &:last-child th': { border: 0 },
                                                        '&:hover': { backgroundColor: 'var(--bg-surface-soft)' },
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => handleShowBreakdown(player)}
                                                >
                                                    <TableCell sx={{ ...tableCellBodyStyle, width: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        -
                                                    </TableCell>
                                                    <TableCell sx={{ ...tableCellBodyStyle, fontWeight: 500 }}>
                                                        {player.name}
                                                    </TableCell>
                                                    <TableCell sx={{ ...tableCellBodyStyle, width: '100px', textAlign: 'center', fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>
                                                        {player.average.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell sx={{ ...tableCellBodyStyle, width: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                                    <Table aria-label="inactive players table">
                                        <TableBody>
                                            {categorizedRankings.neverPlayed.sort((a, b) => a.name.localeCompare(b.name)).map((player) => (
                                                <TableRow
                                                    key={player.name}
                                                    sx={{
                                                        '&:last-child td, &:last-child th': { border: 0 },
                                                        '&:hover': { backgroundColor: 'var(--bg-surface-soft)' },
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => handleShowBreakdown(player)}
                                                >
                                                    <TableCell sx={{ ...tableCellBodyStyle, width: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        -
                                                    </TableCell>
                                                    <TableCell sx={{ ...tableCellBodyStyle, color: 'var(--text-secondary)' }}>
                                                        {player.name}
                                                    </TableCell>
                                                    <TableCell sx={{ ...tableCellBodyStyle, width: '100px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        -
                                                    </TableCell>
                                                    <TableCell sx={{ ...tableCellBodyStyle, width: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
