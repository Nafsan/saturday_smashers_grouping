import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Trophy, Users, Calendar, CalendarClock, Edit2 } from 'lucide-react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { fetchFundSettings, updateNextTournamentDate } from '../api/client';
import { isAdminAuthenticated, getAdminAuthCookie } from '../utils/cookieUtils';
import PasswordDialog from './PasswordDialog';
import { useToast } from '../context/ToastContext';

import './StatsOverview.scss';

const StatsOverview = () => {
    const tournaments = useSelector((state) => state.app.history);
    const allPlayers = useSelector((state) => state.app.allPlayers);

    const [nextTournamentDate, setNextTournamentDate] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(isAdminAuthenticated());
    const { successNotification, errorNotification } = useToast();

    useEffect(() => {
        loadNextTournamentDate();

        // Listen for authentication status changes
        const handleAuthChange = () => {
            setIsLoggedIn(isAdminAuthenticated());
        };

        window.addEventListener('authStatusChanged', handleAuthChange);
        return () => window.removeEventListener('authStatusChanged', handleAuthChange);
    }, []);

    const loadNextTournamentDate = async () => {
        try {
            const settings = await fetchFundSettings();
            setNextTournamentDate(settings.next_tournament_date);
        } catch (error) {
            console.error('Failed to load next tournament date:', error);
        }
    };

    const getNextSaturday = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
        const nextSaturday = new Date(today);
        nextSaturday.setDate(today.getDate() + daysUntilSaturday);
        return nextSaturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getThisMonthTournaments = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return tournaments.filter(t => {
            const tournamentDate = new Date(t.date);
            return tournamentDate.getMonth() === currentMonth &&
                tournamentDate.getFullYear() === currentYear;
        }).length;
    };

    const handleEditClick = () => {
        const dateStr = nextTournamentDate || new Date().toISOString().split('T')[0];
        setNewDate(dateStr);
        setIsEditDialogOpen(true);
    };

    const performUpdate = async (password) => {
        setLoading(true);
        try {
            await updateNextTournamentDate(newDate, password);
            setNextTournamentDate(newDate);
            setIsPasswordDialogOpen(false);
            successNotification('Next tournament date updated successfully!');
        } catch (error) {
            console.error('Failed to update next tournament date:', error);
            alert('Failed to update date. Please check your password and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClick = () => {
        setIsEditDialogOpen(false);
        if (isAdminAuthenticated()) {
            performUpdate(getAdminAuthCookie());
        } else {
            setIsPasswordDialogOpen(true);
        }
    };

    const handlePasswordSubmit = (password) => {
        performUpdate(password);
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return getNextSaturday();
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Handle both formats: array of strings or array of objects with name property
    const getPlayersCount = () => {
        if (!allPlayers || allPlayers.length === 0) return 0;
        return allPlayers.length;
    };

    const stats = [
        {
            icon: <Trophy size={32} />,
            label: 'Total Tournaments',
            value: tournaments.length,
            color: '#3b82f6'
        },
        {
            icon: <Users size={32} />,
            label: 'Active Players',
            value: getPlayersCount(),
            color: '#10b981'
        },
        {
            icon: <Calendar size={32} />,
            label: 'This Month',
            value: getThisMonthTournaments(),
            color: '#f59e0b'
        },
        {
            icon: <CalendarClock size={32} />,
            label: 'Next Tournament',
            value: formatDisplayDate(nextTournamentDate),
            color: '#ec4899',
            editable: isLoggedIn,
            onEdit: handleEditClick
        }
    ];

    return (
        <>
            <div className="stats-overview">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className={`stat-card ${stat.editable ? 'editable' : ''}`}
                        style={{ '--stat-color': stat.color }}
                        onClick={stat.editable ? stat.onEdit : undefined}
                    >
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-content">
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                        {stat.editable && (
                            <div className="edit-indicator">
                                <Edit2 size={16} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Edit Date Dialog */}
            <Dialog
                open={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Set Next Tournament Date</DialogTitle>
                <DialogContent>
                    <TextField
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        fullWidth
                        margin="normal"
                        label="Tournament Date"
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveClick} variant="contained" color="primary">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Password Dialog */}
            <PasswordDialog
                open={isPasswordDialogOpen}
                onClose={() => setIsPasswordDialogOpen(false)}
                onSubmit={handlePasswordSubmit}
                title="Admin Authentication Required"
                message="Please enter the admin password to update the next tournament date."
                loading={loading}
            />
        </>
    );
};

export default StatsOverview;
