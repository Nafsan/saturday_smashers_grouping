import React, { useState, useEffect } from 'react';
import {
    TextField, Button, Alert, Checkbox, FormControlLabel, Autocomplete,
    Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, useMediaQuery
} from '@mui/material';
import { fetchPlayers, fetchFundSettings, fetchTournamentPlayersByDate, calculateTournamentCosts, saveTournamentCosts, createUnofficialTournament } from '../api/client';
import { Plus, Calculator, Save, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminAuthCookie, setAdminAuthCookie } from '../utils/cookieUtils';

const AddTournamentCosts = () => {
    const navigate = useNavigate();
    const isMobile = useMediaQuery('(max-width:600px)');
    const [allPlayers, setAllPlayers] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // Form state
    const [tournamentDate, setTournamentDate] = useState('');
    const [useDefaultVenue, setUseDefaultVenue] = useState(true);
    const [useDefaultBall, setUseDefaultBall] = useState(true);
    const [venueFee, setVenueFee] = useState(0);
    const [ballFee, setBallFee] = useState(0);
    const [tournamentPlayers, setTournamentPlayers] = useState([]);
    const [clubMembers, setClubMembers] = useState([]);
    const [numBalls, setNumBalls] = useState(0);
    const [commonMiscCost, setCommonMiscCost] = useState(0);
    const [commonMiscName, setCommonMiscName] = useState('');
    const [playerSpecificCosts, setPlayerSpecificCosts] = useState([]);

    const [calculation, setCalculation] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showUnofficialDialog, setShowUnofficialDialog] = useState(false);
    const [isUnofficialTournament, setIsUnofficialTournament] = useState(false);
    const [unofficialTournamentCreated, setUnofficialTournamentCreated] = useState(false);
    const [unofficialTournamentDate, setUnofficialTournamentDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [creatingUnofficial, setCreatingUnofficial] = useState(false);

    useEffect(() => {
        loadData();

        // Check for stored admin password
        const storedPassword = getAdminAuthCookie();
        if (storedPassword) {
            // Password will be used automatically in API calls
        }
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [players, fundSettings] = await Promise.all([
                fetchPlayers(),
                fetchFundSettings()
            ]);
            setAllPlayers(players.map(p => p.name));
            setSettings(fundSettings);
            setVenueFee(fundSettings.default_venue_fee);
            setBallFee(fundSettings.default_ball_fee);
        } catch (error) {
            console.error('Error loading data:', error);
            setMessage({ type: 'error', text: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const handleAutoPopulatePlayers = async () => {
        if (!tournamentDate) {
            setMessage({ type: 'error', text: 'Please select a tournament date first' });
            return;
        }

        try {
            const response = await fetchTournamentPlayersByDate(tournamentDate);
            setTournamentPlayers(response.players);
            setMessage({ type: 'success', text: `Auto-populated ${response.players.length} players` });
            console.log('Auto-populated players:', response.players);
            console.log(response);
            // Clear unofficial tournament flag if successfully populated
            setIsUnofficialTournament(false);
        } catch (error) {
            console.error('Error auto-populating players:', error);
            // If tournament not found (404), prompt for unofficial tournament creation
            if (error.response?.status === 404) {
                setUnofficialTournamentDate(tournamentDate);
                setShowUnofficialDialog(true);
            } else {
                setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to fetch tournament players' });
            }
        }
    };

    const handleConfirmUnofficialTournament = () => {
        // Just store the confirmation, don't create tournament yet
        setIsUnofficialTournament(true);
        setUnofficialTournamentCreated(false);
        setShowUnofficialDialog(false);
        setMessage({
            type: 'info',
            text: 'Marked as unofficial tournament. Please select players and click "Create Unofficial Tournament" button below.'
        });
    };

    const handleCreateUnofficialTournament = async () => {
        if (tournamentPlayers.length === 0) {
            setMessage({ type: 'error', text: 'Please select tournament players first' });
            return;
        }

        try {
            setCreatingUnofficial(true);
            const password = getAdminAuthCookie() || 'ss_admin_panel';
            await createUnofficialTournament(
                { date: tournamentDate, tournament_players: tournamentPlayers },
                password
            );

            // Store password in cookie after successful authentication
            setAdminAuthCookie(password);

            setUnofficialTournamentCreated(true);
            setMessage({ type: 'success', text: 'Unofficial tournament created successfully! You can now calculate and save costs.' });
        } catch (error) {
            console.error('Error creating unofficial tournament:', error);
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create unofficial tournament' });
        } finally {
            setCreatingUnofficial(false);
        }
    };

    const addPlayerSpecificCost = () => {
        setPlayerSpecificCosts([...playerSpecificCosts, {
            player_names: [],
            cost_amount: 0,
            cost_name: ''
        }]);
    };

    const removePlayerSpecificCost = (index) => {
        setPlayerSpecificCosts(playerSpecificCosts.filter((_, i) => i !== index));
    };

    const updatePlayerSpecificCost = (index, field, value) => {
        const updated = [...playerSpecificCosts];
        updated[index][field] = value;
        setPlayerSpecificCosts(updated);
    };

    const handleCalculate = async () => {
        // Validation
        if (!tournamentDate) {
            setMessage({ type: 'error', text: 'Please select a tournament date' });
            return;
        }
        if (tournamentPlayers.length === 0) {
            setMessage({ type: 'error', text: 'Please select tournament players' });
            return;
        }
        if (isUnofficialTournament && !unofficialTournamentCreated) {
            setMessage({ type: 'error', text: 'Please create the unofficial tournament first using the button below.' });
            return;
        }

        const requestData = {
            tournament_date: tournamentDate,
            use_default_venue_fee: useDefaultVenue,
            use_default_ball_fee: useDefaultBall,
            venue_fee_per_person: useDefaultVenue ? null : venueFee,
            ball_fee_per_ball: useDefaultBall ? null : ballFee,
            tournament_players: tournamentPlayers,
            club_members: clubMembers,
            num_balls_purchased: numBalls,
            common_misc_cost: commonMiscCost,
            common_misc_name: commonMiscName || null,
            player_specific_costs: playerSpecificCosts
        };

        try {
            setMessage(null);
            const password = getAdminAuthCookie() || 'ss_admin_panel';
            const result = await calculateTournamentCosts(requestData, password);

            // Store password in cookie after successful authentication
            setAdminAuthCookie(password);

            setCalculation(result);
            setShowPreview(true);
        } catch (error) {
            console.error('Error calculating costs:', error);
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to calculate costs' });
        }
    };

    const handleSave = async () => {
        const requestData = {
            tournament_date: tournamentDate,
            use_default_venue_fee: useDefaultVenue,
            use_default_ball_fee: useDefaultBall,
            venue_fee_per_person: useDefaultVenue ? null : venueFee,
            ball_fee_per_ball: useDefaultBall ? null : ballFee,
            tournament_players: tournamentPlayers,
            club_members: clubMembers,
            num_balls_purchased: numBalls,
            common_misc_cost: commonMiscCost,
            common_misc_name: commonMiscName || null,
            player_specific_costs: playerSpecificCosts
        };

        try {
            setSaving(true);

            // Unofficial tournament should already be created by now
            const password = getAdminAuthCookie() || 'ss_admin_panel';
            await saveTournamentCosts(requestData, password);

            // Store password in cookie after successful authentication
            setAdminAuthCookie(password);

            setMessage({ type: 'success', text: 'Tournament costs saved and balances updated successfully!' });
            setShowPreview(false);

            // Reset form
            setTimeout(() => {
                navigate('/fund');
            }, 2000);
        } catch (error) {
            console.error('Error saving costs:', error);
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save costs' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Add Tournament Costs</h2>

            {message && (
                <Alert severity={message.type} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Tournament Date */}
                <TextField
                    fullWidth
                    label="Tournament Date"
                    type="date"
                    value={tournamentDate}
                    onChange={(e) => setTournamentDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />

                {/* Venue and Ball Fees */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    <div>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={useDefaultVenue}
                                    onChange={(e) => setUseDefaultVenue(e.target.checked)}
                                />
                            }
                            label={`Use default venue fee (৳${settings?.default_venue_fee || 0})`}
                        />
                        {!useDefaultVenue && (
                            <TextField
                                fullWidth
                                label="Venue Fee (per person)"
                                type="number"
                                value={venueFee}
                                onChange={(e) => setVenueFee(parseFloat(e.target.value) || '')}
                                InputProps={{
                                    startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                                }}
                            />
                        )}
                    </div>

                    <div>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={useDefaultBall}
                                    onChange={(e) => setUseDefaultBall(e.target.checked)}
                                />
                            }
                            label={`Use default ball fee (৳${settings?.default_ball_fee || 0})`}
                        />
                        {!useDefaultBall && (
                            <TextField
                                fullWidth
                                label="Ball Fee (per ball)"
                                type="number"
                                value={ballFee}
                                onChange={(e) => setBallFee(parseFloat(e.target.value) || '')}
                                InputProps={{
                                    startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Tournament Players */}
                <div>
                    <Button
                        variant="outlined"
                        onClick={handleAutoPopulatePlayers}
                        startIcon={<Sparkles size={20} />}
                        sx={{ mb: 2 }}
                    >
                        Auto Populate Tournament Players
                    </Button>
                    <Autocomplete
                        multiple
                        options={allPlayers}
                        value={tournamentPlayers}
                        onChange={(e, newValue) => setTournamentPlayers(newValue)}
                        renderInput={(params) => (
                            <TextField {...params} label="Tournament Players" placeholder="Select players" />
                        )}
                    />
                </div>

                {/* Club Members */}
                <Autocomplete
                    multiple
                    options={tournamentPlayers}
                    value={clubMembers}
                    onChange={(e, newValue) => setClubMembers(newValue)}
                    renderInput={(params) => (
                        <TextField {...params} label="Club Members (Optional)" placeholder="Select club members" />
                    )}
                />

                {/* Number of Balls */}
                <TextField
                    fullWidth
                    label="Number of WTT Balls Purchased"
                    type="number"
                    value={numBalls}
                    onChange={(e) => setNumBalls(parseInt(e.target.value) || '')}
                />

                {/* Common Miscellaneous Cost */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                    <TextField
                        label="Common Miscellaneous Cost Name (Optional)"
                        value={commonMiscName}
                        onChange={(e) => setCommonMiscName(e.target.value)}
                    />
                    <TextField
                        label="Amount"
                        type="number"
                        value={commonMiscCost}
                        onChange={(e) => setCommonMiscCost(parseFloat(e.target.value) || '')}
                        InputProps={{
                            startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                        }}
                    />
                </div>

                {/* Player Specific Costs */}
                <div>
                    <Button
                        variant="outlined"
                        onClick={addPlayerSpecificCost}
                        startIcon={<Plus size={20} />}
                        sx={{ mb: 2 }}
                    >
                        Add Player Specific Miscellaneous Cost
                    </Button>

                    {playerSpecificCosts.map((cost, index) => (
                        <div
                            key={index}
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '1rem',
                                marginBottom: '1rem'
                            }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                                <Autocomplete
                                    multiple
                                    options={tournamentPlayers}
                                    value={cost.player_names}
                                    onChange={(e, newValue) => updatePlayerSpecificCost(index, 'player_names', newValue)}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Player Names" size="small" />
                                    )}
                                />
                                <TextField
                                    label="Cost Amount"
                                    type="number"
                                    size="small"
                                    value={cost.cost_amount}
                                    onChange={(e) => updatePlayerSpecificCost(index, 'cost_amount', parseFloat(e.target.value) || '')}
                                    InputProps={{
                                        startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                                    }}
                                />
                                <Button
                                    color="error"
                                    onClick={() => removePlayerSpecificCost(index)}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Create Unofficial Tournament Button - Only shown when unofficial tournament needs to be created */}
                {isUnofficialTournament && !unofficialTournamentCreated && (
                    <Button
                        variant="contained"
                        onClick={handleCreateUnofficialTournament}
                        disabled={creatingUnofficial || tournamentPlayers.length === 0}
                        startIcon={<Plus size={20} />}
                        sx={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            padding: '0.75rem 2rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            marginBottom: '1rem',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                            },
                            '&:disabled': {
                                background: '#64748b',
                                color: '#cbd5e1'
                            }
                        }}
                    >
                        {creatingUnofficial ? 'Creating Unofficial Tournament...' : 'Create Unofficial Tournament Entry'}
                    </Button>
                )}

                {/* Calculate Button */}
                <Button
                    variant="contained"
                    onClick={handleCalculate}
                    disabled={isUnofficialTournament && !unofficialTournamentCreated}
                    startIcon={<Calculator size={20} />}
                    sx={{
                        background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': {
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                        },
                        '&:disabled': {
                            background: '#64748b',
                            color: '#cbd5e1'
                        }
                    }}
                >
                    Calculate Costs
                </Button>
            </div>

            {/* Preview Dialog */}
            <Dialog
                open={showPreview}
                onClose={() => setShowPreview(false)}
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
                <DialogTitle>Tournament Cost Breakdown</DialogTitle>
                <DialogContent>
                    {calculation && (
                        <>
                            <div style={{ marginBottom: '2rem' }}>
                                <h3>Total Costs</h3>
                                <p>Venue Cost: ৳{calculation.total_venue_cost.toFixed(2)}</p>
                                <p>Ball Cost: ৳{calculation.total_ball_cost.toFixed(2)}</p>
                                <p>Miscellaneous Cost: ৳{calculation.total_misc_cost.toFixed(2)}</p>
                                <p><strong>Total: ৳{calculation.total_cost.toFixed(2)}</strong></p>
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
                                        {calculation.player_breakdowns.map((player) => (
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
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowPreview(false)}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={saving}
                        startIcon={<Save size={20} />}
                        sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            }
                        }}
                    >
                        {saving ? 'Saving...' : 'Save & Update Balances'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Unofficial Tournament Dialog */}
            <Dialog
                open={showUnofficialDialog}
                onClose={() => setShowUnofficialDialog(false)}
                PaperProps={{
                    sx: {
                        width: isMobile ? '97%' : undefined,
                        maxHeight: isMobile ? '95vh' : undefined,
                        margin: isMobile ? '8px' : undefined
                    }
                }}
            >
                <DialogTitle>No Tournament Found</DialogTitle>
                <DialogContent>
                    <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                        No tournament was found for <strong>{unofficialTournamentDate}</strong>.
                    </p>
                    <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                        Is this an <strong>unofficial friendly tournament</strong>? If yes, we'll create an entry for cost tracking when you save (it won't affect rankings).
                    </p>
                    <p style={{ color: '#f59e0b', fontSize: '0.875rem' }}>
                        ⚠️ Make sure to select tournament players below before proceeding.
                    </p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setShowUnofficialDialog(false);
                        setIsUnofficialTournament(false);
                    }}>Cancel</Button>
                    <Button
                        onClick={handleConfirmUnofficialTournament}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                            }
                        }}
                    >
                        Yes, This is Unofficial
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default AddTournamentCosts;
