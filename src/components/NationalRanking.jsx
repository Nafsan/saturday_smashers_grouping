import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Trophy,
    Search,
    TrendingUp,
    Users,
    ChevronLeft,
    Loader2,
    RefreshCw,
    X,
    Filter,
    BarChart3,
    Info
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Autocomplete,
    TextField,
    Box,
    Chip
} from '@mui/material';
import { fetchRankingProxy } from '../api/client';
import { parseNationalRankingHTML } from '../logic/nationalRankingParser';
import ThemeToggle from './ThemeToggle';
import './NationalRanking.scss';

const CATEGORIES = [
    { id: 'men', label: 'Men', url: 'https://bttf.org.bd/mens-ranking/' },
    { id: 'women', label: 'Women', url: 'https://bttf.org.bd/womens-ranking/' },
    { id: 'boys_u19', label: 'Boys U19', url: 'https://bttf.org.bd/u19-boys-ranking/' },
    { id: 'girls_u19', label: 'Girls U19', url: 'https://bttf.org.bd/u19-girls-ranking/' },
];

const NationalRanking = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('men');
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [rankings, setRankings] = useState({
        men: [],
        women: [],
        boys_u19: [],
        girls_u19: []
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);

    // Comparison Dialog State
    const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
    const [comparePlayers, setComparePlayers] = useState([]);

    // Player Details Dialog State
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const steps = [
        "Idle",
        "Fetching data from BTTF website...",
        "Processing ranking data...",
        "Ready"
    ];

    useEffect(() => {
        // Initial fetch for Men's ranking
        fetchRankingByCategory('men');
    }, []);

    const fetchRankingByCategory = async (categoryId, forceRefresh = false) => {
        // If data already exists and not forcing refresh, don't fetch
        if (!forceRefresh && rankings[categoryId].length > 0) return;

        setLoading(true);
        setError(null);
        setLoadingStep(1);

        const cat = CATEGORIES.find(c => c.id === categoryId);

        try {
            const data = await fetchRankingProxy(cat.url, forceRefresh);
            setLoadingStep(2);
            const parsedData = parseNationalRankingHTML(data.html);

            setRankings(prev => ({
                ...prev,
                [categoryId]: parsedData
            }));
            setLoadingStep(3);
        } catch (err) {
            console.error(`Failed to fetch ${cat.label}:`, err);
            setError(`Failed to fetch ${cat.label} ranking data.`);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        fetchRankingByCategory(tabId);
    };

    const handleRefreshAll = () => {
        // Refresh the current tab forcibly
        fetchRankingByCategory(activeTab, true);
    };

    const getVal = (obj, conceptualKey) => {
        if (!obj) return '';
        const mapping = {
            'SN': ['SN', 'S.N.', 'SL', 'S.L.', 'Serial No', 'Serial', 'S/N'],
            'Pos': ['Pos', 'Position', 'Rank', 'Ranking'],
            'Player': ['Player', 'Players', 'Name', 'Player Name'],
            'Total': ['Total Point', 'Total', 'Points', 'Total Points', 'Point']
        };
        const possibilities = (mapping[conceptualKey] || []).map(s => s.toUpperCase());
        const foundKey = Object.keys(obj).find(k => possibilities.includes(k.trim().toUpperCase()));
        return foundKey ? obj[foundKey] : '';
    };

    const currentData = rankings[activeTab] || [];

    // Dynamically get headers from the first row of data, excluding structural ones
    const tableHeaders = useMemo(() => {
        if (currentData.length === 0) return [];
        const structural = ['SN', 'S.N.', 'SL', 'S.L.', 'SERIAL NO', 'SERIAL', 'S/N', 'POS', 'POSITION', 'RANK', 'RANKING', 'PLAYER', 'PLAYERS', 'NAME', 'PLAYER NAME', 'TOTAL POINT', 'TOTAL', 'TOTAL POINTS', 'POINTS', 'POINT'];
        return Object.keys(currentData[0]).filter(h => {
            const up = h.trim().toUpperCase();
            return !structural.includes(up);
        });
    }, [currentData]);

    const filteredRankings = useMemo(() => {
        if (!searchQuery.trim()) return currentData;

        const query = searchQuery.toLowerCase().trim();
        return currentData.filter(player => {
            const playerName = String(getVal(player, 'Player') || '').toLowerCase();
            return playerName.includes(query);
        });
    }, [currentData, searchQuery]);

    const handleCompareToggle = (player) => {
        const playerName = getVal(player, 'Player');
        if (comparePlayers.find(p => getVal(p, 'Player') === playerName)) {
            setComparePlayers(prev => prev.filter(p => getVal(p, 'Player') !== playerName));
        } else {
            if (comparePlayers.length >= 10) {
                alert("You can compare at most 10 players at a time.");
                return;
            }
            setComparePlayers(prev => [...prev, player]);
        }
    };

    const chartData = useMemo(() => {
        if (comparePlayers.length === 0 || tableHeaders.length === 0) return [];

        return tableHeaders.map(key => {
            const dataPoint = { name: key };
            comparePlayers.forEach(p => {
                const pName = getVal(p, 'Player');
                dataPoint[pName] = p[key] || 0;
            });
            return dataPoint;
        });
    }, [comparePlayers, tableHeaders]);

    const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#6366F1', '#D946EF'];

    if (loading && currentData.length === 0) {
        return (
            <div className="national-ranking-page">
                <div className="ranking-top-bar">
                    <button className="back-btn" onClick={() => navigate('/')}>
                        <ChevronLeft size={20} />
                        <span>Back</span>
                    </button>
                    <ThemeToggle />
                </div>
                <div className="loading-overlay">
                    <div className="loading-card">
                        <Loader2 className="spinner" size={48} />
                        <h3>Fetching Rankings</h3>
                        <p>{steps[loadingStep]}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="national-ranking-page">
            <div className="ranking-top-bar">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={20} />
                    <span>Back</span>
                </button>
                <div className="top-actions">
                    <ThemeToggle />
                </div>
            </div>

            <header className="ranking-header">
                <div className="header-content">
                    <div className="title-section">
                        <Trophy className="icon-trophy" size={32} />
                        <div>
                            <h1>National Rankings</h1>
                            <p>Bangladesh Table Tennis Federation Official Rankings</p>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button className="action-btn compare-trigger" onClick={() => setIsCompareDialogOpen(true)}>
                            <BarChart3 size={18} />
                            <span>Comparison View ({comparePlayers.length})</span>
                        </button>
                        <button className="action-btn refresh-btn" onClick={handleRefreshAll} disabled={loading}>
                            {loading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
                            <span>Refresh Data</span>
                        </button>
                    </div>
                </div>

                <div className="tabs-container">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`tab-btn ${activeTab === cat.id ? 'active' : ''}`}
                            onClick={() => handleTabChange(cat.id)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="ranking-main">
                <section className="search-bar-section">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Search by player name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clear-search" onClick={() => setSearchQuery('')}>
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </section>

                <section className="ranking-table-section card">
                    <div className="table-responsive">
                        <table className="beautiful-table">
                            <thead>
                                <tr>
                                    <th>Pos</th>
                                    <th>Player Name</th>
                                    {tableHeaders.map(header => (
                                        <th key={header} className="desktop-only">{header}</th>
                                    ))}
                                    <th>Total Point</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRankings.length > 0 ? (
                                    filteredRankings.map((player, index) => {
                                        const playerName = getVal(player, 'Player');
                                        const pos = getVal(player, 'Pos') || index + 1;
                                        const total = getVal(player, 'Total');
                                        const sn = getVal(player, 'SN');

                                        return (
                                            <tr
                                                key={index}
                                                className={`clickable-row ${comparePlayers.find(p => getVal(p, 'Player') === playerName) ? 'comparing' : ''}`}
                                                onClick={() => setSelectedPlayer(player)}
                                                title="Click for details"
                                            >
                                                <td>
                                                    <span className="rank-simple">
                                                        {pos}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="player-info">
                                                        <span className="player-name">{playerName}</span>
                                                        <span className="player-sn">Serial No. {sn}</span>
                                                    </div>
                                                </td>
                                                {tableHeaders.map(header => (
                                                    <td key={header} className="desktop-only">
                                                        {player[header]}
                                                    </td>
                                                ))}
                                                <td className="highlight-points">
                                                    {total}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={tableHeaders.length + 3} className="no-results">
                                            {loading ? "Loading ranking data..." : "No players found matching your search."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* Comparison Dialog */}
            <Dialog
                open={isCompareDialogOpen}
                onClose={() => setIsCompareDialogOpen(false)}
                maxWidth={false}
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        background: 'var(--bg-card, #1e293b)',
                        color: 'var(--text-primary)',
                        backgroundImage: 'none',
                        width: isMobile ? '97%' : '90%',
                        maxWidth: isMobile ? 'none' : '1050px',
                        margin: isMobile ? '8px' : 'auto'
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TrendingUp size={24} color="var(--accent-primary)" />
                        Player Performance Comparison
                    </div>
                    <IconButton onClick={() => setIsCompareDialogOpen(false)} sx={{ color: 'var(--text-secondary)' }}>
                        <X size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 4 }}>
                    <Box sx={{ mb: 4 }}>
                        <Autocomplete
                            multiple
                            options={currentData}
                            value={comparePlayers}
                            getOptionLabel={(option) => option['Players'] || option['Player'] || ''}
                            isOptionEqualToValue={(option, value) => (option['Players'] || option['Player']) === (value['Players'] || value['Player'])}
                            onChange={(event, newValue) => {
                                setComparePlayers(newValue);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Search and select players to compare"
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                                        },
                                        '& .MuiInputLabel-root': { color: '#94a3b8' },
                                        '& .MuiChip-root': {
                                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                            color: 'var(--accent-primary)',
                                            fontWeight: 600,
                                            border: '1px solid rgba(56, 189, 248, 0.2)',
                                            '& .MuiChip-deleteIcon': {
                                                color: 'var(--accent-primary)',
                                                opacity: 0.8,
                                                '&:hover': { opacity: 1 }
                                            }
                                        }
                                    }}
                                />
                            )}
                        />
                    </Box>

                    {comparePlayers.length === 0 ? (
                        <div className="empty-compare">
                            <Users size={48} strokeWidth={1} />
                            <p>No players selected for comparison.</p>
                            <span>Search for players above to start comparing.</span>
                        </div>
                    ) : (
                        <div className="compare-content">
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                                            }}
                                            itemStyle={{ fontSize: '12px' }}
                                        />
                                        <Legend />
                                        {comparePlayers.map((player, index) => {
                                            const pName = player['Players'] || player['Player'];
                                            return (
                                                <Line
                                                    key={pName}
                                                    type="monotone"
                                                    dataKey={pName}
                                                    stroke={COLORS[index % COLORS.length]}
                                                    strokeWidth={3}
                                                    dot={{ r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Button onClick={() => setComparePlayers([])} color="error">Clear All</Button>
                    <Button onClick={() => setIsCompareDialogOpen(false)} variant="contained">Close</Button>
                </DialogActions>
            </Dialog>

            {/* Player Details Dialog */}
            <Dialog
                open={!!selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        background: 'var(--bg-card, #1e293b)',
                        color: 'var(--text-primary)',
                        backgroundImage: 'none',
                        width: isMobile ? '97%' : '100%',
                        maxWidth: isMobile ? 'none' : '600px',
                        margin: isMobile ? '8px' : 'auto'
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Info size={24} color="var(--accent-primary)" />
                        Player Details
                    </div>
                    <IconButton onClick={() => setSelectedPlayer(null)} sx={{ color: 'var(--text-secondary)' }}>
                        <X size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: isMobile ? 2 : 4 }}>
                    {selectedPlayer && (
                        <div className="player-detail-view">
                            <div className="detail-header-new">
                                <h3 className="player-name">{getVal(selectedPlayer, 'Player')}</h3>
                                <div className="player-meta-info">
                                    <div className="meta-card pos">
                                        <Trophy size={16} />
                                        <div className="text-content">
                                            <span className="meta-label">Position</span>
                                            <span className="meta-value">#{getVal(selectedPlayer, 'Pos')}</span>
                                        </div>
                                    </div>
                                    <div className="meta-card sn">
                                        <Users size={16} />
                                        <div className="text-content">
                                            <span className="meta-label">Serial No</span>
                                            <span className="meta-value">{getVal(selectedPlayer, 'SN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="point-breakdown-section">
                                <div className="section-title">
                                    <span>Tournament Breakdown</span>
                                </div>
                                <div className="breakdown-table-new">
                                    <div className="table-head">
                                        <span>Tournament</span>
                                        <span className="text-right">Points</span>
                                    </div>
                                    <div className="table-body">
                                        {tableHeaders.map(key => {
                                            const value = selectedPlayer[key];
                                            if (value === undefined) return null;

                                            return (
                                                <div key={key} className="table-row">
                                                    <span className="tournament-name">{key}</span>
                                                    <span className="tournament-points">{value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="detail-footer-new">
                                <div className="total-display">
                                    <span className="total-label">Final Score</span>
                                    <span className="total-value">{getVal(selectedPlayer, 'Total')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Button
                        onClick={() => {
                            handleCompareToggle(selectedPlayer);
                            setSelectedPlayer(null);
                            setIsCompareDialogOpen(true);
                        }}
                        variant="outlined"
                        color="primary"
                        startIcon={<TrendingUp size={16} />}
                    >
                        Compare
                    </Button>
                    <Button onClick={() => setSelectedPlayer(null)} variant="contained">Close</Button>
                </DialogActions>
            </Dialog>

            {error && (
                <div className="error-toast">
                    <p>{error}</p>
                    <button onClick={() => setError(null)}>Close</button>
                </div>
            )}
        </div>
    );
};

export default NationalRanking;
