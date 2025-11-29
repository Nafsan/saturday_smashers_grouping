import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    FormControl, InputLabel, Select, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { fetchTournamentCostDates, fetchTournamentCostDetails } from '../api/client';
import LoadingSpinner from './LoadingSpinner';

const TournamentCostViewerModal = ({ open, onClose }) => {
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);

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
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Tournament Cost Breakdown</DialogTitle>
            <DialogContent>
                <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
                    <FormControl fullWidth>
                        <InputLabel>Select Tournament Date</InputLabel>
                        <Select
                            value={selectedDate}
                            label="Select Tournament Date"
                            onChange={(e) => handleDateChange(e.target.value)}
                        >
                            {dates.map((date) => (
                                <MenuItem key={date} value={date}>
                                    {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </div>

                {loading ? (
                    <LoadingSpinner />
                ) : details ? (
                    <>
                        <div style={{ marginBottom: '2rem' }}>
                            <h3>Total Costs</h3>
                            <p>Venue Cost: ৳{details.total_venue_cost.toFixed(2)}</p>
                            <p>Ball Cost: ৳{details.total_ball_cost.toFixed(2)}</p>
                            <p>Miscellaneous Cost: ৳{details.total_misc_cost.toFixed(2)}</p>
                            <p><strong>Total: ৳{details.total_cost.toFixed(2)}</strong></p>
                        </div>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Player</TableCell>
                                        <TableCell>Venue</TableCell>
                                        <TableCell>Ball</TableCell>
                                        <TableCell>Misc</TableCell>
                                        <TableCell>Player Specific</TableCell>
                                        <TableCell><strong>Total</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {details.player_breakdowns.map((player) => (
                                        <TableRow key={player.player_name}>
                                            <TableCell>
                                                {player.player_name}
                                                {player.is_club_member && <span style={{ color: '#4ade80', marginLeft: '0.5rem' }}>(Club)</span>}
                                            </TableCell>
                                            <TableCell>৳{player.venue_cost.toFixed(2)}</TableCell>
                                            <TableCell>৳{player.ball_cost.toFixed(2)}</TableCell>
                                            <TableCell>৳{player.common_misc_cost.toFixed(2)}</TableCell>
                                            <TableCell>৳{player.player_specific_cost.toFixed(2)}</TableCell>
                                            <TableCell><strong>৳{player.total_cost.toFixed(2)}</strong></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        Select a date to view cost breakdown
                    </div>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default TournamentCostViewerModal;
