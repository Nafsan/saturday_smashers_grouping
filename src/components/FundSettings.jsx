import React, { useState, useEffect } from 'react';
import { TextField, Button, Alert } from '@mui/material';
import { fetchFundSettings, updateFundSettings } from '../api/client';
import { Save } from 'lucide-react';

const FundSettings = () => {
    const [settings, setSettings] = useState({
        default_venue_fee: 0,
        default_ball_fee: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await fetchFundSettings();
            setSettings({
                default_venue_fee: data.default_venue_fee,
                default_ball_fee: data.default_ball_fee
            });
        } catch (error) {
            console.error('Error loading settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);
            await updateFundSettings(settings, 'ss_admin_panel');
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div>Loading settings...</div>;
    }

    return (
        <div style={{ maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Fund Settings</h2>

            {message && (
                <Alert severity={message.type} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <TextField
                    fullWidth
                    label="Default Venue Fee (per person)"
                    type="number"
                    value={settings.default_venue_fee}
                    onChange={(e) => setSettings({ ...settings, default_venue_fee: parseFloat(e.target.value) || 0 })}
                    InputProps={{
                        startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                    }}
                />

                <TextField
                    fullWidth
                    label="Default Ball Fee (per ball)"
                    type="number"
                    value={settings.default_ball_fee}
                    onChange={(e) => setSettings({ ...settings, default_ball_fee: parseFloat(e.target.value) || 0 })}
                    InputProps={{
                        startAdornment: <span style={{ marginRight: '0.5rem' }}>৳</span>
                    }}
                />

                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={<Save size={20} />}
                    sx={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': {
                            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        }
                    }}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
};

export default FundSettings;
