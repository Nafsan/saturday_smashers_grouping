import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FundSettings from './FundSettings';
import { fetchFundSettings, updateFundSettings } from '../api/client';
jest.mock('../api/client', () => ({ fetchFundSettings: jest.fn(), updateFundSettings: jest.fn() }));

beforeEach(() => fetchFundSettings.mockResolvedValue({ default_venue_fee: 10, default_ball_fee: 20 }));
test('loads, edits and saves settings using the session', async () => {
    updateFundSettings.mockResolvedValue({});
    render(<FundSettings />);
    const fee = await screen.findByLabelText('Default Venue Fee (per person)');
    await userEvent.clear(fee);
    await userEvent.type(fee, '30');
    await userEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => expect(updateFundSettings).toHaveBeenCalledWith({ default_venue_fee: 30, default_ball_fee: 20 }));
    expect(await screen.findByText('Settings saved successfully!')).toBeInTheDocument();
});
test('reports load and save failures', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchFundSettings.mockRejectedValueOnce(new Error('offline'));
    const view = render(<FundSettings />);
    expect(await screen.findByText('Failed to load settings')).toBeInTheDocument();
    view.unmount();
    updateFundSettings.mockRejectedValueOnce(new Error('offline'));
    render(<FundSettings />);
    await screen.findByLabelText('Default Ball Fee (per ball)');
    await userEvent.click(screen.getByRole('button', { name: /save settings/i }));
    expect(await screen.findByText('Failed to save settings')).toBeInTheDocument();
    spy.mockRestore();
});
