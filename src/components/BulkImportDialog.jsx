import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Autocomplete,
    Box,
    IconButton,
    Typography,
    CircularProgress,
    Divider,
    Alert,
} from '@mui/material';
import { X, Upload, Plus, Trash2, Calendar } from 'lucide-react';
import { getAdminAuthCookie } from '../utils/cookieUtils';
import {
    fetchClubVenues,
    bulkImportClubTournaments,
} from '../api/client';
import { useToast } from '../context/ToastContext';
import MDEditor from '@uiw/react-md-editor';

const getNewRow = () => {
    const now = new Date();
    now.setHours(15, 0, 0, 0);
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

    return {
        venue: null,
        category: '',
        tournament_datetime: localISO,
        announcement: '',
        total_players: 0,
        online_link: '',
        champion: '',
        runner_up: '',
        semi_finalist_1: '',
        semi_finalist_2: '',
        quarter_finalist_1: '',
        quarter_finalist_2: '',
        quarter_finalist_3: '',
        quarter_finalist_4: '',
    };
};

const BulkImportDialog = ({ open, onClose }) => {
    const { successNotification, errorNotification } = useToast();

    const [venues, setVenues] = useState([]);
    const [venueLoading, setVenueLoading] = useState(false);
    const [rows, setRows] = useState([getNewRow()]);
    const [loading, setLoading] = useState(false);
    const [importResult, setImportResult] = useState(null);

    useEffect(() => {
        if (open) {
            loadVenues();
            setRows([getNewRow()]);
            setImportResult(null);
        }
    }, [open]);

    const loadVenues = async () => {
        setVenueLoading(true);
        try {
            const data = await fetchClubVenues();
            setVenues(data);
        } catch (err) {
            errorNotification('Failed to load venues');
        } finally {
            setVenueLoading(false);
        }
    };

    const updateRow = (index, field, value) => {
        setRows(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addRow = () => {
        setRows(prev => [...prev, getNewRow()]);
    };

    const removeRow = (index) => {
        if (rows.length <= 1) return;
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const duplicateRow = (index) => {
        setRows(prev => {
            const newRow = { ...prev[index] };
            return [...prev.slice(0, index + 1), newRow, ...prev.slice(index + 1)];
        });
    };

    const handleSubmit = async () => {
        // Validate
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r.venue) {
                errorNotification(`Row ${i + 1}: Please select a venue`);
                return;
            }
            if (!r.category.trim()) {
                errorNotification(`Row ${i + 1}: Category is required`);
                return;
            }
            if (!r.tournament_datetime) {
                errorNotification(`Row ${i + 1}: Date & Time is required`);
                return;
            }
        }

        setLoading(true);
        try {
            const password = getAdminAuthCookie();
            const payload = {
                tournaments: rows.map(r => ({
                    venue_id: r.venue.id,
                    category: r.category.trim(),
                    tournament_datetime: r.tournament_datetime,
                    announcement: r.announcement.trim() || null,
                    total_players: r.total_players || 0,
                    online_link: r.online_link.trim() || null,
                    champion: r.champion.trim() || null,
                    runner_up: r.runner_up.trim() || null,
                    semi_finalist_1: r.semi_finalist_1.trim() || null,
                    semi_finalist_2: r.semi_finalist_2.trim() || null,
                    quarter_finalist_1: r.quarter_finalist_1.trim() || null,
                    quarter_finalist_2: r.quarter_finalist_2.trim() || null,
                    quarter_finalist_3: r.quarter_finalist_3.trim() || null,
                    quarter_finalist_4: r.quarter_finalist_4.trim() || null,
                })),
            };

            const result = await bulkImportClubTournaments(payload, password);
            setImportResult(result);

            if (result.errors.length === 0) {
                successNotification(`Successfully imported ${result.created} tournaments! 🎉`);
                onClose(true);
            } else {
                errorNotification(`Imported ${result.created}/${result.total}, but ${result.errors.length} had errors`);
            }
        } catch (err) {
            errorNotification(err.response?.data?.detail || 'Bulk import failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => onClose(false)}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { borderRadius: '16px', overflow: 'hidden', maxHeight: '90vh' },
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
                    <Upload size={22} />
                    Bulk Import Tournaments
                </Box>
                <IconButton onClick={() => onClose(false)} sx={{ color: 'white' }}>
                    <X />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 1 }}>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
                    Fill in the fields below to import multiple tournaments at once. Result fields are optional.
                </Typography>

                {importResult?.errors?.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {importResult.errors.map((e, i) => (
                            <div key={i}>{e}</div>
                        ))}
                    </Alert>
                )}

                <div style={{ overflowX: 'auto' }}>
                    {rows.map((row, index) => (
                        <Box
                            key={index}
                            sx={{
                                p: 2,
                                mb: 1.5,
                                border: '1px solid var(--border-main)',
                                borderRadius: '12px',
                                background: 'var(--bg-surface-soft)',
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)' }}>
                                    Tournament #{index + 1}
                                </Typography>
                                <Box>
                                    <Button
                                        size="small"
                                        onClick={() => duplicateRow(index)}
                                        sx={{ fontSize: '0.7rem', mr: 0.5 }}
                                    >
                                        Duplicate
                                    </Button>
                                    {rows.length > 1 && (
                                        <IconButton
                                            size="small"
                                            onClick={() => removeRow(index)}
                                            sx={{ color: 'var(--accent-danger)' }}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>

                            {/* Core fields */}
                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
                                <Autocomplete
                                    options={venues}
                                    getOptionLabel={(opt) => opt.name || ''}
                                    value={row.venue}
                                    onChange={(e, v) => updateRow(index, 'venue', v)}
                                    loading={venueLoading}
                                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Venue *" size="small" />
                                    )}
                                    sx={{ flex: '1 1 200px' }}
                                    size="small"
                                />
                                <TextField
                                    label="Category *"
                                    value={row.category}
                                    onChange={(e) => updateRow(index, 'category', e.target.value)}
                                    size="small"
                                    sx={{ flex: '1 1 200px' }}
                                    placeholder="e.g. Men's Singles"
                                />
                                <TextField
                                    label="Date & Time *"
                                    type="datetime-local"
                                    value={row.tournament_datetime}
                                    onChange={(e) => updateRow(index, 'tournament_datetime', e.target.value)}
                                    size="small"
                                    sx={{ flex: '1 1 200px' }}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    label="Players"
                                    type="number"
                                    value={row.total_players}
                                    onChange={(e) => updateRow(index, 'total_players', parseInt(e.target.value))}
                                    size="small"
                                    sx={{ flex: '0 1 100px' }}
                                    inputProps={{ min: 0 }}
                                />
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
                                <TextField
                                    label="Online Link"
                                    value={row.online_link}
                                    onChange={(e) => updateRow(index, 'online_link', e.target.value)}
                                    size="small"
                                    sx={{ flex: '1 1 300px' }}
                                    placeholder="https://..."
                                />
                                <Box sx={{ flex: '1 1 300px' }}>
                                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 0.5 }}>
                                        Announcement (Markdown supported)
                                    </Typography>
                                    <div data-color-mode="light">
                                        <MDEditor
                                            value={row.announcement}
                                            onChange={(val) => updateRow(index, 'announcement', val || '')}
                                            preview="edit"
                                            height={150}
                                            textareaProps={{
                                                placeholder: 'Optional announcement or notes...'
                                            }}
                                        />
                                    </div>
                                </Box>
                            </Box>

                            {/* Result fields (optional) */}
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                Results (optional — fill for past tournaments)
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField label="🥇 Champion" value={row.champion} onChange={(e) => updateRow(index, 'champion', e.target.value)} size="small" sx={{ flex: '1 1 150px' }} />
                                <TextField label="🥈 Runner Up" value={row.runner_up} onChange={(e) => updateRow(index, 'runner_up', e.target.value)} size="small" sx={{ flex: '1 1 150px' }} />
                                <TextField label="🥉 SF 1" value={row.semi_finalist_1} onChange={(e) => updateRow(index, 'semi_finalist_1', e.target.value)} size="small" sx={{ flex: '1 1 120px' }} />
                                <TextField label="🥉 SF 2" value={row.semi_finalist_2} onChange={(e) => updateRow(index, 'semi_finalist_2', e.target.value)} size="small" sx={{ flex: '1 1 120px' }} />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                <TextField label="🏅 QF 1" value={row.quarter_finalist_1} onChange={(e) => updateRow(index, 'quarter_finalist_1', e.target.value)} size="small" sx={{ flex: '1 1 120px' }} />
                                <TextField label="🏅 QF 2" value={row.quarter_finalist_2} onChange={(e) => updateRow(index, 'quarter_finalist_2', e.target.value)} size="small" sx={{ flex: '1 1 120px' }} />
                                <TextField label="🏅 QF 3" value={row.quarter_finalist_3} onChange={(e) => updateRow(index, 'quarter_finalist_3', e.target.value)} size="small" sx={{ flex: '1 1 120px' }} />
                                <TextField label="🏅 QF 4" value={row.quarter_finalist_4} onChange={(e) => updateRow(index, 'quarter_finalist_4', e.target.value)} size="small" sx={{ flex: '1 1 120px' }} />
                            </Box>
                        </Box>
                    ))}
                </div>

                <Button
                    variant="outlined"
                    startIcon={<Plus size={18} />}
                    fullWidth
                    onClick={addRow}
                    sx={{
                        mt: 1,
                        borderStyle: 'dashed',
                        borderColor: 'var(--border-main)',
                        color: 'var(--text-secondary)',
                    }}
                >
                    Add Another Tournament
                </Button>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Typography variant="body2" sx={{ mr: 'auto', color: 'var(--text-muted)' }}>
                    {rows.length} tournament{rows.length > 1 ? 's' : ''} to import
                </Typography>
                <Button onClick={() => onClose(false)} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} /> : <Upload size={18} />}
                    sx={{ background: 'var(--gradient-primary)', color: 'white' }}
                >
                    {loading ? 'Importing...' : `Import ${rows.length} Tournament${rows.length > 1 ? 's' : ''}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BulkImportDialog;
