import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { togglePlayerSelection, generateGroupsAction, setTournamentDate, addNewPlayer } from '../store/appSlice';
import { Calendar, UserPlus, Trophy } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import RankSubmission from './RankSubmission';
import GlobalRanking from './GlobalRanking';
import { useToast } from '../context/ToastContext';
import './PlayerSelection.scss';

const PlayerSelection = () => {
    const { allPlayers, selectedPlayers, tournamentDate } = useSelector(state => state.app);
    const dispatch = useDispatch();
    const { warningNotification } = useToast();
    const [newPlayerName, setNewPlayerName] = useState('');
    const [showGlobalRanking, setShowGlobalRanking] = useState(false);
    const [isRankModalOpen, setIsRankModalOpen] = useState(false);
    const [editingTournament, setEditingTournament] = useState(null);

    const handleEditTournament = (tournament) => {
        setEditingTournament(tournament);
        setIsRankModalOpen(true);
    };

    const handleOpenSubmit = () => {
        setEditingTournament(null);
        setIsRankModalOpen(true);
    };

    const handleGenerate = () => {
        if (selectedPlayers.length < 2) {
            warningNotification("Please select at least 2 players.");
            return;
        }
        dispatch(generateGroupsAction());
    };

    const handleAddPlayer = (e) => {
        e.preventDefault();
        if (newPlayerName.trim()) {
            dispatch(addNewPlayer(newPlayerName.trim()));
            setNewPlayerName('');
        }
    };

    return (
        <div className="player-selection">
            <div className="config-section">
                <div className="date-picker">
                    <label><Calendar size={18} /> Tournament Date</label>
                    <input
                        type="date"
                        value={tournamentDate}
                        onChange={(e) => dispatch(setTournamentDate(e.target.value))}
                    />
                </div>
                <div className="action-buttons">
                    <button className="secondary-btn" onClick={() => setShowGlobalRanking(true)}>
                        <Trophy size={18} /> Group Standings
                    </button>
                    <button className="secondary-btn" onClick={handleOpenSubmit} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <Trophy size={18} /> Submit Results
                    </button>
                </div>
            </div>

            <h2>Select Players</h2>
            <div className="stats">
                Selected: {selectedPlayers.length}
            </div>

            <div className="add-player-form">
                <form onSubmit={handleAddPlayer}>
                    <input
                        type="text"
                        placeholder="Temporarily Add New Player..."
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                    />
                    <button type="submit" disabled={!newPlayerName.trim()}>
                        <UserPlus size={18} />
                    </button>
                </form>
            </div>

            <div className="players-grid">
                {allPlayers.map(player => (
                    <div
                        key={player}
                        className={`player-card ${selectedPlayers.includes(player) ? 'selected' : ''}`}
                        onClick={() => dispatch(togglePlayerSelection(player))}
                    >
                        {player}
                    </div>
                ))}
            </div>

            <button className="generate-btn" onClick={handleGenerate}>
                Generate Groups
            </button>

            <AnalyticsDashboard onEdit={handleEditTournament} />

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
        </div>
    );
};

export default PlayerSelection;
