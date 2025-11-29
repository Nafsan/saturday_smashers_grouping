import React, { useState, useEffect } from 'react';
import { TextField, Button, Alert, Autocomplete } from '@mui/material';
import { fetchPlayers, recordPayment } from '../api/client';
import { DollarSign, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RecordPayment = () => {
    const navigate = useNavigate();
    const [allPlayers, setAllPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const [playerName, setPlayerName] = useState('');
    const [amount, setAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

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
        if (!playerName) {
            setMessage({ type: 'error', text: 'Please select a player' });
            return;
        }

        if (amount <= 0) {
            setMessage({ type: 'error', text: 'Amount must be greater than 0' });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);
            const result = await recordPayment({
                player_name: playerName,
                amount: amount,
                payment_date: paymentDate,
                notes: notes || null
            }, 'ss_admin_panel');

            setMessage({
                type: 'success',
                text: `${result.message}. New balance: ৳${result.new_balance.toFixed(2)}`
            });

            // Reset form
            setPlayerName('');
            setAmount(0);
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setNotes('');

            // Redirect after 2 seconds
            setTimeout(() => {
                navigate('/fund');
            }, 2000);
        } catch (error) {
            console.error('Error recording payment:', error);
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to record payment' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Record Player Payment</h2>

            {message && (
                <Alert severity={message.type} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Autocomplete
                    options={allPlayers}
                    value={playerName}
                    onChange={(e, newValue) => setPlayerName(newValue || '')}
                    renderInput={(params) => (
                        <TextField {...params} label="Player Name" required />
                    )}
                />

                <TextField
                    fullWidth
                    label="Payment Amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    InputProps={{
                        startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                    }}
                    required
                />

                <TextField
                    fullWidth
                    label="Payment Date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    required
                />

                <TextField
                    fullWidth
                    label="Notes (Optional)"
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Bkash payment, Cash payment, etc."
                />

                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={<Save size={20} />}
                    sx={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': {
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        }
                    }}
                >
                    {saving ? 'Recording...' : 'Record Payment'}
                </Button>
            </div>
        </div>
    );
};

export default RecordPayment;
