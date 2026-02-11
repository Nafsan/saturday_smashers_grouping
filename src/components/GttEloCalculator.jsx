import React, { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Grid,
    Card,
    CardContent,
    Container,
    IconButton,
    Tooltip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment
} from '@mui/material';
import { Calculator, Copy, ArrowLeft, RefreshCw, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const GttEloCalculator = () => {
    const navigate = useNavigate();
    const { successNotification, errorNotification } = useToast();
    const [standingsInput, setStandingsInput] = useState('');
    const [matchesInput, setMatchesInput] = useState('');
    const [calculatedData, setCalculatedData] = useState(null);

    // Bonus Dialog States
    const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
    const [bonusInput, setBonusInput] = useState('');

    // Search State
    const [standingsSearch, setStandingsSearch] = useState('');

    // ELO Rating Difference Table
    // Format: [min_diff, max_diff, expected_points, unexpected_points]
    const RATING_logic = [
        [300, Infinity, 0, 63],
        [270, 299, 1, 55],
        [240, 269, 2, 46],
        [210, 239, 2, 39],
        [180, 209, 3, 32],
        [150, 179, 3, 26],
        [120, 149, 4, 21],
        [90, 119, 5, 17],
        [60, 89, 6, 13],
        [30, 59, 7, 10],
        [15, 29, 7, 9],
        [0, 14, 8, 8]
    ];

    const getPoints = (ratingDiff) => {
        const diff = Math.abs(ratingDiff);
        for (const [min, max, expected, unexpected] of RATING_logic) {
            if (diff >= min && diff <= max) {
                return { expected, unexpected };
            }
        }
        return { expected: 8, unexpected: 8 }; // Fallback for 0-14 range if not covered explicitly
    };

    const normalizeName = (name) => {
        if (!name) return '';
        // Remove everything except alphanumeric and parentheses, then lowercase
        return name.toLowerCase().replace(/[^a-z0-9()]/g, '');
    };

    const parseRating = (ratingStr) => {
        if (!ratingStr) return { value: 0, status: 'NEW' };

        const cleanStr = ratingStr.trim().toLowerCase();
        if (cleanStr === '-' || cleanStr === 'new') return { value: 0, status: 'NEW' };

        if (cleanStr.startsWith('t')) {
            const value = parseInt(cleanStr.replace(/[^0-9]/g, '')) || 0;
            if (cleanStr.endsWith('**')) return { value, status: 'TEMP2' };
            if (cleanStr.endsWith('*')) return { value, status: 'TEMP1' };
        }

        return { value: parseInt(cleanStr.replace(/[^0-9]/g, '')) || 0, status: 'PERMANENT' };
    };

    const formatRating = (value, status) => {
        if (status === 'NEW') return 'new';
        if (status === 'TEMP1') return `T ${value} *`;
        if (status === 'TEMP2') return `T ${value} **`;
        return value.toString();
    };

    const handleBonusSubmit = () => {
        if (!bonusInput.trim() || !calculatedData) {
            setBonusDialogOpen(false);
            return;
        }

        const lines = bonusInput.trim().split('\n');
        const updatedStandings = [...calculatedData.standings];
        let count = 0;

        lines.forEach(line => {
            const parts = line.split(/\t+/);
            if (parts.length >= 2) {
                const name = normalizeName(parts[0]);
                const bonus = parseInt(parts[1].replace(/[^0-9-]/g, '')) || 0;

                const playerIndex = updatedStandings.findIndex(p => normalizeName(p.name) === name);
                if (playerIndex !== -1) {
                    updatedStandings[playerIndex].rating += bonus;
                    updatedStandings[playerIndex].ratingChange += bonus;
                    count++;
                }
            }
        });

        if (count > 0) {
            // Re-sort standings
            updatedStandings.sort((a, b) => {
                const statusPriority = { 'PERMANENT': 3, 'TEMP2': 2, 'TEMP1': 1, 'NEW': 0 };
                if (statusPriority[b.status] !== statusPriority[a.status]) {
                    return statusPriority[b.status] - statusPriority[a.status];
                }
                return b.rating - a.rating;
            });

            setCalculatedData({
                ...calculatedData,
                standings: updatedStandings
            });
            successNotification(`Applied bonus to ${count} players!`);
        } else {
            errorNotification("No matching players found for bonus");
        }

        setBonusDialogOpen(false);
        setBonusInput('');
    };

    const handleCalculate = () => {
        if (!standingsInput.trim()) {
            errorNotification("Please enter current standings");
            return;
        }

        // 1. Parse Standings
        const players = {};

        const standingsLines = standingsInput.trim().split('\n');
        let startIndex = 0;
        const firstLine = standingsLines[0].toLowerCase();
        if (firstLine.includes('name') || firstLine.includes('rating') || firstLine.includes('rank') || firstLine.includes('no.')) {
            startIndex = 1;
        }

        for (let i = startIndex; i < standingsLines.length; i++) {
            const line = standingsLines[i].trim();
            if (!line) continue;

            const parts = line.split(/\t+/);
            if (parts.length >= 2) {
                let name = parts[1];
                let ratingStr = parts[2];

                const { value, status } = parseRating(ratingStr);

                if (name) {
                    players[normalizeName(name)] = {
                        name: name.trim(),
                        rating: value,
                        status: status,
                        initialRating: value,
                        initialStatus: status,
                        ratingChange: 0
                    };
                }
            }
        }

        // 2. Parse Matches
        if (!matchesInput.trim()) {
            errorNotification("Please enter match results");
            return;
        }

        const matches = [];
        const matchLines = matchesInput.trim().split('\n');

        matchLines.forEach(line => {
            const parts = line.trim().split(/\t+/);
            if (parts.length < 3) return;

            const p1Name = parts[0].trim();
            const p2Name = parts[1].trim();
            const result = parts[2].trim();

            if (!p1Name || !p2Name || !result) return;

            matches.push({ p1Name, p2Name, result });
        });

        // 3. Process Matches
        const processedMatches = [];

        matches.forEach(match => {
            const p1Key = normalizeName(match.p1Name);
            const p2Key = normalizeName(match.p2Name);

            let p1 = players[p1Key];
            let p2 = players[p2Key];

            if (!p1) {
                p1 = { name: match.p1Name, rating: 0, status: 'NEW', initialRating: 0, initialStatus: 'NEW', ratingChange: 0 };
                players[p1Key] = p1;
            }
            if (!p2) {
                p2 = { name: match.p2Name, rating: 0, status: 'NEW', initialRating: 0, initialStatus: 'NEW', ratingChange: 0 };
                players[p2Key] = p2;
            }

            const currentRating1 = p1.rating;
            const currentRating2 = p2.rating;
            const status1 = p1.status;
            const status2 = p2.status;

            const scoreParts = match.result.split('-');
            const s1 = parseInt(scoreParts[0]);
            const s2 = parseInt(scoreParts[1]);

            let winner, loser, winnerRatingBefore, loserRatingBefore;
            let winnerStatusBefore, loserStatusBefore;

            if (s1 > s2) {
                winner = p1; loser = p2;
                winnerRatingBefore = currentRating1; loserRatingBefore = currentRating2;
                winnerStatusBefore = status1; loserStatusBefore = status2;
            } else {
                winner = p2; loser = p1;
                winnerRatingBefore = currentRating2; loserRatingBefore = currentRating1;
                winnerStatusBefore = status2; loserStatusBefore = status1;
            }

            let winnerRatingAfter = winnerRatingBefore;
            let loserRatingAfter = loserRatingBefore;
            let winnerStatusAfter = winnerStatusBefore;
            let loserStatusAfter = loserStatusBefore;
            let pointChange = 0;
            let isExpectedWin = winnerRatingBefore >= loserRatingBefore;

            // --- Rating Logic ---
            if (winnerStatusBefore === 'NEW' || winnerStatusBefore === 'TEMP1' || winnerStatusBefore === 'TEMP2') {
                // Winner is New/Temp
                if (winnerStatusBefore === 'NEW') {
                    // Win 1
                    winnerRatingAfter = loserRatingBefore;
                    winnerStatusAfter = 'TEMP1';
                } else if (winnerStatusBefore === 'TEMP1') {
                    // Win 2
                    winnerRatingAfter = Math.max(winnerRatingBefore, loserRatingBefore);
                    winnerStatusAfter = 'TEMP2';
                } else if (winnerStatusBefore === 'TEMP2') {
                    // Win 3
                    winnerRatingAfter = Math.round((winnerRatingBefore + loserRatingBefore) / 2);
                    winnerStatusAfter = 'PERMANENT';
                }

                // Loser logic if loser is NOT New
                if (loserStatusBefore !== 'NEW') {
                    // Standard ELO based on numerical values
                    const { expected, unexpected } = getPoints(winnerRatingBefore - loserRatingBefore);
                    const lostPoints = (winnerRatingBefore < loserRatingBefore) ? unexpected : expected;
                    loserRatingAfter -= lostPoints;
                    pointChange = lostPoints; // For Match Analysis display
                }
            } else {
                // Winner is PERMANENT
                if (loserStatusBefore === 'NEW') {
                    // Losing as NEW results in 0 points for opponent
                    pointChange = 0;
                } else {
                    // Standard ELO comparison
                    const { expected, unexpected } = getPoints(winnerRatingBefore - loserRatingBefore);
                    const gain = (winnerRatingBefore >= loserRatingBefore) ? expected : unexpected;
                    winnerRatingAfter += gain;
                    loserRatingAfter -= gain;
                    pointChange = gain;
                }
            }

            // Update player state
            winner.rating = winnerRatingAfter;
            winner.status = winnerStatusAfter;
            loser.rating = loserRatingAfter;
            loser.status = loserStatusAfter;

            // Tracking change (for standings column display)
            winner.ratingChange = winner.rating - winner.initialRating;
            loser.ratingChange = loser.rating - loser.initialRating;

            processedMatches.push({
                p1: match.p1Name,
                p2: match.p2Name,
                result: match.result,
                winner: winner.name,
                loser: loser.name,
                points: pointChange,
                isExpected: isExpectedWin,
                winnerRatingBefore: formatRating(winnerRatingBefore, winnerStatusBefore),
                loserRatingBefore: formatRating(loserRatingBefore, loserStatusBefore),
                winnerRatingAfter: formatRating(winnerRatingAfter, winnerStatusAfter),
                loserRatingAfter: formatRating(loserRatingAfter, loserStatusAfter),
                eloDiff: Math.abs(winnerRatingBefore - loserRatingBefore)
            });
        });

        // 4. Generate Final Standings
        // Sort: PERMANENT (by value desc) > TEMP (by value desc) > NEW
        const finalStandings = Object.values(players).sort((a, b) => {
            const statusPriority = { 'PERMANENT': 3, 'TEMP2': 2, 'TEMP1': 1, 'NEW': 0 };
            if (statusPriority[b.status] !== statusPriority[a.status]) {
                return statusPriority[b.status] - statusPriority[a.status];
            }
            return b.rating - a.rating;
        });

        setCalculatedData({
            matches: processedMatches,
            standings: finalStandings
        });

        successNotification("Calculation complete!");
    };

    const copyToClipboard = () => {
        if (!calculatedData) return;

        let text = "No.\tName\tElo Rating\n";
        calculatedData.standings.forEach((p, idx) => {
            text += `${idx + 1}\t${p.name}\t${formatRating(p.rating, p.status)}\n`;
        });

        navigator.clipboard.writeText(text);
        successNotification("Standings copied to clipboard!");
    };

    const copyMatchesToClipboard = () => {
        if (!calculatedData) return;

        let text = "";
        calculatedData.matches.forEach((match) => {
            // Using quotes and newlines to match the UI layout and ensure correct spreadsheet pasting
            const winnerCell = `"${match.winner}\n${match.winnerRatingBefore} → ${match.winnerRatingAfter}"`;
            const loserCell = `"${match.loser}\n${match.loserRatingBefore} → ${match.loserRatingAfter}"`;

            text += `${winnerCell}\t${loserCell}\t${match.result}\t${match.eloDiff}\t${match.points}\n`;
        });

        navigator.clipboard.writeText(text);
        successNotification("Match analysis copied to clipboard!");
    };

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    startIcon={<ArrowLeft />}
                    onClick={() => navigate('/')}
                    variant="outlined"
                    sx={{ color: 'text.primary', borderColor: 'divider' }}
                >
                    Back
                </Button>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    GTT ELO Calculator
                </Typography>
            </Box>

            {!calculatedData ? (
                <Stack spacing={4}>
                    <Box>
                        <Paper elevation={3} sx={{ p: 3, height: '100%', borderRadius: 4, bgcolor: 'background.paper' }}>
                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6" fontWeight="bold">Current Standings</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Paste the table from Excel/Sheets (No., Name, Elo Rating)
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={15}
                                variant="outlined"
                                placeholder={`1\tKawsar\t2340\n2\tShommo\t2331...`}
                                value={standingsInput}
                                onChange={(e) => setStandingsInput(e.target.value)}
                                sx={{
                                    fontFamily: 'monospace',
                                    '& .MuiOutlinedInput-root': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem'
                                    }
                                }}
                            />
                        </Paper>
                    </Box>

                    <Box>
                        <Paper elevation={3} sx={{ p: 3, height: '100%', borderRadius: 4, bgcolor: 'background.paper' }}>
                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6" fontWeight="bold">Match Results</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Paste matches (Player 1, Player 2, Result)
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={15}
                                variant="outlined"
                                placeholder={`AR Fahim\tMd. Imran Sheikh\t3-0\n...`}
                                value={matchesInput}
                                onChange={(e) => setMatchesInput(e.target.value)}
                                sx={{
                                    fontFamily: 'monospace',
                                    '& .MuiOutlinedInput-root': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem'
                                    }
                                }}
                            />
                        </Paper>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleCalculate}
                            startIcon={<Calculator />}
                            sx={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                px: 5,
                                py: 1.5,
                                fontSize: '1.1rem',
                                borderRadius: 3,
                                textTransform: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                            }}
                        >
                            Calculate New Ratings
                        </Button>
                    </Box>
                </Stack>
            ) : (
                <Box>
                    <Stack spacing={4}>
                        {/* Match Analysis */}
                        <Box>
                            <Paper elevation={3} sx={{ p: 0, overflow: 'hidden', borderRadius: 4, bgcolor: 'background.paper' }}>
                                <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6" fontWeight="bold">Match Analysis</Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            size="small"
                                            startIcon={<Copy size={16} />}
                                            onClick={copyMatchesToClipboard}
                                            variant="outlined"
                                            sx={{ borderRadius: 2 }}
                                        >
                                            Copy Results
                                        </Button>
                                        <Button
                                            size="small"
                                            startIcon={<RefreshCw size={16} />}
                                            onClick={() => setCalculatedData(null)}
                                            sx={{ borderRadius: 2 }}
                                        >
                                            New Calculation
                                        </Button>
                                    </Box>
                                </Box>
                                <TableContainer sx={{ maxHeight: 600 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Winner (Before &rarr; After)</TableCell>
                                                <TableCell>Loser (Before &rarr; After)</TableCell>
                                                <TableCell align="center">Result</TableCell>
                                                <TableCell align="right">Elo Diff</TableCell>
                                                <TableCell align="right">Pts</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {calculatedData.matches.map((match, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                                                {match.winner}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {match.winnerRatingBefore} &rarr; {match.winnerRatingAfter}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                            <Typography variant="body2" sx={{ color: 'error.main' }}>
                                                                {match.loser}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {match.loserRatingBefore} &rarr; {match.loserRatingAfter}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ color: 'text.secondary' }}>{match.result}</TableCell>
                                                    <TableCell align="right" sx={{ color: 'text.secondary' }}>{match.eloDiff}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                        {match.points > 0 ? `+${match.points}` : match.points}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Box>

                        {/* Updated Standings */}
                        <Box>
                            <Paper elevation={3} sx={{ p: 0, overflow: 'hidden', borderRadius: 4, bgcolor: 'background.paper', height: '100%' }}>
                                <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                    <Typography variant="h6" fontWeight="bold">Updated Standings</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexGrow: 1, justifyContent: 'flex-end' }}>
                                        <TextField
                                            size="small"
                                            placeholder="Search name..."
                                            value={standingsSearch}
                                            onChange={(e) => setStandingsSearch(e.target.value)}
                                            sx={{ maxWidth: 200 }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Search size={16} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                        <Button
                                            size="small"
                                            startIcon={<Plus size={16} />}
                                            onClick={() => setBonusDialogOpen(true)}
                                            variant="outlined"
                                            color="secondary"
                                            sx={{ borderRadius: 2 }}
                                        >
                                            Add Bonus
                                        </Button>
                                        <Tooltip title="Copy for Excel/Sheets">
                                            <IconButton onClick={copyToClipboard} color="primary" sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                                                <Copy size={20} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                                <TableContainer sx={{ maxHeight: 600 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>#</TableCell>
                                                <TableCell>Name</TableCell>
                                                <TableCell align="right">Rating</TableCell>
                                                <TableCell align="right">Diff</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {calculatedData.standings
                                                .filter(p => p.name.toLowerCase().includes(standingsSearch.toLowerCase()))
                                                .map((player, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell>
                                                            {calculatedData.standings.indexOf(player) + 1}
                                                        </TableCell>
                                                        <TableCell
                                                            sx={{
                                                                fontWeight: player.ratingChange !== 0 ? 'bold' : 'normal',
                                                            }}
                                                        >
                                                            {player.name}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                            {formatRating(player.rating, player.status)}
                                                        </TableCell>
                                                        <TableCell
                                                            align="right"
                                                            sx={{
                                                                color: player.ratingChange > 0 ? 'success.main' : player.ratingChange < 0 ? 'error.main' : 'text.secondary',
                                                                fontSize: '0.85rem'
                                                            }}
                                                        >
                                                            {player.ratingChange !== 0 ? (player.ratingChange > 0 ? `+${player.ratingChange}` : player.ratingChange) : '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Box>
                    </Stack>
                </Box>
            )}

            {/* Bonus Points Dialog */}
            <Dialog open={bonusDialogOpen} onClose={() => setBonusDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Bonus Points</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Paste players and bonus points (Name \t Points). One per line.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={10}
                        placeholder={`Kawsar\t50\nShommo\t30`}
                        value={bonusInput}
                        onChange={(e) => setBonusInput(e.target.value)}
                        sx={{ fontFamily: 'monospace' }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setBonusDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleBonusSubmit} variant="contained" color="primary">Apply Bonus</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default GttEloCalculator;
