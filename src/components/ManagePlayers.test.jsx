import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManagePlayers from './ManagePlayers';
import { renderWithProviders } from '../../tests/frontend/renderWithProviders';
import * as api from '../api/client';
import { setAdminAuthCookie } from '../utils/cookieUtils';

jest.mock('../api/client');
const players = [{ id: 1, name: 'Alice', is_guest: false }, { id: 2, name: 'Bob', is_guest: true }];
beforeEach(() => {
    api.fetchPlayers.mockResolvedValue(players);
    setAdminAuthCookie('test-admin-only');
});

async function showPlayers() {
    const result = renderWithProviders(<ManagePlayers />);
    await screen.findByRole('button', { name: 'Edit name for Alice' });
    return result;
}

test('shows a loading state while requesting players', () => {
    api.fetchPlayers.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ManagePlayers />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading players');
});

test('loads players independently and searches names without changing the roster', async () => {
    const { store } = await showPlayers();
    await userEvent.type(screen.getByPlaceholderText('Search players...'), 'ALI');
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(store.getState().app.allPlayers).toHaveLength(2);
});

test('failed fetch offers retry and loads successfully on retry', async () => {
    api.fetchPlayers.mockRejectedValueOnce(new Error('Offline'));
    renderWithProviders(<ManagePlayers />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load players. Offline');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('button', { name: 'Edit name for Alice' });
    expect(api.fetchPlayers).toHaveBeenCalledTimes(2);
});

test.each([['   ', 'Player name cannot be empty.'], ['bob', 'A player with this name already exists.']])(
    'rejects invalid rename %j before calling the API', async (name, message) => {
        await showPlayers();
        await userEvent.click(screen.getByRole('button', { name: 'Edit name for Alice' }));
        const input = screen.getByRole('textbox', { name: 'Player name' });
        await userEvent.clear(input);
        await userEvent.type(input, name);
        await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(api.updatePlayer).not.toHaveBeenCalled();
    },
);

test('successful rename trims input, preserves ID and updates cached tournament names', async () => {
    api.updatePlayer.mockResolvedValue({ id: 1, name: 'Zara', is_guest: false });
    const { store } = renderWithProviders(<ManagePlayers />, { state: {
        history: [{ id: 'cup', ranks: [{ rating: 1, players: ['Alice'] }] }],
    } });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit name for Alice' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Player name' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Player name' }), '  Zara  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await screen.findByRole('button', { name: 'Edit name for Zara' });
    expect(api.updatePlayer).toHaveBeenCalledWith(1, { name: 'Zara' }, 'test-admin-only');
    expect(store.getState().app.history[0].ranks[0].players).toEqual(['Zara']);
    expect(screen.getByRole('alert')).toHaveTextContent('Player renamed to Zara');
});

test('rename failures keep the editor open with a readable error', async () => {
    api.updatePlayer.mockRejectedValue({ response: { data: { detail: 'Name already taken' } } });
    await showPlayers();
    await userEvent.click(screen.getByRole('button', { name: 'Edit name for Alice' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Player name' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Player name' }), 'Zara');
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Name already taken')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('guest toggle sends only the changed status and updates the UI', async () => {
    api.updatePlayer.mockResolvedValue({ id: 1, name: 'Alice', is_guest: true });
    await showPlayers();
    await userEvent.click(screen.getByRole('switch', { name: 'Guest status for Alice' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Guest status for Alice' })).toBeChecked());
    expect(api.updatePlayer).toHaveBeenCalledWith(1, { is_guest: true }, 'test-admin-only');
});

test('saving an unchanged name closes the dialog without a request', async () => {
    await showPlayers();
    await userEvent.click(screen.getByRole('button', { name: 'Edit name for Alice' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.updatePlayer).not.toHaveBeenCalled();
});
