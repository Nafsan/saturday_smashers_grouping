import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
    Chip,
    IconButton,
    Autocomplete,
    TextField,
    useMediaQuery,
} from '@mui/material';
import { Plus, MapPin, Trophy, Calendar, Users, Share2, Edit2, Trash2, Swords, Clock, ExternalLink, Upload, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isAdminAuthenticated, getAdminAuthCookie } from '../utils/cookieUtils';
import { fetchClubTournaments, fetchClubVenues, deleteClubTournament } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    FILTER_ALL,
    FILTER_OPTIONS,
    STATUS_LABELS,
    RANK_EMOJIS,
    EMPTY_STATE_MESSAGE,
    EMPTY_STATE_FILTERED_MESSAGE,
    TOURNAMENT_DELETED_MESSAGE,
} from '../utils/clubTournamentConstants';
import NavigationBar from './NavigationBar';
import AddClubTournamentDialog from './AddClubTournamentDialog';
import SubmitClubResultsDialog from './SubmitClubResultsDialog';
import ManageVenuesDialog from './ManageVenuesDialog';
import ClubTournamentResultsDialog from './ClubTournamentResultsDialog';
import BulkImportDialog from './BulkImportDialog';
import './ClubTournaments.scss';

const ClubTournaments = () => {
    const navigate = useNavigate();
    const { successNotification, errorNotification } = useToast();
    const isAdmin = isAdminAuthenticated();
    const isMobile = useMediaQuery('(max-width:600px)');

    const [tournaments, setTournaments] = useState([]);
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(FILTER_ALL);
    const [venueFilter, setVenueFilter] = useState(null);

    // Dialog states
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editTournament, setEditTournament] = useState(null);
    const [submitResultsTournament, setSubmitResultsTournament] = useState(null);
    const [viewResultsTournament, setViewResultsTournament] = useState(null);
    const [manageVenuesOpen, setManageVenuesOpen] = useState(false);
    const [bulkImportOpen, setBulkImportOpen] = useState(false);

    const loadTournaments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchClubTournaments(filter, venueFilter?.id || null);
            setTournaments(data);
        } catch (err) {
            errorNotification('Failed to load tournaments');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filter, venueFilter]);

    const loadVenues = useCallback(async () => {
        try {
            const data = await fetchClubVenues();
            setVenues(data);
        } catch (err) {
            console.error('Failed to load venues', err);
        }
    }, []);

    useEffect(() => {
        loadTournaments();
    }, [loadTournaments]);

    useEffect(() => {
        loadVenues();
    }, [loadVenues]);

    // Listen for auth changes
    useEffect(() => {
        const handler = () => loadTournaments();
        window.addEventListener('authStatusChanged', handler);
        return () => window.removeEventListener('authStatusChanged', handler);
    }, [loadTournaments]);

    const handleFilterChange = (event, newFilter) => {
        if (newFilter !== null) {
            setFilter(newFilter);
        }
    };

    const handleDelete = async (tournament) => {
        if (!window.confirm(`Delete tournament "${tournament.category}" at ${tournament.venue.name}?`)) return;
        try {
            const password = getAdminAuthCookie();
            await deleteClubTournament(tournament.id, password);
            successNotification(TOURNAMENT_DELETED_MESSAGE);
            loadTournaments();
        } catch (err) {
            errorNotification('Failed to delete tournament');
        }
    };

    const handleDialogClose = (refresh = false) => {
        setAddDialogOpen(false);
        setEditTournament(null);
        setSubmitResultsTournament(null);
        setViewResultsTournament(null);
        setManageVenuesOpen(false);
        setBulkImportOpen(false);
        if (refresh) {
            loadTournaments();
            loadVenues();
        }
    };

    const formatDate = (datetime) => {
        const date = new Date(datetime);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (datetime) => {
        const date = new Date(datetime);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="club-tournaments-page">
            <div className="club-tournaments-container">
                {/* Back Button */}
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Button
                        startIcon={<ArrowLeft size={20} />}
                        onClick={() => navigate('/')}
                        sx={{
                            color: 'var(--text-secondary)',
                            '&:hover': { color: 'var(--accent-primary)', backgroundColor: 'transparent' },
                            paddingLeft: 0
                        }}
                    >
                        Back to Home
                    </Button>
                </Box>

                {/* Page Header */}
                <div className="page-header">
                    <div className="header-title">
                        <Swords size={28} />
                        <Typography variant="h4" component="h1" className="title-text">
                            Club Tournaments
                        </Typography>
                    </div>
                    {isAdmin && (
                        <div className="header-actions">
                            <Button
                                variant="outlined"
                                startIcon={<Upload size={18} />}
                                onClick={() => setBulkImportOpen(true)}
                                className="manage-venues-btn"
                            >
                                Bulk Import
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<MapPin size={18} />}
                                onClick={() => setManageVenuesOpen(true)}
                                className="manage-venues-btn"
                            >
                                Manage Venues
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<Plus size={18} />}
                                onClick={() => setAddDialogOpen(true)}
                                className="add-tournament-btn"
                            >
                                Add Tournament
                            </Button>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="filter-bar">
                    <ToggleButtonGroup
                        value={filter}
                        exclusive
                        onChange={handleFilterChange}
                        size="small"
                        className="filter-toggle"
                    >
                        {FILTER_OPTIONS.map((opt) => (
                            <ToggleButton key={opt.value} value={opt.value}>
                                {opt.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                    <Autocomplete
                        options={venues}
                        getOptionLabel={(option) => option.name || ''}
                        value={venueFilter}
                        onChange={(e, newValue) => setVenueFilter(newValue)}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Filter by Venue"
                                variant="outlined"
                                size="small"
                                sx={{ minWidth: 200 }}
                            />
                        )}
                        size="small"
                        sx={{ minWidth: 200 }}
                    />
                </div>

                {/* Tournament List */}
                {loading ? (
                    <div className="loading-state">
                        <CircularProgress />
                        <Typography variant="body1" sx={{ mt: 2 }}>Loading tournaments...</Typography>
                    </div>
                ) : tournaments.length === 0 ? (
                    <div className="empty-state">
                        <Swords size={48} strokeWidth={1.2} />
                        <Typography variant="h6" sx={{ mt: 2 }}>
                            {filter === FILTER_ALL ? EMPTY_STATE_MESSAGE : EMPTY_STATE_FILTERED_MESSAGE}
                        </Typography>
                        {isAdmin && (
                            <Button
                                variant="contained"
                                startIcon={<Plus size={18} />}
                                onClick={() => setAddDialogOpen(true)}
                                sx={{ mt: 2 }}
                            >
                                Add First Tournament
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="tournament-grid">
                        {tournaments.map((t) => (
                            <div key={t.id} className={`tournament-card ${t.status}`}>
                                <div className="card-header">
                                    <div className="venue-info">
                                        {t.venue.logo_base64 ? (
                                            <img
                                                src={t.venue.logo_base64}
                                                alt={t.venue.name}
                                                className="venue-logo"
                                            />
                                        ) : (
                                            <div className="venue-logo-placeholder">
                                                <MapPin size={20} />
                                            </div>
                                        )}
                                        <span className="venue-name">{t.venue.name}</span>
                                    </div>
                                    <Chip
                                        label={STATUS_LABELS[t.status]}
                                        size="small"
                                        className={`status-chip ${t.status}`}
                                    />
                                </div>

                                <div className="card-body">
                                    <Typography variant="h6" className="tournament-category">
                                        {t.category}
                                    </Typography>

                                    <div className="tournament-meta">
                                        <div className="meta-item">
                                            <Calendar size={14} />
                                            <span>{formatDate(t.tournament_datetime)}</span>
                                        </div>
                                        <div className="meta-item">
                                            <Clock size={14} />
                                            <span>{formatTime(t.tournament_datetime)}</span>
                                        </div>
                                        {t.total_players > 0 && (
                                            <div className="meta-item">
                                                <Users size={14} />
                                                <span>{t.total_players} Players</span>
                                            </div>
                                        )}
                                    </div>

                                    {t.announcement && (
                                        <Typography variant="body2" className="tournament-announcement">
                                            {t.announcement}
                                        </Typography>
                                    )}

                                    {t.online_link && (
                                        <a
                                            href={t.online_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tournament-link"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ExternalLink size={14} />
                                            <span>View on Platform</span>
                                        </a>
                                    )}

                                    {t.result && (
                                        <div className="results-preview">
                                            <div className="result-item champion">
                                                <span className="rank-emoji">{RANK_EMOJIS.champion}</span>
                                                <span className="rank-name">{t.result.champion}</span>
                                            </div>
                                            <div className="result-item runner-up">
                                                <span className="rank-emoji">{RANK_EMOJIS.runner_up}</span>
                                                <span className="rank-name">{t.result.runner_up}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="card-actions">
                                    {t.result && (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<Share2 size={16} />}
                                            onClick={() => setViewResultsTournament(t)}
                                            className="view-results-btn"
                                        >
                                            Share Result
                                        </Button>
                                    )}
                                    {isAdmin && (
                                        <>
                                            {!t.result && t.status === 'past' && (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<Trophy size={16} />}
                                                    onClick={() => setSubmitResultsTournament(t)}
                                                    className="submit-results-btn"
                                                >
                                                    Submit Results
                                                </Button>
                                            )}
                                            {t.result && (
                                                <Button
                                                    variant="text"
                                                    size="small"
                                                    startIcon={<Edit2 size={14} />}
                                                    onClick={() => setSubmitResultsTournament(t)}
                                                    className="edit-results-btn"
                                                >
                                                    Edit Results
                                                </Button>
                                            )}
                                            <IconButton
                                                size="small"
                                                onClick={() => setEditTournament(t)}
                                                className="edit-btn"
                                                title="Edit tournament"
                                            >
                                                <Edit2 size={16} />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(t)}
                                                className="delete-btn"
                                                title="Delete tournament"
                                            >
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <AddClubTournamentDialog
                open={addDialogOpen || !!editTournament}
                onClose={handleDialogClose}
                tournament={editTournament}
            />

            <SubmitClubResultsDialog
                open={!!submitResultsTournament}
                onClose={handleDialogClose}
                tournament={submitResultsTournament}
            />

            <ManageVenuesDialog
                open={manageVenuesOpen}
                onClose={handleDialogClose}
            />

            <ClubTournamentResultsDialog
                open={!!viewResultsTournament}
                onClose={handleDialogClose}
                tournament={viewResultsTournament}
            />

            <BulkImportDialog
                open={bulkImportOpen}
                onClose={handleDialogClose}
            />
        </div>
    );
};

export default ClubTournaments;
