import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { generateGroupsAction } from '../store/appSlice';
import { Trophy, Sparkles, DollarSign, Youtube, UserPlus, BarChart3, Calculator } from 'lucide-react';
import { Tooltip } from '@mui/material';
import AnalyticsDashboard from './AnalyticsDashboard';
import RankSubmission from './RankSubmission';
import GlobalRanking from './GlobalRanking';
import TournamentFixtureModal from './TournamentFixtureModal';
import AddPlayer from './AddPlayer';
import DaysPlayedChart from './DaysPlayedChart';
import PlayerStatsModal from './PlayerStatsModal';
import ThemeToggle from './ThemeToggle';
import './AppLandingPage.scss';

const AppLandingPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showGlobalRanking, setShowGlobalRanking] = useState(false);
    const [isRankModalOpen, setIsRankModalOpen] = useState(false);
    const [editingTournament, setEditingTournament] = useState(null);
    const [isFixtureModalOpen, setIsFixtureModalOpen] = useState(false);
    const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
    const [isPlayerStatsOpen, setIsPlayerStatsOpen] = useState(false);

    const handleEditTournament = (tournament) => {
        setEditingTournament(tournament);
        setIsRankModalOpen(true);
    };

    const handleOpenSubmit = () => {
        setEditingTournament(null);
        setIsRankModalOpen(true);
    };

    const handleGenerateGroups = () => {
        dispatch(generateGroupsAction());
    };

    const handleOpenFundPage = () => {
        navigate('/fund');
    };

    const handleOpenYouTube = () => {
        window.open('https://www.youtube.com/@PongTTT-bd', '_blank');
    };

    return (
        <div className="app-landing-page-container">
            <ThemeToggle />
            <div className="config-section">
                <div className="action-buttons">
                    <button className="secondary-btn" onClick={() => setIsFixtureModalOpen(true)} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                        <Sparkles size={18} /> Create Tournament Fixture
                    </button>
                    <button className="secondary-btn" onClick={() => setShowGlobalRanking(true)}>
                        <Trophy size={18} /> Group Standings
                    </button>
                    <button className="secondary-btn" onClick={handleOpenSubmit} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <Trophy size={18} /> Submit Results
                    </button>
                    <button
                        className="secondary-btn"
                        onClick={() => navigate('/gtt-elo-calculator')}
                        style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}
                    >
                        <Calculator size={18} /> GTT ELO Calculator
                    </button>
                    <Tooltip
                        title={
                            <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Watch Tournament Videos!</div>
                                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Subscribe to PongTTT</div>
                            </div>
                        }
                        arrow
                        placement="bottom"
                    >
                        <button
                            className="secondary-btn youtube-btn"
                            onClick={handleOpenYouTube}
                            style={{
                                background: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
                                position: 'relative'
                            }}
                        >
                            <Youtube size={18} /> YouTube Channel
                        </button>
                    </Tooltip>
                    <Tooltip
                        title={
                            <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Fund Management 💰</div>
                                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Track contributions & expenses</div>
                            </div>
                        }
                        arrow
                        placement="bottom"
                    >
                        <button
                            className="secondary-btn"
                            onClick={handleOpenFundPage}
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                position: 'relative'
                            }}
                        >
                            <DollarSign size={18} /> Saturday Smashers Fund
                        </button>
                    </Tooltip>
                    <button
                        className="secondary-btn"
                        onClick={() => setIsAddPlayerOpen(true)}
                        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    >
                        <UserPlus size={18} /> Add Player
                    </button>
                    <button
                        className="secondary-btn"
                        onClick={() => setIsPlayerStatsOpen(true)}
                        style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}
                    >
                        <BarChart3 size={18} /> Player Stats
                    </button>
                </div>
            </div>

            <AnalyticsDashboard onEdit={handleEditTournament} />

            <DaysPlayedChart />

            <TournamentFixtureModal
                open={isFixtureModalOpen}
                onClose={() => setIsFixtureModalOpen(false)}
                onGenerate={handleGenerateGroups}
            />

            <RankSubmission
                open={isRankModalOpen}
                onClose={() => {
                    setIsRankModalOpen(false);
                    setEditingTournament(null);
                }}
                initialData={editingTournament}
            />

            {showGlobalRanking && (
                <GlobalRanking onClose={() => setShowGlobalRanking(false)} />
            )}

            {/* Add Player Modal */}
            <AddPlayer
                open={isAddPlayerOpen}
                onClose={() => setIsAddPlayerOpen(false)}
            />

            {/* Player Stats Modal */}
            <PlayerStatsModal
                open={isPlayerStatsOpen}
                onClose={() => setIsPlayerStatsOpen(false)}
            />
        </div>
    );
};

export default AppLandingPage;
