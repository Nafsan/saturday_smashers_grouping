import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { generateGroupsAction } from '../store/appSlice';
import NavigationBar from './NavigationBar';
import HeroSection from './HeroSection';
import StatsOverview from './StatsOverview';
import AnalyticsDashboard from './AnalyticsDashboard';
import RankSubmission from './RankSubmission';
import GlobalRanking from './GlobalRanking';
import TournamentFixtureModal from './TournamentFixtureModal';
import AddPlayer from './AddPlayer';
import DaysPlayedChart from './DaysPlayedChart';
import PlayerStatsModal from './PlayerStatsModal';
import { isAdminAuthenticated } from '../utils/cookieUtils';
import './AppLandingPage.scss';

const AppLandingPage = () => {
    const dispatch = useDispatch();
    const [showGlobalRanking, setShowGlobalRanking] = useState(false);
    const [isRankModalOpen, setIsRankModalOpen] = useState(false);
    const [editingTournament, setEditingTournament] = useState(null);
    const [isFixtureModalOpen, setIsFixtureModalOpen] = useState(false);
    const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
    const [isPlayerStatsOpen, setIsPlayerStatsOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(isAdminAuthenticated());

    useEffect(() => {
        const handleAuthChange = () => {
            setIsLoggedIn(isAdminAuthenticated());
        };
        window.addEventListener('authStatusChanged', handleAuthChange);
        return () => window.removeEventListener('authStatusChanged', handleAuthChange);
    }, []);

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

    return (
        <div className="app-landing-page-container">
            {/* Navigation Bar */}
            <NavigationBar
                onAddPlayer={() => setIsAddPlayerOpen(true)}
                onPlayerStats={() => setIsPlayerStatsOpen(true)}
                onSubmitResults={handleOpenSubmit}
            />

            {/* Hero Section */}
            <HeroSection
                onPlayerStats={() => setIsPlayerStatsOpen(true)}
                onViewRankings={() => setShowGlobalRanking(true)}
                onCreateFixture={isLoggedIn ? () => setIsFixtureModalOpen(true) : null}
            />

            {/* Stats Overview */}
            <StatsOverview />

            {/* Recent Tournaments Section */}
            <section className="content-section">
                <div className="section-header">
                    <h2>Recent Tournaments</h2>
                    <p>View results and standings from our latest competitions</p>
                </div>
                <AnalyticsDashboard onEdit={isLoggedIn ? handleEditTournament : null} />
            </section>

            {/* Activity Insights Section */}
            <section className="content-section">
                <div className="section-header">
                    <h2>Activity Insights</h2>
                    <p>Track player participation and tournament frequency</p>
                </div>
                <DaysPlayedChart />
            </section>

            {/* Modals */}
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

            <AddPlayer
                open={isAddPlayerOpen}
                onClose={() => setIsAddPlayerOpen(false)}
            />

            <PlayerStatsModal
                open={isPlayerStatsOpen}
                onClose={() => setIsPlayerStatsOpen(false)}
            />
        </div>
    );
};

export default AppLandingPage;
