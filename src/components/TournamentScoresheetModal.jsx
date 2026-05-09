import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    TextField,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider,
    Grid,
    Tooltip,
} from '@mui/material';
import { 
    X, 
    Copy, 
    ExternalLink, 
    Download, 
    Printer, 
    PlayCircle,
    Info,
    ClipboardList
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import './TournamentScoresheetModal.scss';

const SAMPLE_INPUT = `Group 1:
Dibya Joti Podder
Adittya
Eshan
S M Raisuzzaman
Mohammad Hanif

Group 2:
Samir
Qazi Asif (CCCL)
Arshad Hossain (Inovi Solutions)
Faisul Alam Sunny
Abdullah Noman

Group 3:
Mashuq
Ayan
Auni
Adri (BU)
Abu Nasar

Group 4:
Mustafa Jain (CCCL)
Jubayer
Shahidul Islam
Sourav Majumder
Nazmus Tahsan
Eftekhar Alom

Group 5:
Snigdho
Ahsan Rahman (FSC)
Zia
Dr. Rashed
Mir Mohammad Efaz
Orhan Rahman

Group 6:
Abdullah
Sharif Jubaer (bKash)
Hasnu
Nipon
Zahidul Islam
Mahtab Hossain Faiaz`;

const TournamentScoresheetModal = ({ open, onClose, tournament }) => {
    const { successNotification, errorNotification } = useToast();
    const [playerInput, setPlayerInput] = useState('');
    const [r16Matches, setR16Matches] = useState(8);
    const [qfMatches, setQFMatches] = useState(4);
    const [rowsPerPage, setRowsPerPage] = useState(4);
    const [generating, setGenerating] = useState(false);

    const scoresheetRef = useRef(null);

    useEffect(() => {
        if (!open) {
            setPlayerInput('');
        }
    }, [open]);

    const promptText = `List down all the players names group by group below.
Format:
Group 1:
1. Player 1
2. Player 2
....

Group 2:
1. Player 3
2. Player 4
....

Same for all the groups`;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(promptText);
        successNotification('Prompt copied to clipboard!');
    };

    const handleTryDummy = () => {
        setPlayerInput(SAMPLE_INPUT);
    };

    const parsePlayers = (input) => {
        const groups = [];
        const lines = input.split('\n');
        let currentGroup = null;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            if (trimmed.toLowerCase().startsWith('group')) {
                currentGroup = {
                    name: trimmed.endsWith(':') ? trimmed.slice(0, -1) : trimmed,
                    players: []
                };
                groups.push(currentGroup);
            } else if (currentGroup) {
                // Remove numbering like "1. ", "1) ", etc.
                const playerName = trimmed.replace(/^\d+[\s\.)]+/, '').trim();
                if (playerName) {
                    currentGroup.players.push(playerName);
                }
            }
        });
        return groups;
    };

    const generateMatches = () => {
        const groups = parsePlayers(playerInput);
        let matches = [];

        // Group Rounds
        groups.forEach(group => {
            const players = group.players;
            for (let i = 0; i < players.length; i++) {
                for (let j = i + 1; j < players.length; j++) {
                    matches.push({
                        title: group.name,
                        player1: players[i],
                        player2: players[j],
                        isKnockout: false
                    });
                }
            }
        });

        // Knockout Rounds
        const addKnockout = (count, label) => {
            for (let i = 0; i < count; i++) {
                matches.push({
                    title: label,
                    player1: '',
                    player2: '',
                    isKnockout: true
                });
            }
        };

        addKnockout(Number(r16Matches) || 0, 'Round of 16');
        addKnockout(Number(qfMatches) || 0, 'Quarter Final');
        addKnockout(2, 'Semi Final');
        addKnockout(1, 'Final');

        return matches;
    };

    const handleGenerate = async (mode = 'download') => {
        if (!playerInput.trim()) {
            errorNotification('Please provide the player list.');
            return;
        }

        setGenerating(true);
        try {
            const matches = generateMatches();
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            const margin = 10;
            const availableWidth = pageWidth - (2 * margin);
            const availableHeight = pageHeight - (2 * margin);
            
            const cellWidth = availableWidth;
            const rowsCount = Number(rowsPerPage) || 1;
            const cellHeight = availableHeight / rowsCount;

            // Prepare the template in the DOM
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            document.body.appendChild(container);

            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                const rowsCount = Number(rowsPerPage) || 1;
                const matchIdx = i % rowsCount;
                
                if (i > 0 && matchIdx === 0) {
                    pdf.addPage();
                }

                const col = 0;
                const row = matchIdx;

                // Create scoresheet HTML
                const sheetDiv = document.createElement('div');
                sheetDiv.className = 'scoresheet-template';
                sheetDiv.innerHTML = `
                    <div class="scoresheet-card">
                        <div class="scoresheet-header">
                            <span class="match-title">${match.title}</span>
                            <span class="tournament-name">${tournament?.category || 'Tournament'}</span>
                        </div>
                        <div class="scoresheet-table">
                            <div class="table-row">
                                <div class="table-cell input-cell"></div>
                                <div class="table-cell name-cell">
                                    <span class="player-name">${match.player1 || ''}</span>
                                </div>
                                <div class="table-cell score-cell"></div>
                                <div class="table-cell score-cell"></div>
                                <div class="table-cell score-cell"></div>
                                <div class="table-cell score-cell"></div>
                                <div class="table-cell score-cell"></div>
                            </div>
                            <div class="table-row">
                                <div class="table-cell input-cell"></div>
                                <div class="table-cell name-cell">
                                    <span class="player-name">${match.player2 || ''}</span>
                                </div>
                                <div class="table-cell score-cell"></div>
                                <div class="table-cell score-cell"></div>
                                <div class="table-cell score-cell"></div>
                                <div class="table-cell score-cell"></div>
                                <div class="table-cell score-cell"></div>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(sheetDiv);

                const dataUrl = await toPng(sheetDiv, { pixelRatio: 2 });
                
                const x = margin + (col * cellWidth);
                const y = margin + (row * cellHeight);
                
                // Add image to PDF. We need to fit it within cellWidth/cellHeight while maintaining aspect ratio or just filling it.
                // The template is designed to be a certain size.
                pdf.addImage(dataUrl, 'PNG', x + 2, y + 2, cellWidth - 4, cellHeight - 4);
                
                container.removeChild(sheetDiv);
            }

            document.body.removeChild(container);

            if (mode === 'download') {
                pdf.save(`${tournament?.category || 'tournament'}_scoresheets.pdf`);
                successNotification('Scoresheets generated and downloaded!');
            } else {
                window.open(pdf.output('bloburl'), '_blank');
            }
        } catch (err) {
            console.error(err);
            errorNotification('Failed to generate PDF.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            className="tournament-scoresheet-modal"
        >
            <DialogTitle className="modal-header">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ClipboardList size={24} />
                    <Typography variant="h6">Generate Tournament Scoresheets</Typography>
                </Box>
                <IconButton onClick={onClose} size="small" className="close-btn">
                    <X size={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent className="modal-content">
                {/* Section 1: Instructions */}
                <Box className="section-container">
                    <Typography variant="subtitle1" className="section-title">
                        Step 1: Get Player List
                    </Typography>
                    <Box className="instruction-box">
                        <Typography variant="body2" color="text.secondary">
                            1. Go to <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer">Gemini <ExternalLink size={14} /></a> and upload the screenshot of the tournament's draw page.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            2. Copy and paste this prompt to generate the player list in the required format:
                        </Typography>
                        <Box className="prompt-container">
                            <pre>{promptText}</pre>
                            <Button 
                                size="small" 
                                startIcon={<Copy size={16} />} 
                                onClick={handleCopyPrompt}
                                className="copy-btn"
                            >
                                Copy Prompt
                            </Button>
                        </Box>
                    </Box>
                </Box>

                {/* Section 2: Input */}
                <Box className="section-container">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" className="section-title">
                            Step 2: Group Round Input
                        </Typography>
                        <Button 
                            size="small" 
                            startIcon={<PlayCircle size={16} />} 
                            onClick={handleTryDummy}
                            variant="text"
                            color="primary"
                        >
                            Try with dummy data
                        </Button>
                    </Box>
                    <TextField
                        multiline
                        rows={6}
                        fullWidth
                        placeholder="Paste the player list here..."
                        value={playerInput}
                        onChange={(e) => setPlayerInput(e.target.value)}
                        variant="outlined"
                        className="player-input"
                    />
                </Box>

                {/* Section 3: Knockout */}
                <Box className="section-container">
                    <Typography variant="subtitle1" className="section-title">
                        Step 3: Knockout Rounds
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                label="Round of 16"
                                type="number"
                                fullWidth
                                size="small"
                                value={r16Matches}
                                onChange={(e) => setR16Matches(e.target.value === '' ? '' : parseInt(e.target.value))}
                                sx={{ width: 210 }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                label="Quarter Final"
                                type="number"
                                fullWidth
                                size="small"
                                value={qfMatches}
                                onChange={(e) => setQFMatches(e.target.value === '' ? '' : parseInt(e.target.value))}
                                sx={{ width: 210 }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                label="Semi Final"
                                value="2"
                                disabled
                                size="small"
                                sx={{ width: 210 }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                label="Final"
                                value="1"
                                disabled
                                size="small"
                                sx={{ width: 210 }}
                            />
                        </Grid>
                    </Grid>
                </Box>

                {/* Section 4: Print Options */}
                <Box className="section-container">
                    <Typography variant="subtitle1" className="section-title">
                        Step 4: Layout & Generation
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="Rows per page"
                                type="number"
                                size="small"
                                value={rowsPerPage}
                                onChange={(e) => setRowsPerPage(e.target.value === '' ? '' : parseInt(e.target.value))}
                                inputProps={{ min: 1, max: 20 }}
                                sx={{ width: 210 }}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>

            <DialogActions className="modal-actions">
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button 
                    variant="outlined" 
                    startIcon={<Printer size={18} />} 
                    onClick={() => handleGenerate('print')}
                    disabled={generating}
                >
                    Print View
                </Button>
                <Button 
                    variant="contained" 
                    startIcon={<Download size={18} />} 
                    onClick={() => handleGenerate('download')}
                    disabled={generating}
                >
                    {generating ? 'Generating...' : 'Download PDF'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TournamentScoresheetModal;
