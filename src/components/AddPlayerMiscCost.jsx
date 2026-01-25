import React, { useState, useEffect } from 'react';
import { TextField, Button, Alert, Autocomplete } from '@mui/material';
import { fetchPlayers, addPlayerMiscCost } from '../api/client';
import { Receipt, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AddPlayerMiscCost = () => {
    const navigate = useNavigate();
    const [allPlayers, setAllPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [costAmount, setCostAmount] = useState(0);
    const [costDescription, setCostDescription] = useState('');
    const [costDate, setCostDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        try {
            setLoading(true);
            const players = await fetchPlayers();
            setAllPlayers(players.map(p => p.name));
        } catch (error) {
            console.error('Error loading players:', error);
            setMessage({ type: 'error', text: 'Failed to load players' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (selectedPlayers.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one player' });
            return;
        }

        if (costAmount <= 0) {
            setMessage({ type: 'error', text: 'Cost amount must be greater than 0' });
            return;
        }

        if (!costDescription) {
            setMessage({ type: 'error', text: 'Please provide a cost description' });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);
            const result = await addPlayerMiscCost({
                player_names: selectedPlayers,
                cost_amount: costAmount,
                cost_description: costDescription,
                cost_date: costDate
            }, 'ss_admin_panel');

            setMessage({
                type: 'success',
                text: result.message
            });

            // Reset form
            setSelectedPlayers([]);
            setCostAmount(0);
            setCostDescription('');
            setCostDate(new Date().toISOString().split('T')[0]);

            // Redirect after 2 seconds
            setTimeout(() => {
                navigate('/fund');
            }, 2000);
        } catch (error) {
            console.error('Error adding misc cost:', error);
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add miscellaneous cost' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ maxWidth: '700px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Add Player Miscellaneous Cost</h2>

            {message && (
                <Alert severity={message.type} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Autocomplete
                    multiple
                    options={allPlayers}
                    value={selectedPlayers}
                    onChange={(e, newValue) => setSelectedPlayers(newValue)}
                    renderInput={(params) => (
                        <TextField {...params} label="Select Players" required placeholder="Choose one or more players" />
                    )}
                />

                <TextField
                    fullWidth
                    label="Cost Amount (per player)"
                    type="number"
                    value={costAmount}
                    onChange={(e) => setCostAmount(parseFloat(e.target.value) || '')}
                    InputProps={{
                        startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                    }}
                    required
                    helperText={selectedPlayers.length > 0 ? `Total cost: ৳${(costAmount * selectedPlayers.length).toFixed(2)} (${selectedPlayers.length} player${selectedPlayers.length > 1 ? 's' : ''})` : ''}
                />

                <TextField
                    fullWidth
                    label="Cost Description"
                    value={costDescription}
                    onChange={(e) => setCostDescription(e.target.value)}
                    placeholder="e.g., WTT Ball purchase, Venue decoration, Trophy cost, etc."
                    required
                />

                <TextField
                    fullWidth
                    label="Cost Date"
                    type="date"
                    value={costDate}
                    onChange={(e) => setCostDate(e.target.value)}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    required
                />

                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={<Save size={20} />}
                    sx={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': {
                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                        }
                    }}
                >
                    {saving ? 'Adding Cost...' : 'Add Miscellaneous Cost'}
                </Button>
            </div>
        </div>
    );
};

export default AddPlayerMiscCost;
