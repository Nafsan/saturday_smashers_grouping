import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    FormControl, InputLabel, Select, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Grid, Typography, Box, Pagination, Chip
} from '@mui/material';
import { X, Calendar } from 'lucide-react';
import { fetchPlayerTournamentCosts, fetchPlayerMiscCosts } from '../api/client';
import LoadingSpinner from './LoadingSpinner';

const TrackExpensesModal = ({ open, onClose, players }) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState('');
    const [tournamentCosts, setTournamentCosts] = useState({ items: [], total: 0, page: 1, total_pages: 0 });
    const [miscCosts, setMiscCosts] = useState({ items: [], total: 0, page: 1, total_pages: 0 });
    const [loading, setLoading] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!open) {
            setSelectedPlayerId('');
            setTournamentCosts({ items: [], total: 0, page: 1, total_pages: 0 });
            setMiscCosts({ items: [], total: 0, page: 1, total_pages: 0 });
            setLoading(false);
        }
    }, [open]);

    // Initial load when player is selected
    useEffect(() => {
        if (selectedPlayerId) {
            loadAllCosts(1, 1);
        }
    }, [selectedPlayerId]);

    const loadAllCosts = async (tourneyPage, miscPage) => {
        setLoading(true);
        try {
            const [tourneyData, miscData] = await Promise.all([
                fetchPlayerTournamentCosts(selectedPlayerId, tourneyPage),
                fetchPlayerMiscCosts(selectedPlayerId, miscPage)
            ]);
            setTournamentCosts(tourneyData);
            setMiscCosts(miscData);
        } catch (error) {
            console.error("Error loading costs:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadTournamentCostsOnly = async (page) => {
        try {
            const data = await fetchPlayerTournamentCosts(selectedPlayerId, page);
            setTournamentCosts(data);
        } catch (error) {
            console.error("Error loading tournament costs:", error);
        }
    };

    const loadMiscCostsOnly = async (page) => {
        try {
            const data = await fetchPlayerMiscCosts(selectedPlayerId, page);
            setMiscCosts(data);
        } catch (error) {
            console.error("Error loading misc costs:", error);
        }
    };

    const formatCurrency = (amount) => `৳${amount.toFixed(2)}`;
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Track Player Expenses
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                >
                    <X />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <div style={{ marginBottom: '2rem' }}>
                    <FormControl fullWidth>
                        <InputLabel>Select Player</InputLabel>
                        <Select
                            value={selectedPlayerId}
                            label="Select Player"
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                        >
                            {players.map(p => (
                                <MenuItem key={p.player_id} value={p.player_id}>
                                    {p.player_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </div>

                {selectedPlayerId && (
                    <>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                                <LoadingSpinner />
                            </Box>
                        ) : (
                            <Grid container spacing={3} direction="column">
                                {/* Tournament Costs Section */}
                                <Grid item xs={12}>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom>Tournament Costs ({tournamentCosts.total_pages > 0 ? tournamentCosts.items.length : 0})</Typography>
                                        {tournamentCosts.items.length === 0 ? (
                                            <Typography color="textSecondary" align="center" py={3}>No tournament costs found.</Typography>
                                        ) : (
                                            <>
                                                <TableContainer sx={{ maxHeight: 400 }}>
                                                    <Table stickyHeader size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Date</TableCell>
                                                                <TableCell>Details</TableCell>
                                                                <TableCell align="right">Total</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {tournamentCosts.items.map((cost, idx) => (
                                                                <TableRow key={idx} hover>
                                                                    <TableCell>
                                                                        <Box display="flex" alignItems="center" gap={1}>
                                                                            <Calendar size={14} color="gray" />
                                                                            {formatDate(cost.tournament_date)}
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Box display="flex" flexDirection="column" gap={0.5}>
                                                                            <Typography variant="caption">Venue: {formatCurrency(cost.venue_cost)}</Typography>
                                                                            <Typography variant="caption">Ball: {formatCurrency(cost.ball_cost)}</Typography>
                                                                            <Typography variant="caption">Misc: {formatCurrency(cost.common_misc_cost)}</Typography>
                                                                            {cost.player_specific_cost > 0 && (
                                                                                <Typography variant="caption" color="warning.main" fontWeight="bold">
                                                                                    Specific: {formatCurrency(cost.player_specific_cost)}
                                                                                    {cost.description && ` (${cost.description})`}
                                                                                </Typography>
                                                                            )}
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                                        {formatCurrency(cost.total_cost)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>

                                                {tournamentCosts.total_pages > 1 && (
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                                        <Pagination
                                                            count={tournamentCosts.total_pages}
                                                            page={tournamentCosts.page}
                                                            onChange={(e, v) => loadTournamentCostsOnly(v)}
                                                            color="primary"
                                                            size="small"
                                                        />
                                                    </Box>
                                                )}
                                            </>
                                        )}
                                    </Paper>
                                </Grid>

                                {/* Miscellaneous Costs Section */}
                                {miscCosts.items.length > 0 && (
                                    <Grid item xs={12}>
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="h6" gutterBottom>Others ({miscCosts.total_pages > 0 ? miscCosts.items.length : 0})</Typography>
                                            <TableContainer sx={{ maxHeight: 400 }}>
                                                <Table stickyHeader size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Date</TableCell>
                                                            <TableCell>Description</TableCell>
                                                            <TableCell align="right">Amount</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {miscCosts.items.map((cost) => (
                                                            <TableRow key={cost.id} hover>
                                                                <TableCell>
                                                                    {cost.cost_date ? (
                                                                        <Box display="flex" alignItems="center" gap={1}>
                                                                            <Calendar size={14} color="gray" />
                                                                            {formatDate(cost.cost_date)}
                                                                        </Box>
                                                                    ) : '-'}
                                                                </TableCell>
                                                                <TableCell>{cost.cost_name || 'N/A'}</TableCell>
                                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                                    {formatCurrency(cost.cost_amount)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>

                                            {miscCosts.total_pages > 1 && (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                                    <Pagination
                                                        count={miscCosts.total_pages}
                                                        page={miscCosts.page}
                                                        onChange={(e, v) => loadMiscCostsOnly(v)}
                                                        color="primary"
                                                        size="small"
                                                    />
                                                </Box>
                                            )}
                                        </Paper>
                                    </Grid>
                                )}
                            </Grid>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default TrackExpensesModal;
