import React, { useState, useEffect } from 'react';
import { TextField, Button, Alert, Autocomplete } from '@mui/material';
import { fetchPlayers, seedInitialData, fetchFundBalances } from '../api/client';
import { Plus, Trash2, Save, Edit } from 'lucide-react';

const SeedInitialData = () => {
    const [allPlayers, setAllPlayers] = useState([]);
    const [existingBalances, setExistingBalances] = useState([]);
    const [playerData, setPlayerData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [players, balances] = await Promise.all([
                fetchPlayers(),
                fetchFundBalances()
            ]);
            setAllPlayers(players.map(p => p.name));
            setExistingBalances(balances);
        } catch (error) {
            console.error('Error loading data:', error);
            setMessage({ type: 'error', text: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const addPlayer = () => {
        setPlayerData([...playerData, {
            player_name: '',
            current_balance: 0,
            days_played: 0,
            total_paid: 0,
            total_cost: 0
        }]);
    };

    const editExistingPlayer = (playerName) => {
        const existingData = existingBalances.find(b => b.player_name === playerName);
        if (existingData) {
            setPlayerData([...playerData, {
                player_name: existingData.player_name,
                current_balance: existingData.current_balance,
                days_played: existingData.days_played,
                total_paid: existingData.total_paid,
                total_cost: existingData.total_cost
            }]);
        }
    };

    const removePlayer = (index) => {
        setPlayerData(playerData.filter((_, i) => i !== index));
    };

    const updatePlayer = (index, field, value) => {
        const updated = [...playerData];
        updated[index][field] = value;
        setPlayerData(updated);
    };

    const handleSave = async () => {
        if (playerData.length === 0) {
            setMessage({ type: 'error', text: 'Please add at least one player' });
            return;
        }

        for (const player of playerData) {
            if (!player.player_name) {
                setMessage({ type: 'error', text: 'All players must have a name' });
                return;
            }
        }

        try {
            setSaving(true);
            setMessage(null);
            await seedInitialData({ players: playerData }, 'ss_admin_panel');
            setMessage({ type: 'success', text: 'Data saved successfully!' });
            setPlayerData([]);
            const balances = await fetchFundBalances();
            setExistingBalances(balances);
        } catch (error) {
            console.error('Error saving data:', error);
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save data' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Seed/Edit Player Data</h2>

            {message && (
                <Alert severity={message.type} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <Button
                    variant="outlined"
                    onClick={addPlayer}
                    startIcon={<Plus size={20} />}
                >
                    Add New Player
                </Button>

                {existingBalances.length > 0 && (
                    <Autocomplete
                        options={existingBalances.map(b => b.player_name)}
                        onChange={(e, value) => value && editExistingPlayer(value)}
                        renderInput={(params) => (
                            <TextField {...params} label="Edit Existing Player" placeholder="Select player to edit" />
                        )}
                        sx={{ minWidth: 300 }}
                    />
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {playerData.map((player, index) => (
                    <div
                        key={index}
                        style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            position: 'relative'
                        }}
                    >
                        <button
                            onClick={() => removePlayer(index)}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '0.5rem'
                            }}
                        >
                            <Trash2 size={20} />
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <Autocomplete
                                options={allPlayers}
                                value={player.player_name}
                                onChange={(e, newValue) => updatePlayer(index, 'player_name', newValue || '')}
                                renderInput={(params) => (
                                    <TextField {...params} label="Player Name" required />
                                )}
                            />

                            <TextField
                                label="Current Balance"
                                type="number"
                                value={player.current_balance}
                                onChange={(e) => updatePlayer(index, 'current_balance', parseFloat(e.target.value) || '')}
                                InputProps={{
                                    startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                                }}
                            />

                            <TextField
                                label="Days Played"
                                type="number"
                                value={player.days_played}
                                onChange={(e) => updatePlayer(index, 'days_played', parseInt(e.target.value) || '')}
                            />

                            <TextField
                                label="Total Paid"
                                type="number"
                                value={player.total_paid}
                                onChange={(e) => updatePlayer(index, 'total_paid', parseFloat(e.target.value) || '')}
                                InputProps={{
                                    startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                                }}
                            />

                            <TextField
                                label="Total Cost"
                                type="number"
                                value={player.total_cost}
                                onChange={(e) => updatePlayer(index, 'total_cost', parseFloat(e.target.value) || '')}
                                InputProps={{
                                    startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {playerData.length > 0 && (
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={<Save size={20} />}
                    sx={{
                        mt: 3,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': {
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        }
                    }}
                >
                    {saving ? 'Saving...' : 'Save Data'}
                </Button>
            )}
        </div>
    );
};

export default SeedInitialData;
