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
    IconButton,
    Tooltip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    Autocomplete,
    useMediaQuery
} from '@mui/material';
import { Calculator, Copy, ArrowLeft, RefreshCw, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const GttEloCalculator = () => {
    const navigate = useNavigate();
    const { successNotification, errorNotification } = useToast();
    const isMobile = useMediaQuery('(max-width:600px)');
    const [standingsInput, setStandingsInput] = useState('');
    const [matchesInput, setMatchesInput] = useState('');
    const [calculatedData, setCalculatedData] = useState(null);

    // Bonus Dialog States
    const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
    const [bonusRows, setBonusRows] = useState([{ player: null, points: '' }]);

    // Search States
    const [standingsSearch, setStandingsSearch] = useState('');
    const [matchSearch, setMatchSearch] = useState('');

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

    const PLAYER_STATUS = {
        NEW: 'NEW',
        TEMP1: 'TEMP1',
        TEMP2: 'TEMP2',
        PERMANENT: 'PERMANENT'
    };

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
        if (!ratingStr) return { value: 0, status: PLAYER_STATUS.NEW };

        const cleanStr = ratingStr.trim().toLowerCase();
        if (cleanStr === '-' || cleanStr === 'new') return { value: 0, status: PLAYER_STATUS.NEW };

        if (cleanStr.startsWith('t')) {
            const value = parseInt(cleanStr.replace(/[^0-9]/g, '')) || 0;
            if (cleanStr.endsWith('**')) return { value, status: PLAYER_STATUS.TEMP2 };
            if (cleanStr.endsWith('*')) return { value, status: PLAYER_STATUS.TEMP1 };
        }

        return { value: parseInt(cleanStr.replace(/[^0-9]/g, '')) || 0, status: PLAYER_STATUS.PERMANENT };
    };

    const formatRating = (value, status) => {
        if (status === PLAYER_STATUS.NEW) return 'new';
        if (status === PLAYER_STATUS.TEMP1) return `T ${value} *`;
        if (status === PLAYER_STATUS.TEMP2) return `T ${value} **`;
        return value.toString();
    };

    const handleAddBonusRow = () => {
        if (bonusRows.length < 4) {
            setBonusRows([...bonusRows, { player: null, points: '' }]);
        }
    };

    const handleRemoveBonusRow = (index) => {
        const newRows = bonusRows.filter((_, i) => i !== index);
        setBonusRows(newRows.length > 0 ? newRows : [{ player: null, points: '' }]);
    };

    const handleBonusRowChange = (index, field, value) => {
        const newRows = [...bonusRows];
        newRows[index][field] = value;
        setBonusRows(newRows);
    };

    const handleBonusSubmit = () => {
        if (!calculatedData) {
            setBonusDialogOpen(false);
            return;
        }

        const updatedStandings = [...calculatedData.standings];
        let count = 0;
        const newBonuses = [];

        bonusRows.forEach(row => {
            if (row.player && row.points) {
                const bonusPoints = parseInt(row.points) || 0;
                const index = updatedStandings.findIndex(p => normalizeName(p.name) === normalizeName(row.player.name));
                if (index !== -1) {
                    const p = updatedStandings[index];
                    const ratingBefore = formatRating(p.rating, p.status);
                    p.rating += bonusPoints;
                    p.ratingChange += bonusPoints;
                    const ratingAfter = formatRating(p.rating, p.status);

                    newBonuses.push({
                        name: p.name,
                        points: bonusPoints,
                        ratingBefore,
                        ratingAfter
                    });
                    count++;
                }
            }
        });

        if (count > 0) {
            // Re-sort standings
            updatedStandings.sort((a, b) => {
                const statusPriority = {
                    [PLAYER_STATUS.PERMANENT]: 3,
                    [PLAYER_STATUS.TEMP2]: 2,
                    [PLAYER_STATUS.TEMP1]: 1,
                    [PLAYER_STATUS.NEW]: 0
                };
                if (statusPriority[b.status] !== statusPriority[a.status]) {
                    return statusPriority[b.status] - statusPriority[a.status];
                }
                return b.rating - a.rating;
            });

            setCalculatedData({
                ...calculatedData,
                standings: updatedStandings,
                bonuses: [...(calculatedData.bonuses || []), ...newBonuses]
            });
            successNotification(`Applied bonus to ${count} players!`);
        }

        setBonusDialogOpen(false);
        setBonusRows([{ player: null, points: '' }]);
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
                    const key = normalizeName(name);
                    if (players[key]) {
                        errorNotification(`Duplicate player name found: "${name.trim()}". Please use unique names.`);
                        return;
                    }
                    players[key] = {
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
                p1 = { name: match.p1Name, rating: 0, status: PLAYER_STATUS.NEW, initialRating: 0, initialStatus: PLAYER_STATUS.NEW, ratingChange: 0 };
                players[p1Key] = p1;
            }
            if (!p2) {
                p2 = { name: match.p2Name, rating: 0, status: PLAYER_STATUS.NEW, initialRating: 0, initialStatus: PLAYER_STATUS.NEW, ratingChange: 0 };
                players[p2Key] = p2;
            }

            const currentRating1 = p1.rating;
            const currentRating2 = p2.rating;
            const status1 = p1.status;
            const status2 = p2.status;

            const scoreParts = match.result.split('-');
            const s1 = parseInt(scoreParts[0]);
            const s2 = parseInt(scoreParts[1]);

            // Abandoned match logic (0-0)
            if (s1 === 0 && s2 === 0) {
                processedMatches.push({
                    p1: match.p1Name,
                    p2: match.p2Name,
                    result: '0-0',
                    winner: match.p1Name, // No real winner, just for UI consistency
                    loser: match.p2Name,
                    points: 0,
                    isExpected: true,
                    winnerRatingBefore: formatRating(players[p1Key].rating, players[p1Key].status),
                    loserRatingBefore: formatRating(players[p2Key].rating, players[p2Key].status),
                    winnerRatingAfter: formatRating(players[p1Key].rating, players[p1Key].status),
                    loserRatingAfter: formatRating(players[p2Key].rating, players[p2Key].status),
                    eloDiff: Math.abs(players[p1Key].rating - players[p2Key].rating),
                    isAbandoned: true
                });
                return;
            }

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
            if (winnerStatusBefore === PLAYER_STATUS.NEW || winnerStatusBefore === PLAYER_STATUS.TEMP1 || winnerStatusBefore === PLAYER_STATUS.TEMP2) {
                // Winner is New/Temp
                if (winnerStatusBefore === PLAYER_STATUS.NEW) {
                    // Win 1
                    winnerRatingAfter = loserRatingBefore;
                    winnerStatusAfter = PLAYER_STATUS.TEMP1;
                } else if (winnerStatusBefore === PLAYER_STATUS.TEMP1) {
                    // Win 2
                    winnerRatingAfter = Math.max(winnerRatingBefore, loserRatingBefore);
                    winnerStatusAfter = PLAYER_STATUS.TEMP2;
                } else if (winnerStatusBefore === PLAYER_STATUS.TEMP2) {
                    // Win 3
                    winnerRatingAfter = Math.round((winnerRatingBefore + loserRatingBefore) / 2);
                    winnerStatusAfter = PLAYER_STATUS.PERMANENT;
                }

                // Loser logic if loser is NOT New
                if (loserStatusBefore !== PLAYER_STATUS.NEW) {
                    // Standard ELO based on numerical values
                    const { expected, unexpected } = getPoints(winnerRatingBefore - loserRatingBefore);
                    const lostPoints = (winnerRatingBefore < loserRatingBefore) ? unexpected : expected;
                    loserRatingAfter -= lostPoints;
                    pointChange = lostPoints; // For Match Analysis display
                }
            } else {
                // Winner is PERMANENT
                if (loserStatusBefore === PLAYER_STATUS.NEW) {
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
                result: `${Math.max(s1, s2)}-${Math.min(s1, s2)}`,
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
            const statusPriority = {
                [PLAYER_STATUS.PERMANENT]: 3,
                [PLAYER_STATUS.TEMP2]: 2,
                [PLAYER_STATUS.TEMP1]: 1,
                [PLAYER_STATUS.NEW]: 0
            };
            if (statusPriority[b.status] !== statusPriority[a.status]) {
                return statusPriority[b.status] - statusPriority[a.status];
            }
            return b.rating - a.rating;
        });

        setCalculatedData({
            matches: processedMatches,
            standings: finalStandings,
            bonuses: []
        });

        successNotification("Calculation complete!");
    };

    const copyToClipboard = async () => {
        if (!calculatedData) return;

        let plainText = "No.\tName\tElo Rating\tRecent Change\n";
        let htmlText = `<table border="1" style="border-collapse: collapse; font-family: sans-serif;">
            <tr style="background-color: #f3f4f6;">
                <th style="padding: 8px;">No.</th>
                <th style="padding: 8px;">Name</th>
                <th style="padding: 8px;">Elo Rating</th>
                <th style="padding: 8px;">Recent Change</th>
            </tr>`;

        calculatedData.standings.forEach((p, idx) => {
            const formattedRating = formatRating(p.rating, p.status);
            const formattedChange = p.ratingChange !== 0 ? (p.ratingChange > 0 ? `+${p.ratingChange}` : p.ratingChange) : '-';

            plainText += `${idx + 1}\t${p.name}\t${formattedRating}\t${formattedChange}\n`;
            htmlText += `<tr>
                <td style="padding: 8px; text-align: center;">${idx + 1}</td>
                <td style="padding: 8px;">${p.name}</td>
                <td style="padding: 8px; text-align: right;">${formattedRating}</td>
                <td style="padding: 8px; text-align: right; color: ${p.ratingChange > 0 ? '#16a34a' : p.ratingChange < 0 ? '#dc2626' : '#6b7280'};">${formattedChange}</td>
            </tr>`;
        });
        htmlText += '</table>';

        try {
            const textBlob = new Blob([plainText], { type: 'text/plain' });
            const htmlBlob = new Blob([htmlText], { type: 'text/html' });
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': textBlob,
                    'text/html': htmlBlob
                })
            ]);
            successNotification("Standings copied with formatting!");
        } catch (err) {
            navigator.clipboard.writeText(plainText);
            successNotification("Standings copied (plain text)!");
        }
    };

    const copyMatchesToClipboard = async () => {
        if (!calculatedData) return;

        let plainText = "Winner\tLoser\tResult\tElo Difference\tPoints\n";
        let htmlText = `<table border="1" style="border-collapse: collapse; font-family: sans-serif;">
            <tr style="background-color: #f3f4f6;">
                <th style="padding: 8px;">Winner</th>
                <th style="padding: 8px;">Loser</th>
                <th style="padding: 8px;">Result</th>
                <th style="padding: 8px;">Elo Difference</th>
                <th style="padding: 8px;">Points</th>
            </tr>`;

        calculatedData.matches.forEach((match) => {
            const winnerInfo = `${match.winner}\n${match.winnerRatingBefore} → ${match.winnerRatingAfter}`;
            const loserInfo = `${match.loser}\n${match.loserRatingBefore} → ${match.loserRatingAfter}`;

            plainText += `${match.winner} (${match.winnerRatingBefore}→${match.winnerRatingAfter})\t${match.loser} (${match.loserRatingBefore}→${match.loserRatingAfter})\t${match.result}\t${match.eloDiff}\t${match.points}\n`;

            htmlText += `<tr>
                <td style="padding: 8px; color: ${match.isAbandoned ? '#6b7280' : '#16a34a'}; font-weight: bold;">
                    <div style="font-weight: bold;">${match.winner}</div>
                    <div style="font-size: 0.8em; color: #6b7280;">${match.winnerRatingBefore} → ${match.winnerRatingAfter}</div>
                </td>
                <td style="padding: 8px; color: ${match.isAbandoned ? '#6b7280' : '#dc2626'};">
                    <div style="font-weight: bold;">${match.loser}</div>
                    <div style="font-size: 0.8em; color: #6b7280;">${match.loserRatingBefore} → ${match.loserRatingAfter}</div>
                </td>
                <td style="padding: 8px; text-align: center;">${match.result}</td>
                <td style="padding: 8px; text-align: right;">${match.eloDiff}</td>
                <td style="padding: 8px; text-align: right; font-weight: bold;">${match.points > 0 ? '+' : ''}${match.points}</td>
            </tr>`;
        });

        // Add Bonuses to clipboard
        if (calculatedData.bonuses && calculatedData.bonuses.length > 0) {
            plainText += "\n\nTournament Performance Bonus:\nPlayer\tBonus Points\n";
            htmlText += `<tr><td colspan="5" style="padding: 16px 8px 8px; font-weight: bold; background-color: #f9fafb;">Bonus</td></tr>`;

            calculatedData.bonuses.forEach(bonus => {
                plainText += `${bonus.name}\n${bonus.ratingBefore} → ${bonus.ratingAfter}\t+${bonus.points}\n`;
                htmlText += `<tr>
                    <td colspan="2" style="padding: 8px; color: #4f46e5;">
                        <div style="font-weight: bold;">${bonus.name}</div>
                        <div style="font-size: 0.8em; color: #6b7280;">${bonus.ratingBefore} → ${bonus.ratingAfter}</div>
                    </td>
                    <td colspan="2" style="padding: 8px; text-align: center;">Bonus Points</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold; color: #4f46e5;">+${bonus.points}</td>
                </tr>`;
            });
        }

        htmlText += '</table>';

        try {
            const textBlob = new Blob([plainText], { type: 'text/plain' });
            const htmlBlob = new Blob([htmlText], { type: 'text/html' });
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': textBlob,
                    'text/html': htmlBlob
                })
            ]);
            successNotification("Match analysis copied with formatting!");
        } catch (err) {
            // Fallback for older browsers
            navigator.clipboard.writeText(plainText);
            successNotification("Match analysis copied (plain text)!");
        }
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
                                placeholder={`1\tWang Chuqin\t2340\n2\tLin Shidong\t2331...`}
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
                                placeholder={`Timo Boll\tHarimoto\t3-0\n...`}
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
                                <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                    <Typography variant="h6" fontWeight="bold">Match Analysis</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexGrow: 1, justifyContent: 'flex-end' }}>
                                        <TextField
                                            size="small"
                                            placeholder="Search name..."
                                            value={matchSearch}
                                            onChange={(e) => setMatchSearch(e.target.value)}
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
                                                <TableCell align="right">Elo Difference</TableCell>
                                                <TableCell align="right">Points</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {calculatedData.matches
                                                .filter(match => {
                                                    const searchStr = matchSearch.trim().toLowerCase();
                                                    return !searchStr ||
                                                        match.winner.toLowerCase().includes(searchStr) ||
                                                        match.loser.toLowerCase().includes(searchStr);
                                                })
                                                .map((match, idx) => (
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
                                                                <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
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

                        {/* Applied Bonuses Section */}
                        {calculatedData.bonuses && calculatedData.bonuses.length > 0 && (
                            <Box>
                                <Paper elevation={3} sx={{ p: 0, overflow: 'hidden', borderRadius: 4, bgcolor: 'background.paper' }}>
                                    <Box sx={{ p: 2, bgcolor: 'rgba(79, 70, 229, 0.05)', borderBottom: '1px solid divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Plus size={18} color="#4f46e5" />
                                        <Typography variant="h6" fontWeight="bold">Tournament Performance Bonus</Typography>
                                    </Box>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Player Name</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Bonus Points</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {calculatedData.bonuses.map((bonus, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                                    {bonus.name}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {bonus.ratingBefore} &rarr; {bonus.ratingAfter}
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                            +{bonus.points}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </Box>
                        )}

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
                                        <Button
                                            size="small"
                                            startIcon={<Copy size={16} />}
                                            onClick={copyToClipboard}
                                            variant="outlined"
                                            sx={{ borderRadius: 2 }}
                                        >
                                            Copy Updated Ranking
                                        </Button>
                                    </Box>
                                </Box>
                                <TableContainer sx={{ maxHeight: 600 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>#</TableCell>
                                                <TableCell>Name</TableCell>
                                                <TableCell align="right">Rating</TableCell>
                                                <TableCell align="right">Recent Change</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {calculatedData.standings
                                                .filter(p => p.name.toLowerCase().includes(standingsSearch.trim().toLowerCase()))
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
            <Dialog
                open={bonusDialogOpen}
                onClose={() => setBonusDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        width: isMobile ? '97%' : undefined,
                        maxHeight: isMobile ? '95vh' : undefined,
                        margin: isMobile ? '8px' : undefined
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 'bold' }}>Add Bonus Points</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Select players and enter bonus points (Max 4 players).
                    </Typography>
                    <Stack spacing={2}>
                        {bonusRows.map((row, index) => (
                            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Autocomplete
                                    fullWidth
                                    size="small"
                                    options={calculatedData?.standings || []}
                                    getOptionLabel={(option) => option.name}
                                    value={row.player}
                                    onChange={(_, newValue) => handleBonusRowChange(index, 'player', newValue)}
                                    renderInput={(params) => <TextField {...params} label="Select Player" />}
                                />
                                <TextField
                                    label="Points"
                                    size="small"
                                    type="number"
                                    value={row.points}
                                    onChange={(e) => handleBonusRowChange(index, 'points', e.target.value)}
                                    sx={{ width: 120 }}
                                />
                                {bonusRows.length > 1 && (
                                    <IconButton onClick={() => handleRemoveBonusRow(index)} color="error" size="small">
                                        <Trash2 size={18} />
                                    </IconButton>
                                )}
                            </Box>
                        ))}
                    </Stack>
                    {bonusRows.length < 4 && (
                        <Button
                            startIcon={<Plus size={16} />}
                            onClick={handleAddBonusRow}
                            sx={{ mt: 2 }}
                            size="small"
                        >
                            Add Player Row
                        </Button>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <Button onClick={() => setBonusDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleBonusSubmit}
                        variant="contained"
                        color="primary"
                        disabled={!bonusRows.some(r => r.player && r.points)}
                    >
                        Apply Bonus
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default GttEloCalculator;
