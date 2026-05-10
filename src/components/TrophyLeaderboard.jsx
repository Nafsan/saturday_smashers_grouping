import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star } from 'lucide-react';
import './TrophyLeaderboard.scss';

const TrophyLeaderboard = () => {
    const { trophyLeaderboard } = useSelector((state) => state.app);

    if (!trophyLeaderboard || trophyLeaderboard.length === 0) {
        return null;
    }

    return (
        <div className="trophy-leaderboard-container">
            <h2 className="section-title">
                <Trophy className="title-icon" />
                Trophy Hall of Fame
            </h2>
            <div className="leaderboard-grid">
                {trophyLeaderboard.map((player, index) => {
                    const isTopThree = index < 3;
                    const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'regular';
                    
                    return (
                        <motion.div 
                            key={player.name}
                            className={`trophy-card ${rankClass}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="rank-badge">
                                {index === 0 && <Trophy size={20} />}
                                {index === 1 && <Medal size={20} />}
                                {index === 2 && <Star size={20} />}
                                {index > 2 && <span>#{index + 1}</span>}
                            </div>
                            <div className="player-info">
                                <span className="player-name">{player.name}</span>
                                <div className="stats-container">
                                    <div className="trophy-count-container">
                                        <span className="count">{player.trophy_count}</span>
                                        <span className="label">{player.trophy_count === 1 ? 'Trophy' : 'Trophies'}</span>
                                    </div>
                                    <div className="tournaments-played-container">
                                        <span className="p-count">{player.tournaments_played}</span>
                                        <span className="p-label">Played</span>
                                    </div>
                                </div>
                            </div>
                            {isTopThree && (
                                <div className="visual-indicator">
                                    {[...Array(Math.min(player.trophy_count, 5))].map((_, i) => (
                                        <Trophy key={i} size={14} className="mini-trophy" />
                                    ))}
                                    {player.trophy_count > 5 && <span className="more-indicator">+{player.trophy_count - 5}</span>}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default TrophyLeaderboard;
