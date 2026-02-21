import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreHorizontal, FileText, Youtube } from 'lucide-react';
import Select from 'react-select';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, useMediaQuery } from '@mui/material';
import { selectAllPlayerNames } from '../store/appSlice';
import { useToast } from '../context/ToastContext';
import './AnalyticsDashboard.scss';

const AnalyticsDashboard = ({ onEdit }) => {
    const { history } = useSelector(state => state.app);
    const allPlayers = useSelector(selectAllPlayerNames);
    const dispatch = useDispatch();
    const { successNotification, errorNotification } = useToast();
    const isMobile = useMediaQuery('(max-width:600px)');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [selectedGraphPlayers, setSelectedGraphPlayers] = useState([]);
    const [expandedTournaments, setExpandedTournaments] = useState([]);
    const [timeRange, setTimeRange] = useState('all'); // '10', '20', 'all'




    // YouTube Modal State
    const [showYouTubeModal, setShowYouTubeModal] = useState(false);
    const [currentEmbedUrl, setCurrentEmbedUrl] = useState('');
    const [currentPlaylistUrl, setCurrentPlaylistUrl] = useState('');

    // Prepare options for react-select
    const playerOptions = useMemo(() => {
        return allPlayers.map(player => ({ value: player, label: player }));
    }, [allPlayers]);

    const handlePlayerSelect = (selectedOptions) => {
        if (selectedOptions.length <= 5) {
            setSelectedGraphPlayers(selectedOptions.map(option => option.value));
        } else {
            // Optional: Show a toast or message that max is 5
        }
    };

    const toggleTournamentExpansion = (id) => {
        setExpandedTournaments(prev =>
            prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
        );
    };

    const handleYouTubeClick = (tournament) => {
        if (tournament.embed_url) {
            setCurrentEmbedUrl(tournament.embed_url);
            setCurrentPlaylistUrl(tournament.playlist_url || '');
            setShowYouTubeModal(true);
        } else if (tournament.playlist_url) {
            // Fallback to opening playlist in new tab if no embed URL
            window.open(tournament.playlist_url, '_blank');
        }
    };

    // Custom styles for react-select to match theme
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: 'var(--bg-card)',
            borderColor: state.isFocused ? 'var(--accent-primary)' : 'var(--border-main)',
            boxShadow: state.isFocused ? '0 0 0 1px var(--accent-primary)' : 'none',
            '&:hover': {
                borderColor: 'var(--accent-primary)'
            },
            padding: '2px'
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-main)',
            zIndex: 50
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? 'var(--accent-primary)' : state.isFocused ? 'var(--border-subtle)' : 'transparent',
            color: state.isSelected ? '#fff' : 'var(--text-primary)',
            cursor: 'pointer',
            ':active': {
                backgroundColor: 'var(--accent-primary)'
            }
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: 'var(--border-subtle)',
            borderRadius: '4px'
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: 'var(--accent-primary)',
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: 'var(--accent-primary)',
            ':hover': {
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
            },
        }),
        input: (provided) => ({
            ...provided,
            color: 'var(--text-primary)'
        }),
        singleValue: (provided) => ({
            ...provided,
            color: 'var(--text-primary)'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: 'var(--text-muted)'
        })
    };

    // Prepare data for the graph
    const graphData = useMemo(() => {
        // Sort history by date ascending for the graph
        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

        let limit;
        if (timeRange === '10') limit = 10;
        else if (timeRange === '20') limit = 20;
        else limit = sortedHistory.length; // 'all'

        const recentHistory = sortedHistory.slice(-limit); // Last N tournaments

        return recentHistory.map(t => {
            const point = { date: t.date };
            t.ranks.forEach(r => {
                r.players.forEach(p => {
                    point[p] = r.rank;
                });
            });
            return point;
        });
    }, [history, timeRange]);

    // Colors for lines
    const colors = ['#38bdf8', '#818cf8', '#4ade80', '#f472b6', '#fbbf24'];

    // Recent Tournaments List Pagination
    const totalPages = Math.ceil(history.length / itemsPerPage);
    const displayedHistory = history.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1); // Reset to first page
    };

    // Generate page numbers with smart ellipsis
    const getPageNumbers = () => {
        const delta = 1; // Number of pages to show around current page
        const range = [];
        const rangeWithDots = [];
        let l;

        // Always show first page
        range.push(1);

        // Calculate range around current page
        for (let i = currentPage - delta; i <= currentPage + delta; i++) {
            if (i < totalPages && i > 1) {
                range.push(i);
            }
        }

        // Always show last page
        if (totalPages > 1) {
            range.push(totalPages);
        }

        // Add dots where needed
        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

    return (
        <div className="analytics-dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Player Performance Trends</h3>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="time-range-select"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-main)',
                        borderRadius: '6px',
                        padding: '0.4rem 0.8rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                >
                    <option value="10">Last 10</option>
                    <option value="20">Last 20</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            <div className="player-selector-container">
                <p className="label">Compare Players (Max 5):</p>
                <Select
                    isMulti
                    options={playerOptions}
                    value={playerOptions.filter(option => selectedGraphPlayers.includes(option.value))}
                    onChange={handlePlayerSelect}
                    styles={customSelectStyles}
                    placeholder="Select players..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "No players found"}
                />
            </div>

            {selectedGraphPlayers.length > 0 ? (
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={graphData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" />
                            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickFormatter={(d) => d.substring(5)} />
                            <YAxis stroke="var(--text-muted)" reversed={true} domain={[1, 'auto']} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-primary)' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                            />
                            <Legend />
                            {selectedGraphPlayers.map((player, index) => (
                                <Line
                                    key={player}
                                    type="monotone"
                                    dataKey={player}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="empty-chart-state">
                    Select players above to see the graph.
                </div>
            )}

            <div className="recent-history">
                <h3>Recent Tournaments</h3>
                <div className="history-list">
                    {displayedHistory.map(t => {
                        const isExpanded = expandedTournaments.includes(t.id);
                        const ranksToShow = isExpanded ? t.ranks : t.ranks.slice(0, 3);
                        const hasMore = t.ranks.length > 3;

                        return (
                            <div key={t.id} className="history-item">
                                <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div className="date">{t.date}</div>
                                    <div className="actions" style={{ display: 'flex', gap: '8px' }}>
                                        {onEdit && (
                                            <button
                                                onClick={() => onEdit(t)}
                                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px' }}
                                                title="View Tournament Details"
                                            >
                                                <FileText size={20} />
                                            </button>
                                        )}
                                        {(t.playlist_url || t.embed_url) && (
                                            <button
                                                onClick={() => handleYouTubeClick(t)}
                                                style={{ background: 'none', border: 'none', color: '#FF0000', cursor: 'pointer', padding: '4px' }}
                                                title="Watch on YouTube"
                                            >
                                                <Youtube size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="ranks-preview">
                                    {t.is_official === false ? (
                                        <span style={{
                                            color: 'var(--accent-primary)',
                                            fontStyle: 'italic',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            🎾 Unofficial friendly tournament - no ranking
                                        </span>
                                    ) : (
                                        <>
                                            {ranksToShow.map(r => (
                                                <span key={r.rank} className="rank-pill">
                                                    #{r.rank} {r.players.join(', ')}
                                                </span>
                                            ))}

                                            {hasMore && !isExpanded && (
                                                <span
                                                    className="more clickable"
                                                    onClick={() => toggleTournamentExpansion(t.id)}
                                                >
                                                    +{t.ranks.length - 3} more
                                                </span>
                                            )}

                                            {hasMore && isExpanded && (
                                                <span
                                                    className="more clickable"
                                                    onClick={() => toggleTournamentExpansion(t.id)}
                                                >
                                                    Show Less
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="pagination-container">
                    <div className="pagination-info">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, history.length)} of {history.length} results
                    </div>

                    <div className="pagination-controls">
                        <button
                            className="page-btn nav-btn"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        {getPageNumbers().map((page, index) => (
                            page === '...' ? (
                                <span key={`dots-${index}`} className="dots">
                                    <MoreHorizontal size={16} />
                                </span>
                            ) : (
                                <button
                                    key={page}
                                    className={`page-btn number-btn ${currentPage === page ? 'active' : ''}`}
                                    onClick={() => handlePageChange(page)}
                                >
                                    {page}
                                </button>
                            )
                        ))}

                        <button
                            className="page-btn nav-btn"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="items-per-page">
                        <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                            <option value={5}>5 per page</option>
                            <option value={10}>10 per page</option>
                            <option value={20}>20 per page</option>
                            <option value={50}>50 per page</option>
                        </select>
                    </div>
                </div>
            </div>



            {/* YouTube Embed Modal */}
            <Dialog
                open={showYouTubeModal}
                onClose={() => setShowYouTubeModal(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        width: isMobile ? '97%' : undefined,
                        maxHeight: isMobile ? '95vh' : undefined,
                        margin: isMobile ? '8px' : undefined
                    }
                }}
            >
                <DialogTitle sx={{ background: 'var(--gradient-primary, linear-gradient(135deg, #FF0000 0%, #CC0000 100%))', color: 'white' }}>
                    📺 Tournament Video
                </DialogTitle>
                <DialogContent sx={{ mt: 2, minHeight: '400px' }}>
                    {currentEmbedUrl ? (
                        <div
                            dangerouslySetInnerHTML={{ __html: currentEmbedUrl }}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                '& iframe': {
                                    maxWidth: '100%',
                                    height: 'auto'
                                }
                            }}
                        />
                    ) : (
                        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                            No embed URL available.
                            {currentPlaylistUrl && (
                                <a
                                    href={currentPlaylistUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#FF0000', marginLeft: '0.5rem' }}
                                >
                                    Open playlist in YouTube
                                </a>
                            )}
                        </p>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    {currentPlaylistUrl && (
                        <Button
                            onClick={() => window.open(currentPlaylistUrl, '_blank')}
                            sx={{ marginRight: 'auto', color: '#FF0000' }}
                        >
                            Open Full Playlist
                        </Button>
                    )}
                    <Button onClick={() => setShowYouTubeModal(false)} color="inherit">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div >
    );
};

export default AnalyticsDashboard;
