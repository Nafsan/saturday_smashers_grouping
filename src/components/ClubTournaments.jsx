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
    Pagination,
    Stack,
    InputAdornment,
} from '@mui/material';
import { Plus, MapPin, Trophy, Calendar, Users, Share2, Edit2, Trash2, Swords, Clock, ExternalLink, Upload, ArrowLeft, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
    
    // Pagination and Date range
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setPage(1); // Reset to first page on search
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);
    
    // Default dates: last 6 months (including current) + next 1 month = 8 months
    // e.g., if today is March: Sep, Oct, Nov, Dec, Jan, Feb, March (7) + April (1) = 8
    const getDefaultStartDate = () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6); // 6 months older
        d.setDate(1); // Start of month
        return d.toISOString().split('T')[0];
    };
    const getDefaultEndDate = () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1); // April if today is march
        // Last day of next month
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        return d.toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getDefaultStartDate());
    const [endDate, setEndDate] = useState(getDefaultEndDate());

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
            const data = await fetchClubTournaments({
                statusFilter: filter,
                venueId: venueFilter?.id || null,
                searchQuery: debouncedSearchQuery,
                startDate,
                endDate,
                page,
                pageSize
            });
            setTournaments(data.items || []);
            setTotalCount(data.total_count || 0);
            setTotalPages(data.total_pages || 0);
        } catch (err) {
            errorNotification('Failed to load tournaments');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filter, venueFilter, debouncedSearchQuery, startDate, endDate, page, pageSize]);

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
            setPage(1); // Reset to first page on filter change
        }
    };

    const handlePageChange = (event, value) => {
        setPage(value);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        // Ensure naive datetime strings from backend are treated as BDT (+06:00)
        const dateStr = datetime.includes('+') || datetime.endsWith('Z') ? datetime : `${datetime}+06:00`;
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Dhaka',
        });
    };

    const formatTime = (datetime) => {
        const dateStr = datetime.includes('+') || datetime.endsWith('Z') ? datetime : `${datetime}+06:00`;
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Dhaka',
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
                    <div className="filter-group">
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
                    </div>
                    
                    <div className="filter-group">
                        <TextField
                            placeholder="Search tournament..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="small"
                            variant="outlined"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={18} color="var(--text-muted)" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: 200 }}
                        />
                    </div>

                    <div className="filter-group date-filters">
                        <TextField
                            label="From"
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />
                        <TextField
                            label="To"
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />
                    </div>

                    <div className="filter-group">
                        <Autocomplete
                            options={venues}
                            getOptionLabel={(option) => option.name || ''}
                            value={venueFilter}
                            onChange={(e, newValue) => { setVenueFilter(newValue); setPage(1); }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Filter by Venue"
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                            size="small"
                            sx={{ minWidth: 200 }}
                        />
                    </div>
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
                                        <div className="tournament-announcement">
                                            <ReactMarkdown>{t.announcement}</ReactMarkdown>
                                        </div>
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

                {/* Pagination */}
                {!loading && (
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', pb: 4 }}>
                        <Stack spacing={2}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                                size={isMobile ? "small" : "large"}
                                showFirstButton
                                showLastButton
                            />
                            <Typography variant="caption" align="center" color="text.secondary">
                                Showing {tournaments.length} of {totalCount} tournaments
                            </Typography>
                        </Stack>
                    </Box>
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
