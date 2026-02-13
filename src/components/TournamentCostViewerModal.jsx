import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    List, ListItem, ListItemText, ListItemButton, Divider, TextField, InputAdornment, Box, Typography,
    IconButton, Grid, useMediaQuery
} from '@mui/material';
import { Search, ChevronRight, ArrowLeft } from 'lucide-react';
import { fetchTournamentCostDates, fetchTournamentCostDetails } from '../api/client';
import LoadingSpinner from './LoadingSpinner';

const TournamentCostViewerModal = ({ open, onClose }) => {
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const isMobile = useMediaQuery('(max-width:600px)');

    const filteredDates = dates.filter(date => {
        const formattedDate = new Date(date).toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        return formattedDate.toLowerCase().includes(searchTerm.toLowerCase());
    });

    useEffect(() => {
        if (open) {
            loadDates();
        } else {
            // Reset state when closed
            setSelectedDate('');
            setDetails(null);
        }
    }, [open]);

    const loadDates = async () => {
        try {
            const dateList = await fetchTournamentCostDates();
            setDates(dateList);
        } catch (error) {
            console.error('Error loading dates:', error);
        }
    };

    const handleDateChange = async (date) => {
        setSelectedDate(date);
        if (!date) {
            setDetails(null);
            return;
        }

        try {
            setLoading(true);
            const data = await fetchTournamentCostDetails(date);
            setDetails(data);
        } catch (error) {
            console.error('Error loading details:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    width: isMobile ? '97%' : undefined,
                    maxHeight: isMobile ? '100vh' : undefined,
                    margin: isMobile ? '8px' : undefined
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedDate && (
                    <IconButton size="small" onClick={() => { setSelectedDate(''); setDetails(null); }}>
                        <ArrowLeft size={20} />
                    </IconButton>
                )}
                {selectedDate ? 'Tournament Breakdown' : 'Select Tournament'}
            </DialogTitle>
            <DialogContent dividers>
                {!selectedDate ? (
                    <>
                        <Box sx={{ mb: 2, mt: 1 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search tournament date..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search size={18} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                        <Paper variant="outlined">
                            <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
                                {filteredDates.length > 0 ? (
                                    filteredDates.map((date, index) => (
                                        <React.Fragment key={date}>
                                            <ListItem disablePadding>
                                                <ListItemButton onClick={() => handleDateChange(date)}>
                                                    <ListItemText
                                                        primary={new Date(date).toLocaleDateString(undefined, {
                                                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                                        })}
                                                        secondary={date}
                                                    />
                                                    <ChevronRight size={18} color="gray" />
                                                </ListItemButton>
                                            </ListItem>
                                            {index < filteredDates.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <Box sx={{ p: 4, textAlign: 'center' }}>
                                        <Typography color="textSecondary">No tournaments found matching search.</Typography>
                                    </Box>
                                )}
                            </List>
                        </Paper>
                    </>
                ) : loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <LoadingSpinner />
                    </Box>
                ) : details ? (
                    <>
                        <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(74, 222, 128, 0.1)', borderRadius: 2 }}>
                            <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                                {new Date(selectedDate).toLocaleDateString(undefined, {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                })}
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Venue Cost</Typography>
                                    <Typography variant="body1" fontWeight="bold">৳{details.total_venue_cost.toFixed(2)}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Ball Cost</Typography>
                                    <Typography variant="body1" fontWeight="bold">৳{details.total_ball_cost.toFixed(2)}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Misc Cost</Typography>
                                    <Typography variant="body1" fontWeight="bold">৳{details.total_misc_cost.toFixed(2)}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Grand Total</Typography>
                                    <Typography variant="h6" color="success.main" fontWeight="bold">৳{details.total_cost.toFixed(2)}</Typography>
                                </Grid>
                            </Grid>
                        </Box>

                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ bgcolor: 'grey.200', color: 'grey.900', fontWeight: 'bold' }}>Player</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.200', color: 'grey.900', fontWeight: 'bold' }}>Venue</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.200', color: 'grey.900', fontWeight: 'bold' }}>Ball</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.200', color: 'grey.900', fontWeight: 'bold', textAlign: 'right' }}>Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {details.player_breakdowns.map((player) => (
                                        <TableRow key={player.player_name} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={player.is_club_member ? 'bold' : 'normal'} sx={{ color: 'text.primary' }}>
                                                    {player.player_name}
                                                    {player.is_club_member && (
                                                        <Box component="span" sx={{ ml: 1, color: 'success.main', fontSize: '0.75rem' }}>
                                                            (Club)
                                                        </Box>
                                                    )}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ color: 'text.primary' }}>৳{player.venue_cost.toFixed(2)}</TableCell>
                                            <TableCell sx={{ color: 'text.primary' }}>৳{player.ball_cost.toFixed(2)}</TableCell>
                                            <TableCell align="right" sx={{ color: 'text.primary' }}><strong>৳{player.total_cost.toFixed(2)}</strong></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Special Adjustments Section */}
                        {details.player_breakdowns.some(p => p.player_specific_cost > 0 || p.common_misc_cost > 0) && (
                            <Box sx={{ mt: 3, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Special Adjustments / Misc Costs
                                </Typography>
                                {details.player_breakdowns.filter(p => p.player_specific_cost > 0 || p.common_misc_cost > 0).map((player) => (
                                    <Box key={player.player_name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                        <Typography variant="body2">{player.player_name}</Typography>
                                        <Box sx={{ textAlign: 'right' }}>
                                            {player.common_misc_cost > 0 && (
                                                <Typography variant="caption" display="block" color="textSecondary">
                                                    Common Misc: ৳{player.common_misc_cost.toFixed(2)}
                                                </Typography>
                                            )}
                                            {player.player_specific_cost > 0 && (
                                                <Typography variant="caption" display="block" color="warning.main" sx={{ fontWeight: 'bold' }}>
                                                    Specific: ৳{player.player_specific_cost.toFixed(2)}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default TournamentCostViewerModal;
