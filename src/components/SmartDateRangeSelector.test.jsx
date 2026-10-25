import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SmartDateRangeSelector, { getPredefinedRange } from './SmartDateRangeSelector';

describe('predefined ranges', () => {
    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(2026, 9, 25, 12)));
    test.each([
        ['last_week', '2026-10-18', '2026-10-25'],
        ['current_month', '2026-10-01', '2026-10-31'],
        ['last_month', '2026-09-01', '2026-09-30'],
        ['next_month', '2026-11-01', '2026-11-30'],
        ['last_3_months', '2026-08-01', '2026-11-30'],
        ['last_6_months', '2026-04-01', '2026-11-30'],
        ['last_1_year', '2025-10-01', '2026-11-30'],
        ['all_time', '', ''],
    ])('%s uses local calendar dates', (range, startDate, endDate) => {
        expect(getPredefinedRange(range)).toEqual({ startDate, endDate });
    });
    test('unknown and custom ranges have no automatic dates', () => {
        expect(getPredefinedRange('custom')).toBeNull();
        expect(getPredefinedRange('unknown')).toBeNull();
    });
});

test('preset and custom date interactions notify the parent', async () => {
    const change = jest.fn();
    render(<SmartDateRangeSelector startDate="2026-10-01" endDate="2026-10-31" onRangeChange={change} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'All Time' }));
    expect(change).toHaveBeenCalledWith('', '');
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'Custom...' }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-02' } });
    expect(change).toHaveBeenLastCalledWith('2026-10-02', '2026-10-31');
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-01' } });
    expect(change).toHaveBeenLastCalledWith('2026-10-01', '2026-11-01');
});
