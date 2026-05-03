import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    List, ListItem, ListItemText, ListItemButton, Divider, TextField, InputAdornment, Box, Typography,
    IconButton, Grid, useMediaQuery, Tooltip, useTheme
} from '@mui/material';
import { Search, ChevronRight, ArrowLeft, Share2, Download, Edit, X } from 'lucide-react';
import { toBlob, toPng } from 'html-to-image';
import { fetchTournamentCostDates, fetchTournamentCostDetails } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import { isAdminAuthenticated } from '../utils/cookieUtils';
import AddTournamentCosts from './AddTournamentCosts';

const TournamentCostViewerModal = ({ open, onClose }) => {
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);
    const isMobile = useMediaQuery('(max-width:600px)');
    const contentRef = useRef(null);
    const theme = useTheme();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const isAdmin = isAdminAuthenticated();

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

    const handleDownloadImage = async () => {
        if (!contentRef.current) return;
        try {
            setIsCapturing(true);
            // Wait for a small timeout to let the DOM update
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(contentRef.current, { 
                backgroundColor: theme.palette.background.paper, 
                quality: 1, 
                pixelRatio: 3,
                cacheBust: true,
                style: {
                    maxHeight: 'none',
                    height: 'auto',
                    width: 'max-content',
                    minWidth: '800px',
                    overflow: 'visible',
                    padding: '20px'
                }
            });
            const link = document.createElement('a');
            link.download = `Tournament-Cost-${selectedDate}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download image', err);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleShareImage = async () => {
        if (!contentRef.current) return;
        try {
            setIsCapturing(true);
            // Wait for a small timeout to let the DOM update
            await new Promise(resolve => setTimeout(resolve, 100));

            const blob = await toBlob(contentRef.current, { 
                backgroundColor: theme.palette.background.paper, 
                quality: 1, 
                pixelRatio: 3,
                cacheBust: true,
                style: {
                    maxHeight: 'none',
                    height: 'auto',
                    width: 'max-content',
                    minWidth: '800px',
                    overflow: 'visible',
                    padding: '20px'
                }
            });
            const file = new File([blob], `Tournament-Cost-${selectedDate}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Tournament Cost Breakdown - ${selectedDate}`,
                    text: `Check out the tournament cost breakdown for ${selectedDate}`
                });
            } else {
                // Fallback to download if sharing is not supported
                handleDownloadImage();
            }
        } catch (err) {
            console.error('Failed to share image', err);
        } finally {
            setIsCapturing(false);
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
                    maxHeight: isMobile ? '95vh' : undefined,
                    margin: isMobile ? '8px' : undefined
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
                {selectedDate && (
                    <IconButton size="small" onClick={() => { setSelectedDate(''); setDetails(null); }}>
                        <ArrowLeft size={20} />
                    </IconButton>
                )}
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {selectedDate ? 'Cost Breakdown' : 'Select Tournament'}
                </Typography>
                {selectedDate && details && !loading && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Download as Image">
                            <IconButton size="small" onClick={handleDownloadImage} color="primary">
                                <Download size={20} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Share as Image">
                            <IconButton size="small" onClick={handleShareImage} color="primary">
                                <Share2 size={20} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
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
                    <Box ref={contentRef} sx={{ 
                        p: isCapturing ? 3 : 0.5, 
                        bgcolor: theme.palette.background.paper, 
                        color: theme.palette.text.primary,
                        width: isCapturing ? 'max-content' : '100%',
                        minWidth: isCapturing ? '850px' : 'auto'
                    }}>
                        <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(74, 222, 128, 0.1)', borderRadius: 2 }}>
                            <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                                {new Date(selectedDate).toLocaleDateString(undefined, {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                })}
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={details.total_misc_cost > 0 ? 6 : 4} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Venue Cost</Typography>
                                    <Typography variant="body1" fontWeight="bold">৳{details.total_venue_cost.toFixed(2)}</Typography>
                                </Grid>
                                <Grid item xs={details.total_misc_cost > 0 ? 6 : 4} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Ball Cost</Typography>
                                    <Typography variant="body1" fontWeight="bold">৳{details.total_ball_cost.toFixed(2)}</Typography>
                                </Grid>
                                {details.total_misc_cost > 0 && (
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="caption" color="textSecondary">Misc Cost</Typography>
                                        <Typography variant="body1" fontWeight="bold">৳{details.total_misc_cost.toFixed(2)}</Typography>
                                    </Grid>
                                )}
                                <Grid item xs={details.total_misc_cost > 0 ? 6 : 4} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Grand Total</Typography>
                                    <Typography variant="body1" color="success.main" fontWeight="bold">৳{details.total_cost.toFixed(2)}</Typography>
                                </Grid>
                            </Grid>
                        </Box>

                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: isCapturing ? 'none' : 460, overflow: isCapturing ? 'visible' : 'auto' }}>
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
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, display: 'flex', gap: 1 }}>
                <Button onClick={onClose} variant="outlined">Close</Button>
                {isAdmin && selectedDate && (
                    <Button 
                        onClick={() => setEditDialogOpen(true)} 
                        variant="contained" 
                        startIcon={<Edit size={18} />}
                        sx={{ 
                            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                            fontWeight: 'bold'
                        }}
                    >
                        Edit Costs
                    </Button>
                )}
            </DialogActions>

            {/* Edit Costs Dialog */}
            <Dialog 
                open={editDialogOpen} 
                onClose={() => setEditDialogOpen(false)} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: {
                        width: isMobile ? '97%' : undefined,
                        maxHeight: isMobile ? '95vh' : undefined,
                        margin: isMobile ? '8px' : undefined
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Edit Tournament Costs
                    <IconButton onClick={() => setEditDialogOpen(false)}>
                        <X size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <AddTournamentCosts 
                        editDate={selectedDate} 
                        standalone={false} 
                        onSuccess={() => {
                            setEditDialogOpen(false);
                            handleDateChange(selectedDate); // Refresh details
                        }}
                    />
                </DialogContent>
            </Dialog>
        </Dialog>
    );
};

export default TournamentCostViewerModal;
