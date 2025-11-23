import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadRankingAsync, updateRankingAsync } from '../store/appSlice';
import {
    TextField,
    Autocomplete,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Box,
    Chip,
    IconButton
} from '@mui/material';
import { Upload, Lock, AlertTriangle, X } from 'lucide-react';
import './RankSubmission.scss';

const RankSubmission = ({ initialData, onCancel }) => {
    const dispatch = useDispatch();
    const { allPlayers } = useSelector(state => state.app);

    // Form State
    const [cupChampion, setCupChampion] = useState(null);
    const [cupRunnerUp, setCupRunnerUp] = useState(null);
    const [cupSemis, setCupSemis] = useState([]);
    const [cupQuarters, setCupQuarters] = useState([]);

    const [plateChampion, setPlateChampion] = useState(null);
    const [plateRunnerUp, setPlateRunnerUp] = useState(null);
    const [plateSemis, setPlateSemis] = useState([]);
    const [plateQuarters, setPlateQuarters] = useState([]);

    const [tournamentDate, setTournamentDate] = useState(new Date().toISOString().split('T')[0]);

    // Populate form if editing
    useEffect(() => {
        if (initialData) {
            setTournamentDate(initialData.date);

            // Helper to find players by rank/rating
            const findPlayers = (rating) => {
                const group = initialData.ranks.find(r => r.rating === rating);
                return group ? group.players : [];
            };

            setCupChampion(findPlayers(1)[0] || null);
            setCupRunnerUp(findPlayers(2)[0] || null);
            setCupSemis(findPlayers(3));
            setCupQuarters(findPlayers(4));

            setPlateChampion(findPlayers(5)[0] || null);
            setPlateRunnerUp(findPlayers(6)[0] || null);
            setPlateSemis(findPlayers(7));
            setPlateQuarters(findPlayers(8));
        }
    }, [initialData]);

    // Upload State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        // Basic Validation
        if (!cupChampion || !cupRunnerUp) {
            alert("Cup Champion and Runner Up are required!");
            return;
        }
        setShowPasswordModal(true);
    };

    const buildTournamentData = () => {
        const ranks = [];

        // Cup (Ranks 1, 2, 3, 5)
        if (cupChampion) ranks.push({ rank: 1, rating: 1, players: [cupChampion] });
        if (cupRunnerUp) ranks.push({ rank: 2, rating: 2, players: [cupRunnerUp] });
        if (cupSemis.length > 0) ranks.push({ rank: 3, rating: 3, players: cupSemis });
        if (cupQuarters.length > 0) ranks.push({ rank: 5, rating: 4, players: cupQuarters });

        // Plate (Ranks 9, 10, 11, 13)
        if (plateChampion) ranks.push({ rank: 9, rating: 5, players: [plateChampion] });
        if (plateRunnerUp) ranks.push({ rank: 10, rating: 6, players: [plateRunnerUp] });
        if (plateSemis.length > 0) ranks.push({ rank: 11, rating: 7, players: plateSemis });
        if (plateQuarters.length > 0) ranks.push({ rank: 13, rating: 8, players: plateQuarters });

        return {
            id: initialData ? initialData.id : `t_${tournamentDate.replace(/-/g, '_')}`,
            date: tournamentDate,
            ranks: ranks
        };
    };

    const confirmUpload = async () => {
        if (password !== "ss_admin_panel") {
            alert("Incorrect Password!");
            return;
        }

        setIsSubmitting(true);
        try {
            const data = buildTournamentData();
            if (initialData) {
                await dispatch(updateRankingAsync({ id: initialData.id, tournamentData: data, password })).unwrap();
                alert("Ranking Updated Successfully! 🔄");
                if (onCancel) onCancel();
            } else {
                await dispatch(uploadRankingAsync({ tournamentData: data, password })).unwrap();
                alert("Ranking Uploaded Successfully! 🏆");

                // Reset Form
                setCupChampion(null);
                setCupRunnerUp(null);
                setCupSemis([]);
                setCupQuarters([]);
                setPlateChampion(null);
                setPlateRunnerUp(null);
                setPlateSemis([]);
                setPlateQuarters([]);
                setPassword('');
            }
            setShowPasswordModal(false);
        } catch (err) {
            alert(`Upload Failed: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="rank-submission">
            <div className="header">
                <h3><Upload size={20} /> {initialData ? 'Update Tournament Results' : 'Submit Tournament Results'}</h3>
                {initialData && (
                    <IconButton onClick={onCancel} size="small" style={{ color: '#94a3b8' }}>
                        <X />
                    </IconButton>
                )}
                {!initialData && (
                    <input
                        type="date"
                        value={tournamentDate}
                        onChange={(e) => setTournamentDate(e.target.value)}
                        className="date-input"
                    />
                )}
            </div>

            <div className="sections-container">
                {/* CUP SECTION */}
                <div className="section cup-section">
                    <Typography variant="h6" className="section-title">🏆 Cup</Typography>

                    <Box className="form-group">
                        <Autocomplete
                            options={allPlayers}
                            value={cupChampion}
                            onChange={(e, v) => setCupChampion(v)}
                            renderInput={(params) => <TextField {...params} label="Champion" variant="filled" />}
                        />
                        <Autocomplete
                            options={allPlayers}
                            value={cupRunnerUp}
                            onChange={(e, v) => setCupRunnerUp(v)}
                            renderInput={(params) => <TextField {...params} label="Runner Up" variant="filled" />}
                        />
                        <Autocomplete
                            multiple
                            options={allPlayers}
                            value={cupSemis}
                            onChange={(e, v) => setCupSemis(v)}
                            renderInput={(params) => <TextField {...params} label="Semi Finalists" variant="filled" />}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip label={option} {...getTagProps({ index })} size="small" />
                                ))
                            }
                        />
                        <Autocomplete
                            multiple
                            options={allPlayers}
                            value={cupQuarters}
                            onChange={(e, v) => setCupQuarters(v)}
                            renderInput={(params) => <TextField {...params} label="Quarter Finalists" variant="filled" />}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip label={option} {...getTagProps({ index })} size="small" />
                                ))
                            }
                        />
                    </Box>
                </div>

                {/* PLATE SECTION */}
                <div className="section plate-section">
                    <Typography variant="h6" className="section-title">🛡️ Plate</Typography>

                    <Box className="form-group">
                        <Autocomplete
                            options={allPlayers}
                            value={plateChampion}
                            onChange={(e, v) => setPlateChampion(v)}
                            renderInput={(params) => <TextField {...params} label="Champion" variant="filled" />}
                        />
                        <Autocomplete
                            options={allPlayers}
                            value={plateRunnerUp}
                            onChange={(e, v) => setPlateRunnerUp(v)}
                            renderInput={(params) => <TextField {...params} label="Runner Up" variant="filled" />}
                        />
                        <Autocomplete
                            multiple
                            options={allPlayers}
                            value={plateSemis}
                            onChange={(e, v) => setPlateSemis(v)}
                            renderInput={(params) => <TextField {...params} label="Semi Finalists" variant="filled" />}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip label={option} {...getTagProps({ index })} size="small" />
                                ))
                            }
                        />
                        <Autocomplete
                            multiple
                            options={allPlayers}
                            value={plateQuarters}
                            onChange={(e, v) => setPlateQuarters(v)}
                            renderInput={(params) => <TextField {...params} label="Quarter Finalists" variant="filled" />}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip label={option} {...getTagProps({ index })} size="small" />
                                ))
                            }
                        />
                    </Box>
                </div>
            </div>

            <Button
                variant="contained"
                color={initialData ? "secondary" : "primary"}
                fullWidth
                onClick={handleSubmit}
                className="submit-btn"
                startIcon={<Upload />}
            >
                {initialData ? 'Update Results' : 'Upload Results'}
            </Button>

            {/* Password Dialog */}
            <Dialog open={showPasswordModal} onClose={() => setShowPasswordModal(false)}>
                <DialogTitle>Admin Access</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Password"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                    <Button onClick={confirmUpload} variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? 'Uploading...' : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default RankSubmission;
