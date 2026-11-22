import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddPlayerMiscCost from './AddPlayerMiscCost';
import { fetchPlayers, addPlayerMiscCost } from '../api/client';
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('../api/client', () => ({ fetchPlayers: jest.fn(), addPlayerMiscCost: jest.fn() }));

beforeEach(() => fetchPlayers.mockResolvedValue([{name:'Alice'}]));
test('validates and submits miscellaneous costs using the session', async () => {
    addPlayerMiscCost.mockResolvedValue({message:'Saved'});
    render(<AddPlayerMiscCost />);
    const players = await screen.findByRole('combobox', {name:/select players/i});
    await userEvent.click(screen.getByRole('button', {name:'Add Miscellaneous Cost'}));
    expect(screen.getByText('Please select at least one player')).toBeInTheDocument();
    await userEvent.click(players);
    await userEvent.click(screen.getByRole('option', {name:'Alice'}));
    await userEvent.click(screen.getByRole('button', {name:'Add Miscellaneous Cost'}));
    expect(screen.getByText('Cost amount must be greater than 0')).toBeInTheDocument();
    const amount = screen.getByLabelText(/cost amount/i);
    await userEvent.clear(amount);
    await userEvent.type(amount, '50');
    await userEvent.click(screen.getByRole('button', {name:'Add Miscellaneous Cost'}));
    expect(screen.getByText('Please provide a cost description')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/cost description/i), 'Balls');
    await userEvent.click(screen.getByRole('button', {name:'Add Miscellaneous Cost'}));
    await waitFor(() => expect(addPlayerMiscCost).toHaveBeenCalledWith(expect.objectContaining({player_names:['Alice'], cost_amount:50, cost_description:'Balls'})));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
});
test('reports load failures', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchPlayers.mockRejectedValueOnce(new Error('offline'));
    render(<AddPlayerMiscCost />);
    expect(await screen.findByText('Failed to load players')).toBeInTheDocument();
    spy.mockRestore();
});

test('shows a server failure when saving a cost', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    addPlayerMiscCost.mockRejectedValueOnce({response:{data:{detail:'Not authorized'}}});
    render(<AddPlayerMiscCost />);
    await userEvent.click(await screen.findByRole('combobox', {name:/select players/i}));
    await userEvent.click(screen.getByRole('option', {name:'Alice'}));
    await userEvent.clear(screen.getByLabelText(/cost amount/i));
    await userEvent.type(screen.getByLabelText(/cost amount/i), '20');
    await userEvent.type(screen.getByLabelText(/cost description/i), 'Balls');
    await userEvent.click(screen.getByRole('button', {name:'Add Miscellaneous Cost'}));
    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
    spy.mockRestore();
});
