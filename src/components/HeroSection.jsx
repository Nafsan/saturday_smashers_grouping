import { Trophy, Sparkles, BarChart3 } from 'lucide-react';
import './HeroSection.scss';

const HeroSection = ({ onPlayerStats, onViewRankings, onCreateFixture }) => {
    return (
        <div className="hero-section">
            <div className="hero-background"></div>
            <div className="hero-content">
                {/* Cover Photo */}
                {/* <div className="hero-cover">
                    <img
                        src="/saturday_smashers_grouping/assets/cover.png"
                        alt="Saturday Smashers Cover"
                        className="cover-image"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div> */}

                {/* Main Content */}
                <div className="hero-text">
                    <h1 className="hero-title">
                        <span className="title-text">Saturday Smashers</span>
                    </h1>
                    <p className="hero-tagline">
                        Your Ultimate Table Tennis Tournament Hub
                    </p>
                    <p className="hero-description">
                        Track rankings, manage tournaments, and celebrate every smash with our community
                    </p>
                </div>

                {/* Primary CTAs */}
                <div className="hero-actions">
                    <button className="cta-button primary" onClick={onPlayerStats}>
                        <BarChart3 size={20} />
                        <span>Player Stats</span>
                    </button>
                    <button className="cta-button secondary" onClick={onViewRankings}>
                        <Trophy size={20} />
                        <span>View Rankings</span>
                    </button>
                </div>

                {/* Quick Action */}
                <div className="quick-action">
                    <button className="quick-action-btn" onClick={onCreateFixture}>
                        <Sparkles size={18} />
                        <span>Create Tournament Fixture</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;
