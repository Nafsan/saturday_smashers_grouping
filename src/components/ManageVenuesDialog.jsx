import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
    TextField,
    Box,
    IconButton,
    Typography,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    ListItemSecondaryAction,
    Divider,
} from '@mui/material';
import { X, MapPin, Plus, Edit2, Trash2, Upload, Image } from 'lucide-react';
import { getAdminAuthCookie } from '../utils/cookieUtils';
import {
    fetchClubVenues,
    createClubVenue,
    updateClubVenue,
    deleteClubVenue,
} from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    VENUE_CREATED_MESSAGE,
    VENUE_UPDATED_MESSAGE,
    VENUE_DELETED_MESSAGE,
} from '../utils/clubTournamentConstants';

const ManageVenuesDialog = ({ open, onClose }) => {
    const { successNotification, errorNotification } = useToast();

    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [editingVenue, setEditingVenue] = useState(null); // null = adding new
    const [showForm, setShowForm] = useState(false);
    const [venueName, setVenueName] = useState('');
    const [venueLogo, setVenueLogo] = useState(null);

    useEffect(() => {
        if (open) {
            loadVenues();
            resetForm();
        }
    }, [open]);

    const loadVenues = async () => {
        setLoading(true);
        try {
            const data = await fetchClubVenues();
            setVenues(data);
        } catch (err) {
            errorNotification('Failed to load venues');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingVenue(null);
        setShowForm(false);
        setVenueName('');
        setVenueLogo(null);
    };

    const handleAddNew = () => {
        setEditingVenue(null);
        setVenueName('');
        setVenueLogo(null);
        setShowForm(true);
    };

    const handleEdit = (venue) => {
        setEditingVenue(venue);
        setVenueName(venue.name);
        setVenueLogo(venue.logo_base64);
        setShowForm(true);
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setVenueLogo(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!venueName.trim()) {
            errorNotification('Venue name is required');
            return;
        }

        setSaving(true);
        try {
            const password = getAdminAuthCookie();
            const payload = {
                name: venueName.trim(),
                logo_base64: venueLogo || null,
            };

            if (editingVenue) {
                await updateClubVenue(editingVenue.id, payload, password);
                successNotification(VENUE_UPDATED_MESSAGE);
            } else {
                await createClubVenue(payload, password);
                successNotification(VENUE_CREATED_MESSAGE);
            }
            resetForm();
            loadVenues();
        } catch (err) {
            errorNotification(err.response?.data?.detail || 'Failed to save venue');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (venue) => {
        if (!window.confirm(`Delete venue "${venue.name}"?`)) return;
        try {
            const password = getAdminAuthCookie();
            await deleteClubVenue(venue.id, password);
            successNotification(VENUE_DELETED_MESSAGE);
            loadVenues();
        } catch (err) {
            errorNotification(err.response?.data?.detail || 'Failed to delete venue');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => onClose(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: '16px', overflow: 'hidden' },
            }}
        >
            <DialogTitle
                sx={{
                    background: 'var(--gradient-primary)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MapPin size={22} />
                    Manage Venues
                </Box>
                <IconButton onClick={() => onClose(false)} sx={{ color: 'white' }}>
                    <X />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 3 }}>
                {/* Venue List */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : venues.length === 0 && !showForm ? (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'var(--text-muted)' }}>
                        <MapPin size={40} strokeWidth={1.2} />
                        <Typography variant="body1" sx={{ mt: 1 }}>No venues yet</Typography>
                    </Box>
                ) : (
                    <List sx={{ mb: 2 }}>
                        {venues.map((venue) => (
                            <React.Fragment key={venue.id}>
                                <ListItem>
                                    <ListItemAvatar>
                                        <Avatar
                                            src={venue.logo_base64 || undefined}
                                            sx={{
                                                bgcolor: 'var(--bg-surface)',
                                                color: 'var(--text-muted)',
                                                width: 40,
                                                height: 40,
                                            }}
                                        >
                                            {!venue.logo_base64 && <MapPin size={20} />}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={venue.name}
                                        sx={{
                                            '& .MuiListItemText-primary': {
                                                color: 'var(--text-primary)',
                                                fontWeight: 600,
                                            },
                                        }}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEdit(venue)}
                                            sx={{ color: 'var(--text-muted)' }}
                                        >
                                            <Edit2 size={16} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDelete(venue)}
                                            sx={{ color: 'var(--text-muted)', '&:hover': { color: 'var(--accent-danger)' } }}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider variant="inset" component="li" />
                            </React.Fragment>
                        ))}
                    </List>
                )}

                {/* Add/Edit Form */}
                {showForm && (
                    <Box
                        sx={{
                            p: 2,
                            border: '1px solid var(--border-main)',
                            borderRadius: '12px',
                            background: 'var(--bg-surface-soft)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            mb: 2,
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)' }}>
                            {editingVenue ? 'Edit Venue' : 'Add New Venue'}
                        </Typography>

                        <TextField
                            label="Venue Name"
                            value={venueName}
                            onChange={(e) => setVenueName(e.target.value)}
                            required
                            fullWidth
                            size="small"
                        />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <input
                                type="file"
                                accept="image/*"
                                id="venue-logo-upload"
                                hidden
                                onChange={handleLogoUpload}
                            />
                            <label htmlFor="venue-logo-upload">
                                <Button
                                    component="span"
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Upload size={16} />}
                                    sx={{ borderStyle: 'dashed' }}
                                >
                                    {venueLogo ? 'Change Logo' : 'Upload Logo'}
                                </Button>
                            </label>
                            {venueLogo && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <img
                                        src={venueLogo}
                                        alt="Logo preview"
                                        style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => setVenueLogo(null)}
                                        sx={{ color: 'var(--accent-danger)' }}
                                    >
                                        <Trash2 size={14} />
                                    </IconButton>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button size="small" onClick={resetForm} disabled={saving}>
                                Cancel
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={handleSave}
                                disabled={saving}
                                sx={{ background: 'var(--gradient-primary)', color: 'white' }}
                            >
                                {saving ? <CircularProgress size={20} /> : editingVenue ? 'Update' : 'Add'}
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Add New Button */}
                {!showForm && (
                    <Button
                        variant="outlined"
                        startIcon={<Plus size={18} />}
                        fullWidth
                        onClick={handleAddNew}
                        sx={{
                            borderStyle: 'dashed',
                            borderColor: 'var(--border-main)',
                            color: 'var(--text-secondary)',
                            '&:hover': { borderColor: 'var(--accent-primary)' },
                        }}
                    >
                        Add New Venue
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ManageVenuesDialog;
