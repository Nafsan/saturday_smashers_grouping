import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { X, Trophy, TrendingUp, Award, Target } from 'lucide-react';
import Select from 'react-select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { fetchPlayerStatistics } from '../api/client';
import './PlayerStatsModal.scss';

// Player categories data
const playerCategoriesData = {
    categories: [
        { id: "consistent_champion", name: "Consistent Champion", statements: ["🏆 You're a true champion! Your consistency at the top is remarkable. Keep dominating!", "👑 Excellence is your standard! Your regular podium finishes inspire everyone.", "⭐ A champion's mindset shows in every tournament. Your dedication is unmatched!", "🔥 Top-tier performance is your norm. You set the bar for everyone else!"] },
        { id: "comeback_king", name: "Comeback King", statements: ["💪 Your resilience is inspiring! You never stay down for long.", "🚀 Every setback is just a setup for your comeback. Keep bouncing back!", "⚡ You prove that champions aren't defined by falls, but by how they rise!", "🎯 Your ability to recover and improve is what makes you special!"] },
        { id: "plate_specialist", name: "Plate Specialist", statements: ["🛡️ You own the Plate division! Your dominance here is undeniable.", "💎 Plate champion through and through! Your consistency is your strength.", "🌟 You've made the Plate your kingdom. Keep ruling!", "⚔️ Every Plate tournament is your battlefield, and you're winning the war!"] },
        { id: "rising_star", name: "Rising Star", statements: ["📈 Your improvement trajectory is incredible! The sky's the limit!", "🌠 Rising fast! Your recent performances show you're destined for greatness.", "🚀 Watch out world! This rising star is about to shine bright!", "✨ Your growth is exponential. Keep climbing, champion!", "🔝 The only way is up! Your progress is phenomenal!"] },
        { id: "versatile_performer", name: "Versatile Performer", statements: ["🎭 Versatility is your superpower! You excel everywhere you play.", "🌈 Cup or Plate, you bring your A-game. True all-rounder!", "⚖️ Balanced and brilliant! Your adaptability sets you apart.", "🎪 You're comfortable in any arena. That's the mark of a true competitor!"] },
        { id: "cup_regular", name: "Cup Regular", statements: ["🏅 Cup is your home! You belong among the elite.", "👊 You're a Cup mainstay! Your presence in top tier is well-earned.", "💫 Cup regular with championship potential! Keep pushing!", "🎖️ You've earned your place in the Cup. Now claim your trophy!"] },
        { id: "underdog_hero", name: "Underdog Hero", statements: ["🦸 When you peak, you're unstoppable! Those breakthrough moments are magic!", "💥 Your surprise victories keep everyone on their toes!", "🎲 Unpredictability is your weapon. When you strike, you strike hard!", "⚡ Those clutch performances show your true potential. Unleash it more often!", "🌟 Your best is championship-level. Bring it out consistently!"] },
        { id: "steady_eddie", name: "Steady Eddie", statements: ["🎯 Consistency is key, and you've mastered it! Solid as a rock.", "⚓ Reliable and steady! Your consistency is your foundation for growth.", "📊 Your stable performance shows discipline. Now reach for the stars!", "🔄 Steady progress beats wild swings. You're building something great!"] },
        { id: "wildcard", name: "Wildcard", statements: ["🎰 You're the wildcard! When you're hot, you're unstoppable!", "🌪️ Unpredictable and exciting! Find your rhythm and you'll dominate.", "🎢 Your performance is a rollercoaster, but those highs are incredible!", "⚡ Channel that peak performance more often and you'll be unstoppable!", "🔮 Your potential is sky-high. Consistency will unlock it!"] },
        { id: "plate_warrior", name: "Plate Warrior", statements: ["⚔️ Plate Warrior! Your dominance in this division is legendary!", "🛡️ You've conquered the Plate! Multiple championships prove your class.", "👑 Plate royalty! Your reign continues with every tournament.", "💪 Plate champion multiple times over! You're the one to beat!", "🏆 The Plate belongs to you! Your legacy is being written!"] },
        { id: "cup_contender", name: "Cup Contender", statements: ["🥇 You're always in the mix! Cup contender through and through.", "🎯 Top 4 is your territory! That championship is within reach.", "💎 Elite performer! You belong among the best.", "🔥 You're knocking on the door of greatness! Keep pushing!", "⭐ Semi-finals and beyond is your standard. Championship next!"] },
        { id: "developing_talent", name: "Developing Talent", statements: ["🌱 Welcome to the journey! Every tournament is a learning experience.", "🎓 You're building your legacy one tournament at a time!", "🚀 New to the scene but full of potential! The future is bright!", "💫 Every champion started somewhere. Your journey has begun!", "🌟 Fresh talent with unlimited potential! Keep learning and growing!"] },
        { id: "tournament_veteran", name: "Tournament Veteran", statements: ["🎖️ Veteran presence! Your experience is invaluable to the community.", "👴 You've seen it all! Your dedication to the game is inspiring.", "📚 Tournament wisdom personified! Your consistency in showing up matters.", "🏛️ A pillar of the community! Your commitment is legendary.", "⏰ Time and dedication build champions. You embody both!"] },
        { id: "clutch_performer", name: "Clutch Performer", statements: ["🔥 You're heating up! Recent form is outstanding!", "📈 Peaking at the right time! Your best is yet to come!", "⚡ On fire lately! This momentum is championship-worthy!", "💪 Your recent surge shows you're ready for the next level!", "🎯 Locked in! Your current form is exceptional!"] },
        { id: "balanced_competitor", name: "Balanced Competitor", statements: ["⚖️ Balanced and competitive! You bring solid performance every time.", "🎯 Consistent competitor! Your presence makes every tournament better.", "💪 You show up and compete! That's what champions are made of.", "🌟 Every tournament is an opportunity to shine. Keep competing!", "🏓 Your competitive spirit is what it's all about! Keep playing!"] }
    ]
};

const PlayerStatsModal = ({ open, onClose }) => {
    const { allPlayers } = useSelector(state => state.app);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerData, setPlayerData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Custom styles for react-select
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: '#1e293b',
            borderColor: state.isFocused ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
            boxShadow: state.isFocused ? '0 0 0 1px #38bdf8' : 'none',
            '&:hover': {
                borderColor: '#38bdf8'
            },
            padding: '4px'
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
        singleValue: (provided) => ({
            ...provided,
            color: '#f8fafc'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: '#94a3b8'
        }),
        input: (provided) => ({
            ...provided,
            color: '#f8fafc'
        })
    };

    const playerOptions = useMemo(() => {
        // Handle both old format (array of strings) and new format (array of objects)
        if (allPlayers.length === 0) return [];

        if (typeof allPlayers[0] === 'string') {
            // Legacy format - just names
            return allPlayers.map(player => ({ value: player, label: player, isLegacy: true }));
        } else {
            // New format - objects with id and name
            return allPlayers.map(player => ({ value: player.id, label: player.name, playerObj: player }));
        }
    }, [allPlayers]);

    const handlePlayerSelect = async (selectedOption) => {
        if (!selectedOption) {
            setSelectedPlayer(null);
            setPlayerData(null);
            return;
        }

        setSelectedPlayer(selectedOption);
        setLoading(true);
        setError(null);

        try {
            // Use player ID for API call
            const playerId = selectedOption.isLegacy ? null : selectedOption.value;
            if (!playerId) {
                setError('Player ID not available. Please refresh the page.');
                setLoading(false);
                return;
            }

            const data = await fetchPlayerStatistics(playerId);
            setPlayerData(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch player statistics');
            setPlayerData(null);
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics
    const statistics = useMemo(() => {
        if (!playerData || !playerData.tournaments) return null;

        const stats = {
            cupChampion: 0,
            cupRunnerUp: 0,
            cupSemiFinalist: 0,
            cupQuarterFinalist: 0,
            plateChampion: 0,
            plateRunnerUp: 0,
            plateSemiFinalist: 0,
            plateQuarterFinalist: 0,
            totalTournaments: playerData.tournaments.length,
            ranks: []
        };

        playerData.tournaments.forEach(tournament => {
            tournament.ranks.forEach(rankGroup => {
                if (rankGroup.players.includes(playerData.player_name)) {
                    stats.ranks.push({
                        date: tournament.date,
                        rank: rankGroup.rank,
                        rating: rankGroup.rating
                    });

                    // Cup achievements (ratings 1-4)
                    if (rankGroup.rating === 1) stats.cupChampion++;
                    else if (rankGroup.rating === 2) stats.cupRunnerUp++;
                    else if (rankGroup.rating === 3) stats.cupSemiFinalist++;
                    else if (rankGroup.rating === 4) stats.cupQuarterFinalist++;
                    // Plate achievements (ratings 5-8)
                    else if (rankGroup.rating === 5) stats.plateChampion++;
                    else if (rankGroup.rating === 6) stats.plateRunnerUp++;
                    else if (rankGroup.rating === 7) stats.plateSemiFinalist++;
                    else if (rankGroup.rating === 8) stats.plateQuarterFinalist++;
                }
            });
        });

        return stats;
    }, [playerData]);

    // Categorize player and get motivational statement
    const playerCategory = useMemo(() => {
        if (!statistics || statistics.totalTournaments === 0) return null;

        const totalCup = statistics.cupChampion + statistics.cupRunnerUp + statistics.cupSemiFinalist + statistics.cupQuarterFinalist;
        const totalPlate = statistics.plateChampion + statistics.plateRunnerUp + statistics.plateSemiFinalist + statistics.plateQuarterFinalist;
        const cupPercentage = (totalCup / statistics.totalTournaments) * 100;
        const topTwoFinishes = statistics.cupChampion + statistics.cupRunnerUp;
        const topTwoPercentage = (topTwoFinishes / statistics.totalTournaments) * 100;
        const topFourFinishes = topTwoFinishes + statistics.cupSemiFinalist;
        const topFourPercentage = (topFourFinishes / statistics.totalTournaments) * 100;
        const platePercentage = (totalPlate / statistics.totalTournaments) * 100;

        // Recent trend (last 5 tournaments)
        const recentRanks = statistics.ranks.slice(0, 5).map(r => r.rating);
        const olderRanks = statistics.ranks.slice(5, 10).map(r => r.rating);
        const recentAvg = recentRanks.length > 0 ? recentRanks.reduce((a, b) => a + b, 0) / recentRanks.length : 0;
        const olderAvg = olderRanks.length > 0 ? olderRanks.reduce((a, b) => a + b, 0) / olderRanks.length : 0;
        const isImproving = recentAvg < olderAvg && recentRanks.length >= 3;

        // Calculate standard deviation for variability
        const avgRating = statistics.ranks.reduce((a, b) => a + b.rating, 0) / statistics.ranks.length;
        const variance = statistics.ranks.reduce((sum, r) => sum + Math.pow(r.rating - avgRating, 2), 0) / statistics.ranks.length;
        const stdDev = Math.sqrt(variance);

        let category = null;

        // Check if categories data is available
        if (!playerCategoriesData || !playerCategoriesData.categories) {
            return null;
        }

        // Categorization logic
        if (statistics.totalTournaments < 5) {
            category = playerCategoriesData.categories.find(c => c.id === 'developing_talent');
        } else if (statistics.totalTournaments >= 15) {
            category = playerCategoriesData.categories.find(c => c.id === 'tournament_veteran');
        } else if (topTwoPercentage >= 60) {
            category = playerCategoriesData.categories.find(c => c.id === 'consistent_champion');
        } else if (isImproving && recentAvg <= 3) {
            category = playerCategoriesData.categories.find(c => c.id === 'rising_star');
        } else if (recentAvg < olderAvg - 1 && statistics.totalTournaments >= 8) {
            category = playerCategoriesData.categories.find(c => c.id === 'comeback_king');
        } else if (platePercentage >= 70) {
            if (statistics.plateChampion >= 3) {
                category = playerCategoriesData.categories.find(c => c.id === 'plate_warrior');
            } else {
                category = playerCategoriesData.categories.find(c => c.id === 'plate_specialist');
            }
        } else if (cupPercentage >= 70) {
            if (topFourPercentage >= 50) {
                category = playerCategoriesData.categories.find(c => c.id === 'cup_contender');
            } else {
                category = playerCategoriesData.categories.find(c => c.id === 'cup_regular');
            }
        } else if (platePercentage >= 40 && cupPercentage >= 40) {
            category = playerCategoriesData.categories.find(c => c.id === 'versatile_performer');
        } else if (stdDev >= 2) {
            if (statistics.cupChampion >= 1 || statistics.cupRunnerUp >= 1) {
                category = playerCategoriesData.categories.find(c => c.id === 'underdog_hero');
            } else {
                category = playerCategoriesData.categories.find(c => c.id === 'wildcard');
            }
        } else if (avgRating >= 3 && avgRating <= 6 && stdDev < 1.5) {
            category = playerCategoriesData.categories.find(c => c.id === 'steady_eddie');
        } else if (recentAvg < avgRating && statistics.totalTournaments >= 5) {
            category = playerCategoriesData.categories.find(c => c.id === 'clutch_performer');
        } else {
            category = playerCategoriesData.categories.find(c => c.id === 'balanced_competitor');
        }

        // Check if category was found
        if (!category) {
            return null;
        }

        // Select random statement from category
        const randomStatement = category.statements[Math.floor(Math.random() * category.statements.length)];

        return {
            ...category,
            selectedStatement: randomStatement
        };
    }, [statistics]);

    // Prepare chart data
    const achievementChartData = useMemo(() => {
        if (!statistics) return [];
        return [
            { name: 'Cup Champion', count: statistics.cupChampion, fill: '#fbbf24' },
            { name: 'Cup Runner-up', count: statistics.cupRunnerUp, fill: '#94a3b8' },
            { name: 'Cup Semi-finalist', count: statistics.cupSemiFinalist, fill: '#cd7f32' },
            { name: 'Cup Quarter-finalist', count: statistics.cupQuarterFinalist, fill: '#64748b' },
            { name: 'Plate Champion', count: statistics.plateChampion, fill: '#10b981' },
            { name: 'Plate Runner-up', count: statistics.plateRunnerUp, fill: '#6ee7b7' },
            { name: 'Plate Semi-finalist', count: statistics.plateSemiFinalist, fill: '#86efac' },
            { name: 'Plate Quarter-finalist', count: statistics.plateQuarterFinalist, fill: '#bbf7d0' }
        ].filter(item => item.count > 0);
    }, [statistics]);

    const pieChartData = useMemo(() => {
        if (!statistics) return [];
        const totalCup = statistics.cupChampion + statistics.cupRunnerUp + statistics.cupSemiFinalist + statistics.cupQuarterFinalist;
        const totalPlate = statistics.plateChampion + statistics.plateRunnerUp + statistics.plateSemiFinalist + statistics.plateQuarterFinalist;
        return [
            { name: 'Cup', value: totalCup, fill: '#38bdf8' },
            { name: 'Plate', value: totalPlate, fill: '#10b981' }
        ].filter(item => item.value > 0);
    }, [statistics]);

    const performanceTrendData = useMemo(() => {
        if (!statistics) return [];
        return statistics.ranks.slice(0, 10).reverse().map(r => ({
            date: r.date.substring(5),
            rating: r.rating
        }));
    }, [statistics]);

    if (!open) return null;

    return (
        <div className="player-stats-overlay" onClick={onClose}>
            <div className="player-stats-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><Trophy size={24} color="#fbbf24" /> Player Statistics</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="player-selector">
                    <label>Select Player:</label>
                    <Select
                        options={playerOptions}
                        value={selectedPlayer}
                        onChange={handlePlayerSelect}
                        styles={customSelectStyles}
                        placeholder="Choose a player..."
                        isClearable
                    />
                </div>

                <div className="modal-content">
                    {loading && (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading statistics...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-state">
                            <p>❌ {error}</p>
                        </div>
                    )}

                    {!loading && !error && !playerData && (
                        <div className="empty-state">
                            <Trophy size={48} color="#94a3b8" />
                            <p>Select a player to view their statistics</p>
                        </div>
                    )}

                    {!loading && !error && playerData && statistics && (
                        <>
                            {/* Player Category & Motivational Statement */}
                            {playerCategory && (
                                <div className="player-category-card">
                                    <div className="category-header">
                                        <Award size={20} color="#fbbf24" />
                                        <h3>{playerCategory.name}</h3>
                                    </div>
                                    <p className="motivational-statement">{playerCategory.selectedStatement}</p>
                                </div>
                            )}

                            {/* Statistics Summary */}
                            <div className="stats-summary">
                                <div className="stat-card">
                                    <Target size={20} />
                                    <div>
                                        <div className="stat-value">{statistics.totalTournaments}</div>
                                        <div className="stat-label">Total Tournaments</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <Trophy size={20} color="#fbbf24" />
                                    <div>
                                        <div className="stat-value">{statistics.cupChampion}</div>
                                        <div className="stat-label">Cup Championships</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <Trophy size={20} color="#10b981" />
                                    <div>
                                        <div className="stat-value">{statistics.plateChampion}</div>
                                        <div className="stat-label">Plate Championships</div>
                                    </div>
                                </div>
                            </div>

                            {/* Achievement Table */}
                            <div className="achievements-section">
                                <h3><Award size={20} /> Achievement Breakdown</h3>
                                <table className="achievements-table">
                                    <thead>
                                        <tr>
                                            <th>Achievement</th>
                                            <th>Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>🏆 Cup Champion</td>
                                            <td>{statistics.cupChampion}</td>
                                        </tr>
                                        <tr>
                                            <td>🥈 Cup Runner-up</td>
                                            <td>{statistics.cupRunnerUp}</td>
                                        </tr>
                                        <tr>
                                            <td>🥉 Cup Semi-finalist</td>
                                            <td>{statistics.cupSemiFinalist}</td>
                                        </tr>
                                        <tr>
                                            <td>📊 Cup Quarter-finalist</td>
                                            <td>{statistics.cupQuarterFinalist}</td>
                                        </tr>
                                        <tr className="plate-section">
                                            <td>🛡️ Plate Champion</td>
                                            <td>{statistics.plateChampion}</td>
                                        </tr>
                                        <tr>
                                            <td>🥈 Plate Runner-up</td>
                                            <td>{statistics.plateRunnerUp}</td>
                                        </tr>
                                        <tr>
                                            <td>🥉 Plate Semi-finalist</td>
                                            <td>{statistics.plateSemiFinalist}</td>
                                        </tr>
                                        <tr>
                                            <td>📊 Plate Quarter-finalist</td>
                                            <td>{statistics.plateQuarterFinalist}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Charts */}
                            <div className="charts-section">
                                {/* Achievement Distribution */}
                                {achievementChartData.length > 0 && (
                                    <div className="chart-container">
                                        <h3><TrendingUp size={20} /> Achievement Distribution</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={achievementChartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-45} textAnchor="end" height={100} />
                                                <YAxis stroke="#94a3b8" />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#f8fafc' }}
                                                />
                                                <Bar dataKey="count" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Cup vs Plate Distribution */}
                                {pieChartData.length > 0 && (
                                    <div className="chart-container">
                                        <h3>Cup vs Plate Participation</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={pieChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={80}
                                                    dataKey="value"
                                                >
                                                    {pieChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#f8fafc' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Performance Trend */}
                                {performanceTrendData.length > 0 && (
                                    <div className="chart-container full-width">
                                        <h3><TrendingUp size={20} /> Performance Trend (Last 10 Tournaments)</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={performanceTrendData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                                <YAxis stroke="#94a3b8" reversed domain={[1, 8]} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#f8fafc' }}
                                                />
                                                <Legend />
                                                <Line type="monotone" dataKey="rating" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4 }} name="Rating" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerStatsModal;
