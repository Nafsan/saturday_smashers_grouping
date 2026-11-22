import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeedInitialData from './SeedInitialData';
import { fetchPlayers, fetchFundBalances, seedInitialData } from '../api/client';
jest.mock('../api/client', () => ({ fetchPlayers:jest.fn(), fetchFundBalances:jest.fn(), seedInitialData:jest.fn() }));
beforeEach(() => { fetchPlayers.mockResolvedValue([{name:'Alice'}]); fetchFundBalances.mockResolvedValue([]); });
test('validates and saves initial data using the session', async () => {
    seedInitialData.mockResolvedValue({});
    render(<SeedInitialData />);
    await userEvent.click(await screen.findByRole('button', {name:'Add New Player'}));
    await userEvent.click(screen.getByRole('button', {name:'Save Data'}));
    expect(screen.getByText('All players must have a name')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', {name:/player name/i}));
    await userEvent.click(screen.getByRole('option', {name:'Alice'}));
    await userEvent.click(screen.getByRole('button', {name:'Save Data'}));
    await waitFor(() => expect(seedInitialData).toHaveBeenCalledWith({players:[expect.objectContaining({player_name:'Alice'})]}));
    expect(await screen.findByText('Data saved successfully!')).toBeInTheDocument();
});

test('edits an existing balance and reports a save failure', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchFundBalances.mockResolvedValue([{player_name:'Alice',current_balance:10,days_played:2,total_paid:30,total_cost:20}]);
    seedInitialData.mockRejectedValueOnce({response:{data:{detail:'Not authorized'}}});
    render(<SeedInitialData />);
    await userEvent.click(await screen.findByRole('combobox', {name:'Edit Existing Player'}));
    await userEvent.click(screen.getByRole('option', {name:'Alice'}));
    const fields = ['Current Balance','Days Played','Total Paid','Total Cost'];
    for (const label of fields) {
        await userEvent.clear(screen.getByLabelText(label));
        await userEvent.type(screen.getByLabelText(label), '5');
    }
    await userEvent.click(screen.getByRole('button', {name:'Save Data'}));
    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
    spy.mockRestore();
});

test('reports loading failures', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchPlayers.mockRejectedValueOnce(new Error('offline'));
    render(<SeedInitialData />);
    expect(await screen.findByText('Failed to load data')).toBeInTheDocument();
    spy.mockRestore();
});
