import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecordPayment from './RecordPayment';
import { fetchPlayers, recordPayment } from '../api/client';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../api/client', () => ({ fetchPlayers: jest.fn(), recordPayment: jest.fn() }));

beforeEach(() => fetchPlayers.mockResolvedValue([{name:'Alice'}]));
test('validates and then records a payment using the server session', async () => {
    const timer = jest.spyOn(global, 'setTimeout');
    recordPayment.mockResolvedValue({message:'Saved', new_balance:20});
    render(<RecordPayment />);
    const player = await screen.findByRole('combobox', {name:/player name/i});
    await userEvent.click(screen.getByRole('button', {name:'Record Payment'}));
    expect(screen.getByText('Please select a player')).toBeInTheDocument();
    await userEvent.click(player);
    await userEvent.click(screen.getByRole('option', {name:'Alice'}));
    const amount = screen.getByLabelText(/payment amount/i);
    await userEvent.clear(amount);
    await userEvent.type(amount, '50');
    await userEvent.type(screen.getByLabelText(/notes/i), 'Cash');
    await userEvent.click(screen.getByRole('button', {name:'Record Payment'}));
    await waitFor(() => expect(recordPayment).toHaveBeenCalledWith(expect.objectContaining({player_name:'Alice', amount:50})));
    expect(await screen.findByText(/Saved. New balance/)).toBeInTheDocument();
    const redirect = timer.mock.calls.find(([, delay]) => delay === 2000);
    act(() => redirect[0]());
    expect(mockNavigate).toHaveBeenCalledWith('/fund');
    timer.mockRestore();
});
test('reports a player loading error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchPlayers.mockRejectedValueOnce(new Error('offline'));
    render(<RecordPayment />);
    expect(await screen.findByText('Failed to load players')).toBeInTheDocument();
    spy.mockRestore();
});

test('rejects an empty amount and shows server errors', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    recordPayment.mockRejectedValueOnce({response:{data:{detail:'Not authorized'}}});
    render(<RecordPayment />);
    await userEvent.click(await screen.findByRole('combobox', {name:/player name/i}));
    await userEvent.click(screen.getByRole('option', {name:'Alice'}));
    await userEvent.click(screen.getByRole('button', {name:'Record Payment'}));
    expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/payment amount/i));
    await userEvent.type(screen.getByLabelText(/payment amount/i), '50');
    await userEvent.click(screen.getByRole('button', {name:'Record Payment'}));
    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
    spy.mockRestore();
});
