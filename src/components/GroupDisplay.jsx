import React, { useRef, useCallback, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { generateGroupsAction, resetGroups, clearDraftState } from '../store/appSlice';
import { generateKnockoutFixtures } from '../logic/knockout';
import { toPng } from 'html-to-image';
import { Download, RefreshCw, ArrowLeft, Trophy, Medal, FileImage, Layers } from 'lucide-react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Menu, MenuItem, ListItemIcon, ListItemText, useMediaQuery } from '@mui/material';
import ThemeToggle from './ThemeToggle';
import './GroupDisplay.scss';

const GroupDisplay = () => {
    const { groups, rankedPlayers, tournamentDate } = useSelector(state => state.app);
    const dispatch = useDispatch();
    const isMobile = useMediaQuery('(max-width:600px)');
    const exportRef = useRef(null); // Main container (for full export)
    const groupsRef = useRef(null); // Specific groups container
    const knockoutRef = useRef(null); // Specific bracket container
    const [showBackConfirmation, setShowBackConfirmation] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const openExportMenu = Boolean(anchorEl);

    const fixtures = useMemo(() => {
        // Only generate knockout for 2 groups
        const groupCount = Object.keys(groups).length;
        if (groupCount !== 2) return { cup: [], plate: [] };
        
        const totalPlayers = (groups.groupA?.length || 0) + (groups.groupB?.length || 0);
        return generateKnockoutFixtures(totalPlayers);
    }, [groups]);

    // Consolidated Export Handler
    const handleExport = useCallback((type) => {
        // Close menu first
        setAnchorEl(null);

        let node = null;
        let filename = '';
        const dateStr = new Date().toISOString().slice(0, 10);

        if (type === 'groups') {
            node = exportRef.current;
            filename = `saturday-smashers-groups-${dateStr}.png`;
        } else if (type === 'bracket') {
            node = knockoutRef.current;
            filename = `saturday-smashers-bracket-${dateStr}.png`;
        } else if (type === 'all') {
            node = exportRef.current;
            filename = `saturday-smashers-full-export-${dateStr}.png`;
        }

        if (!node) return;

        const config = {
            cacheBust: true,
            backgroundColor: '#0f172a',
            style: { padding: '20px' },
            width: node.scrollWidth + 40,
            height: node.scrollHeight + 40,
            filter: (domNode) => {
                // For 'groups' export, exclude the knockout section
                if (type === 'groups' && domNode.classList?.contains('knockout-section')) {
                    return false;
                }
                // For 'groups' export, exclude rankings summary if desired (optional)
                if (type === 'groups' && domNode.classList?.contains('rankings-summary')) {
                    return false;
                }
                return true;
            }
        };

        toPng(node, config)
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = filename;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
            });
    }, [exportRef, knockoutRef]);

    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleBackClick = () => {
        setShowBackConfirmation(true);
    };

    const handleConfirmBack = () => {
        dispatch(clearDraftState());
        dispatch(resetGroups());
        setShowBackConfirmation(false);
    };

    return (
        <div className="group-display">
            <div className="actions-bar">
                <button className="icon-btn" onClick={handleBackClick}>
                    <ArrowLeft size={20} /> Back
                </button>
                <div className="right-actions">
                    <ThemeToggle />
                    <button className="icon-btn" onClick={() => dispatch(generateGroupsAction(Object.keys(groups).length))}>
                        <RefreshCw size={20} /> Shuffle
                    </button>

                    <button
                        className="icon-btn primary"
                        onClick={handleMenuClick}
                        aria-controls={openExportMenu ? 'export-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={openExportMenu ? 'true' : undefined}
                    >
                        <Download size={20} /> Export...
                    </button>

                    <Menu
                        id="export-menu"
                        anchorEl={anchorEl}
                        open={openExportMenu}
                        onClose={handleMenuClose}
                        MenuListProps={{
                            'aria-labelledby': 'export-button',
                        }}
                        PaperProps={{
                            sx: {
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-main)',
                                boxShadow: 'var(--shadow-lg)',
                                '& .MuiMenuItem-root': {
                                    gap: 1,
                                    '&:hover': {
                                        backgroundColor: 'var(--bg-surface-soft)',
                                    }
                                }
                            }
                        }}
                    >
                        <MenuItem onClick={() => handleExport('groups')}>
                            <ListItemIcon sx={{ minWidth: 'auto', color: 'inherit' }}>
                                <FileImage size={18} />
                            </ListItemIcon>
                            <ListItemText>Export Groups Only</ListItemText>
                        </MenuItem>

                        {(fixtures.cup.length > 0 || fixtures.plate.length > 0) && (
                            <MenuItem onClick={() => handleExport('bracket')}>
                                <ListItemIcon sx={{ minWidth: 'auto', color: 'inherit' }}>
                                    <Trophy size={18} />
                                </ListItemIcon>
                                <ListItemText>Export Bracket Only</ListItemText>
                            </MenuItem>
                        )}

                        <MenuItem onClick={() => handleExport('all')}>
                            <ListItemIcon sx={{ minWidth: 'auto', color: 'inherit' }}>
                                <Layers size={18} />
                            </ListItemIcon>
                            <ListItemText>Export Full</ListItemText>
                        </MenuItem>
                    </Menu>
                </div>
            </div>

            <div className="content-to-export" ref={exportRef}>
                <div className="header">
                    <h2>This Week's Groups</h2>
                    <p>{new Date(tournamentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="groups-container" ref={groupsRef}>
                    {Object.entries(groups).map(([groupKey, groupPlayers]) => (
                        <div key={groupKey} className={`group-card ${groupKey === 'groupA' || groupKey === 'groupB' ? groupKey.replace('group', 'group-').toLowerCase() : 'group-others'}`}>
                            <h3>{groupKey.replace('group', 'Group ')}</h3>
                            <ul>
                                {groupPlayers.map((player, idx) => (
                                    <li key={player.name}>
                                        <span className="rank">#{idx + 1}</span>
                                        <span className="name">{player.name}</span>
                                        <span className="avg">({player.average.toFixed(1)})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Knockout Fixtures */}
                {(fixtures.cup.length > 0 || fixtures.plate.length > 0) && (
                    <div className="knockout-section" ref={knockoutRef}>
                        <div className="bracket-column">
                            <h3 className="cup-title"><Trophy size={18} /> Cup Round</h3>
                            {fixtures.cup.map((round, idx) => (
                                <div key={idx} className="round">
                                    <h4>{round.round}</h4>
                                    <div className="matches">
                                        {round.matches.map(m => (
                                            <div key={m.id} className="match">
                                                <span className="match-id">{m.id}</span>
                                                <div className="players">
                                                    <span>{m.p1}</span>
                                                    <span className="vs">vs</span>
                                                    <span>{m.p2}</span>
                                                </div>
                                                {m.next && <div className="next-info">→ {m.next}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bracket-column">
                            <h3 className="plate-title"><Medal size={18} /> Plate Round</h3>
                            {fixtures.plate.map((round, idx) => (
                                <div key={idx} className="round">
                                    <h4>{round.round}</h4>
                                    <div className="matches">
                                        {round.matches.map(m => (
                                            <div key={m.id} className="match">
                                                <span className="match-id">{m.id}</span>
                                                <div className="players">
                                                    <span>{m.p1}</span>
                                                    <span className="vs">vs</span>
                                                    <span>{m.p2}</span>
                                                </div>
                                                {m.next && <div className="next-info">→ {m.next}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rankings-summary">
                    <h4>Ranking Breakdown</h4>
                    <div className="rank-list">
                        {rankedPlayers.map((p, i) => (
                            <div key={p.name} className="rank-item">
                                <span className="pos">{i + 1}.</span>
                                <span className="p-name">{p.name}</span>
                                <span className="p-avg">Avg: {p.average.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Back Confirmation Dialog */}
            <Dialog
                open={showBackConfirmation}
                onClose={() => setShowBackConfirmation(false)}
                PaperProps={{
                    sx: {
                        width: isMobile ? '97%' : undefined,
                        maxHeight: isMobile ? '95vh' : undefined,
                        margin: isMobile ? '8px' : undefined
                    }
                }}
            >
                <DialogTitle>Discard Draft Changes?</DialogTitle>
                <DialogContent>
                    <Typography>
                        All draft changes including selected players and temporary players will be lost. Are you sure you want to go back?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowBackConfirmation(false)} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmBack} variant="contained" color="error">
                        Discard & Go Back
                    </Button>
                </DialogActions>
            </Dialog>
        </div >
    );
};

export default GroupDisplay;
