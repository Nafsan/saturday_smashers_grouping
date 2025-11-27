import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { generateGroupsAction } from '../store/appSlice';
import { Trophy, Sparkles, DollarSign, ExternalLink, Youtube, UserPlus } from 'lucide-react';
import { Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import AnalyticsDashboard from './AnalyticsDashboard';
import RankSubmission from './RankSubmission';
import GlobalRanking from './GlobalRanking';
import TournamentFixtureModal from './TournamentFixtureModal';
import AddPlayer from './AddPlayer';
import './PlayerSelection.scss';

const PlayerSelection = () => {
    const dispatch = useDispatch();
    const [showGlobalRanking, setShowGlobalRanking] = useState(false);
    const [isRankModalOpen, setIsRankModalOpen] = useState(false);
    const [editingTournament, setEditingTournament] = useState(null);
    const [isFixtureModalOpen, setIsFixtureModalOpen] = useState(false);
    const [isFundDialogOpen, setIsFundDialogOpen] = useState(false);
    const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);

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

    const handleOpenFundDialog = () => {
        setIsFundDialogOpen(true);
    };

    const handleOpenGoogleSheet = () => {
        window.open('https://docs.google.com/spreadsheets/d/14YX5WOcggCMg38jENKCMr9AmhQac4dZrA3lRxaUhekQ/edit?usp=sharing', '_blank');
    };

    const handleOpenYouTube = () => {
        window.open('https://www.youtube.com/@PongTTT-bd', '_blank');
    };

    return (
        <div className="player-selection">
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
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Coming Soon! 🚀</div>
                                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Track contributions & expenses</div>
                            </div>
                        }
                        arrow
                        placement="bottom"
                    >
                        <button
                            className="secondary-btn coming-soon-btn"
                            onClick={handleOpenFundDialog}
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
                </div>
            </div>

            <AnalyticsDashboard onEdit={handleEditTournament} />

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

            {/* Saturday Smashers Fund Dialog */}
            <Dialog
                open={isFundDialogOpen}
                onClose={() => setIsFundDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DollarSign size={24} />
                        Saturday Smashers Fund
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#f59e0b', fontWeight: 'bold' }}>
                        🚀 Coming Soon to This Site!
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        We're working hard to bring fund maintenance features directly to this platform.
                        Soon you'll be able to track contributions and expenses right here!
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        In the meantime, you can access the current fund tracking system:
                    </Typography>
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: 2,
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}
                    >
                        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                            Current Fund Tracking:
                        </Typography>
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handleOpenGoogleSheet}
                            endIcon={<ExternalLink size={18} />}
                            sx={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                                }
                            }}
                        >
                            Open Google Sheets
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setIsFundDialogOpen(false)} color="inherit">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Player Modal */}
            <AddPlayer
                open={isAddPlayerOpen}
                onClose={() => setIsAddPlayerOpen(false)}
            />
        </div>
    );
};

export default PlayerSelection;
