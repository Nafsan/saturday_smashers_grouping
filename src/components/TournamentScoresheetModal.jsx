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
            const rowsCount = Number(rowsPerPage) || 1;
            const totalPages = Math.ceil(matches.length / rowsCount);
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const cardWidth = pageWidth - (2 * margin);
            const availableHeight = pageHeight - (2 * margin);
            const cellHeight = availableHeight / rowsCount;

            for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                if (pageIdx > 0) pdf.addPage();

                const pageMatches = matches.slice(pageIdx * rowsCount, (pageIdx + 1) * rowsCount);
                
                pageMatches.forEach((match, idx) => {
                    const yPos = margin + (idx * cellHeight);
                    const cardHeight = cellHeight - 5;
                    const headerHeight = 12;
                    const tableY = yPos + headerHeight;
                    const tableHeight = cardHeight - headerHeight;
                    const rowHeight = tableHeight / 2;
                    
                    // Column Calculations
                    const col1W = cardWidth * 0.12; // Input cell
                    const scoreColW = cardWidth * 0.08; // Each score cell
                    const nameColW = cardWidth - col1W - (5 * scoreColW);

                    // 1. DRAW ALL BACKGROUNDS FIRST
                    // Header Background
                    pdf.setFillColor(249, 250, 251); // #f9fafb
                    pdf.rect(margin, yPos, cardWidth, headerHeight, 'F');
                    
                    // Input Cells Background
                    pdf.setFillColor(243, 244, 246); // #f3f4f6
                    pdf.rect(margin, tableY, col1W, tableHeight, 'F');
                    
                    // 2. DRAW ALL INTERNAL LINES
                    pdf.setDrawColor(156, 163, 175); // #9ca3af (Consistent grid color)
                    pdf.setLineWidth(0.25); // Clearer visibility
                    
                    // Header Bottom Separator
                    pdf.line(margin, tableY, margin + cardWidth, tableY);
                    
                    // Horizontal separator between players
                    pdf.line(margin, tableY + rowHeight, margin + cardWidth, tableY + rowHeight);
                    
                    // Vertical Lines (Full Height for continuity)
                    let currentX = margin + col1W;
                    pdf.line(currentX, tableY, currentX, tableY + tableHeight); // After input
                    
                    currentX += nameColW;
                    pdf.line(currentX, tableY, currentX, tableY + tableHeight); // After name
                    
                    for (let i = 0; i < 4; i++) {
                        currentX += scoreColW;
                        pdf.line(currentX, tableY, currentX, tableY + tableHeight); // Score dividers
                    }
                    
                    // 3. DRAW TEXT
                    // Match Title
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(12);
                    pdf.setTextColor(17, 24, 39); // #111827
                    pdf.text(match.title, margin + 5, yPos + 8);
                    
                    // Tournament Category
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    pdf.setTextColor(107, 114, 128); // #6b7280
                    pdf.text(tournament?.category || 'Tournament', margin + cardWidth - 5, yPos + 8, { align: 'right' });

                    const drawRowText = (pName, y) => {
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(11);
                        pdf.setTextColor(31, 41, 55); // #1f2937
                        const textY = y + (rowHeight / 2) + 1.5; 
                        pdf.text(pName, margin + col1W + 4, textY);
                    };
                    
                    drawRowText(match.player1 || '', tableY);
                    drawRowText(match.player2 || '', tableY + rowHeight);

                    // 4. DRAW OUTER BORDER LAST (Seal the card)
                    pdf.setDrawColor(75, 85, 99); // Slightly darker #4b5563 for the main frame
                    pdf.setLineWidth(0.35);
                    pdf.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'D');
                });
            }

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
