import React, { useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { X, Trophy, Info, HelpCircle } from 'lucide-react';
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
        const filtered = globalRankings.filter(p => p.playedCount >= 2);
        
        return filtered.map((p, i, arr) => {
            const hasSameAverageAsNext = i < arr.length - 1 && arr[i + 1].average === p.average;
            const hasSameAverageAsPrev = i > 0 && arr[i - 1].average === p.average;
            const isTied = hasSameAverageAsNext || hasSameAverageAsPrev;
            
            let tieInfoParts = [];
            
            if (hasSameAverageAsNext) {
                const next = arr[i + 1];
                let reason = "";
                if (p.weightedAverage < next.weightedAverage) {
                    reason = `having a lower Weighted Average (${p.weightedAverage.toFixed(2)} vs ${next.weightedAverage.toFixed(2)})`;
                } else if (p.bestRating < next.bestRating) {
                    reason = `better Best Performance (#${p.bestRating} vs #${next.bestRating})`;
                } else if (p.playedCount > next.playedCount) {
                    reason = `higher Attendance (${p.playedCount} vs ${next.playedCount} games)`;
                } else {
                    reason = `alphabetical order`;
                }
                tieInfoParts.push(`Ranked above ${next.name} due to ${reason}`);
            }

            if (hasSameAverageAsPrev) {
                const prev = arr[i - 1];
                let reason = "";
                if (p.weightedAverage > prev.weightedAverage) {
                    reason = `having a higher Weighted Average (${p.weightedAverage.toFixed(2)} vs ${prev.weightedAverage.toFixed(2)})`;
                } else if (p.bestRating > prev.bestRating) {
                    reason = `lower Best Performance (#${p.bestRating} vs #${prev.bestRating})`;
                } else if (p.playedCount < prev.playedCount) {
                    reason = `lower Attendance (${p.playedCount} vs ${prev.playedCount} games)`;
                } else {
                    reason = `alphabetical order`;
                }
                tieInfoParts.push(`Ranked below ${prev.name} due to ${reason}`);
            }

            const tieInfo = tieInfoParts.join(". ");

            return { ...p, rank: i + 1, isTied, tieInfo };
        });
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

    // Prevent background scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {player.name}
                                                            {player.isTied && (
                                                                <span 
                                                                    title={player.tieInfo} 
                                                                    style={{ 
                                                                        display: 'inline-flex', 
                                                                        color: 'var(--accent-secondary)',
                                                                        opacity: 0.7,
                                                                        cursor: 'help'
                                                                    }}
                                                                >
                                                                    <HelpCircle size={14} />
                                                                </span>
                                                            )}
                                                        </div>
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
                                            <div className="summary-item" title="Tiebreaker 1: Weighted average with recency bias">
                                                <span className="label">Weighted Avg:</span>
                                                <span className="value">{selectedPlayer.weightedAverage.toFixed(2)}</span>
                                            </div>
                                            <div className="summary-item" title="Tiebreaker 2: Best performance in last 5 games">
                                                <span className="label">Best Rating:</span>
                                                <span className="value">{selectedPlayer.bestRating}</span>
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
                                                
                                                {(selectedPlayer.isTied) && (
                                                    <div className="tiebreaker-details" style={{ marginTop: '16px', padding: '12px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent-secondary)' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                            Tiebreaker Breakdown
                                                        </div>
                                                        
                                                        <div className="calculation-steps" style={{ fontSize: '0.85rem' }}>
                                                            <div style={{ marginBottom: '8px' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>Best Performance:</span> <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>#{selectedPlayer.bestRating}</span>
                                                            </div>
                                                            
                                                            <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Weighted Average (Recency Bias):</div>
                                                            <div style={{ 
                                                                background: 'rgba(0,0,0,0.2)', 
                                                                padding: '8px', 
                                                                borderRadius: '4px', 
                                                                fontFamily: 'monospace', 
                                                                fontSize: '0.75rem',
                                                                marginBottom: '8px',
                                                                color: 'var(--accent-secondary)'
                                                            }}>
                                                                {selectedPlayer.ranks.slice(0, 5).map((r, i) => (
                                                                    <span key={i}>
                                                                        ({r} × {[1.0, 0.8, 0.6, 0.4, 0.2][i]}){i < Math.min(selectedPlayer.playedCount, 5) - 1 ? ' + ' : ''}
                                                                    </span>
                                                                ))}
                                                                <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                                                                    Result: <strong>{selectedPlayer.weightedAverage.toFixed(2)}</strong>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic', opacity: 0.8, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                                                            {selectedPlayer.tieInfo}
                                                        </div>
                                                    </div>
                                                )}
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
                                    <p>Rankings are primarily based on your <strong>Average Rating</strong> from the last 5 tournaments (or fewer if played less). Ratings range from 1-8, where 1 is the best.</p>
                                    <p style={{ marginTop: '8px' }}><strong>Tiebreaker Rules (In Order):</strong></p>
                                    <ol style={{ paddingLeft: '20px', marginTop: '4px' }}>
                                        <li><strong>Standard Average:</strong> Primary ranking factor.</li>
                                        <li><strong>Weighted Average:</strong> Recent games give more weight (Recency Bias).</li>
                                        <li><strong>Best Performance:</strong> Highest rating achieved in last 5 games.</li>
                                        <li><strong>Attendance:</strong> Number of tournaments played.</li>
                                        <li><strong>Alphabetical:</strong> Final fallback.</li>
                                    </ol>
                                    <p style={{ marginTop: '8px' }}>Click any player to see their detailed breakdown.</p>
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
