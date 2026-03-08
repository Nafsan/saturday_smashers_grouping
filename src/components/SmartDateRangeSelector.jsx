import React, { useState } from 'react';
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

export const DATE_RANGES = [
    { value: 'last_week', label: 'Last 7 Days' },
    { value: 'current_month', label: 'Current Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'next_month', label: 'Next Month' },
    { value: 'last_3_months', label: 'Last 3 Months' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'last_1_year', label: 'Last 1 Year' },
    { value: 'all_time', label: 'All Time' },
    { value: 'custom', label: 'Custom...' },
];

export const getPredefinedRange = (rangeType) => {
    const today = new Date();
    
    // adjust for timezone offset to get local YYYY-MM-DD
    const formatDate = (d) => {
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return local.toISOString().split('T')[0];
    };

    let start = new Date();
    let end = new Date();

    switch (rangeType) {
        case 'last_week':
            start.setDate(today.getDate() - 7);
            break;
        case 'current_month':
            start.setDate(1);
            end.setMonth(today.getMonth() + 1, 0);
            break;
        case 'last_month':
            start.setMonth(today.getMonth() - 1, 1);
            end.setMonth(today.getMonth(), 0);
            break;
        case 'next_month':
            start.setMonth(today.getMonth() + 1, 1);
            end.setMonth(today.getMonth() + 2, 0);
            break;
        case 'last_3_months':
            start.setMonth(today.getMonth() - 2, 1);
            end.setMonth(today.getMonth() + 2, 0); // Next month end
            break;
        case 'last_6_months':
            start.setMonth(today.getMonth() - 6, 1);
            end.setMonth(today.getMonth() + 2, 0); // Next month end
            break;
        case 'last_1_year':
            start.setFullYear(today.getFullYear() - 1, today.getMonth(), 1);
            end.setMonth(today.getMonth() + 2, 0); // Next month end
            break;
        case 'all_time':
            return { startDate: '', endDate: '' };
        default:
            return null;
    }
    
    return {
        startDate: formatDate(start),
        endDate: formatDate(end)
    };
};

const SmartDateRangeSelector = ({ startDate, endDate, onRangeChange }) => {
    // Keep track of the current mode
    const [mode, setMode] = useState('last_6_months');

    const handleModeChange = (e) => {
        const newMode = e.target.value;
        setMode(newMode);
        
        if (newMode !== 'custom') {
            const range = getPredefinedRange(newMode);
            if (range) {
                onRangeChange(range.startDate, range.endDate);
            }
        }
    };

    const handleCustomDateChange = (type, val) => {
        setMode('custom');
        onRangeChange(
            type === 'start' ? val : startDate,
            type === 'end' ? val : endDate
        );
    };

    return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <FormControl size="small" fullWidth sx={{ minWidth: 150 }}>
                <InputLabel>Date Range</InputLabel>
                <Select
                    value={mode}
                    label="Date Range"
                    onChange={handleModeChange}
                    sx={{ background: 'var(--bg-surface)' }}
                >
                    {DATE_RANGES.map((r) => (
                        <MenuItem key={r.value} value={r.value}>
                            {r.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {mode === 'custom' && (
                <>
                    <TextField
                        label="From"
                        type="date"
                        value={startDate}
                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        sx={{ minWidth: 150, background: 'var(--bg-surface)' }}
                    />
                    <TextField
                        label="To"
                        type="date"
                        value={endDate}
                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        sx={{ minWidth: 150, background: 'var(--bg-surface)' }}
                    />
                </>
            )}
        </Box>
    );
};

export default SmartDateRangeSelector;
