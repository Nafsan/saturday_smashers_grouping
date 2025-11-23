import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Select from 'react-select';
import { Edit } from 'lucide-react';
import './AnalyticsDashboard.scss';

const AnalyticsDashboard = ({ onEdit }) => {
    const { history, allPlayers } = useSelector(state => state.app);
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [selectedGraphPlayers, setSelectedGraphPlayers] = useState([]);
    const [expandedTournaments, setExpandedTournaments] = useState([]);

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

    // Custom styles for react-select to match dark theme
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: '#1e293b', // var(--bg-card)
            borderColor: state.isFocused ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
            boxShadow: state.isFocused ? '0 0 0 1px #38bdf8' : 'none',
            '&:hover': {
                borderColor: '#38bdf8'
            },
            padding: '2px'
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 50
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#38bdf8' : state.isFocused ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
            color: state.isSelected ? '#fff' : '#f8fafc',
            cursor: 'pointer',
            ':active': {
                backgroundColor: '#38bdf8'
            }
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            borderRadius: '4px'
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: '#38bdf8',
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: '#38bdf8',
            ':hover': {
                backgroundColor: '#38bdf8',
                color: 'white',
            },
        }),
        input: (provided) => ({
            ...provided,
            color: '#f8fafc'
        }),
        singleValue: (provided) => ({
            ...provided,
            color: '#f8fafc'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: '#94a3b8'
        })
    };

    // Prepare data for the graph
    const graphData = useMemo(() => {
        // Sort history by date ascending for the graph
        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        const recentHistory = sortedHistory.slice(-10); // Last 10

        return recentHistory.map(t => {
            const point = { date: t.date };
            t.ranks.forEach(r => {
                r.players.forEach(p => {
                    point[p] = r.rank;
                });
            });
            return point;
        });
    }, [history]);

    // Colors for lines
    const colors = ['#38bdf8', '#818cf8', '#4ade80', '#f472b6', '#fbbf24'];

    // Recent Tournaments List
    const displayedHistory = showAllHistory ? history : history.slice(0, 5);

    return (
        <div className="analytics-dashboard">
            <h3>Player Performance Trends</h3>

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
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(d) => d.substring(5)} />
                            <YAxis stroke="#94a3b8" reversed={true} domain={[1, 'auto']} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#f8fafc' }}
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
                                    {onEdit && (
                                        <button
                                            onClick={() => onEdit(t)}
                                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                            title="Edit Tournament"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="ranks-preview">
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
                                </div>
                            </div>
                        );
                    })}
                </div>
                {history.length > 5 && (
                    <button className="load-more" onClick={() => setShowAllHistory(!showAllHistory)}>
                        {showAllHistory ? <><ChevronUp size={16} /> Show Less</> : <><ChevronDown size={16} /> Show Older</>}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
