import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnofficialTournamentDialog from './UnofficialTournamentDialog';
import { renderWithProviders } from '../../tests/frontend/renderWithProviders';
import { setAdminAuthCookie } from '../utils/cookieUtils';
import * as api from '../api/client';

jest.mock('../api/client');
// The rich editor and Markdown library have their own parsing/UI suites. Keep
// their value/onChange boundary here; exercise this dialog's own behavior.
jest.mock('@uiw/react-md-editor', () => ({
    __esModule: true,
    default: ({ value, onChange, textareaProps }) => <textarea {...textareaProps} value={value} onChange={event => onChange(event.target.value)} />,
    commands: {},
}));
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));

const tournament = { id: 'friendly', date: '2026-10-24', is_official: false,
    description: 'Friendly standings', playlist_url: 'https://youtube.com/playlist?list=old', ranks: [] };

test('visitors can view notes and playlist but cannot edit or save', () => {
    renderWithProviders(<UnofficialTournamentDialog open onClose={jest.fn()} tournament={tournament} />);
    expect(screen.getByText('Friendly standings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watch YouTube playlist' })).toHaveAttribute('href', tournament.playlist_url);
    expect(screen.queryByRole('button', { name: 'Save details' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login as Admin' })).toBeInTheDocument();
});

test('empty notes have a helpful visitor state', () => {
    renderWithProviders(<UnofficialTournamentDialog open onClose={jest.fn()} tournament={{ ...tournament, description: '', playlist_url: null }} />);
    expect(screen.getByText('No tournament description yet.')).toBeInTheDocument();
});

test('visitors can cancel login or authenticate to unlock the editor', async () => {
    const close = jest.fn();
    renderWithProviders(<UnofficialTournamentDialog open onClose={close} tournament={tournament} />);
    await userEvent.click(screen.getByRole('button', { name: 'Login as Admin' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByLabelText('Enter Admin Password')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Login as Admin' }));
    await userEvent.type(screen.getByLabelText('Enter Admin Password'), 'test-admin-only');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('textbox', { name: 'Tournament description' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('Enter Admin Password')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledTimes(1);
});

test('admin edits trim values and preserve tournament ranking records', async () => {
    setAdminAuthCookie('test-admin-only');
    const close = jest.fn();
    api.updateUnofficialTournamentDetails.mockResolvedValue({ playlist_url: null, description: 'Updated notes' });
    const { store } = renderWithProviders(<UnofficialTournamentDialog open onClose={close} tournament={tournament} />, { state: { history: [tournament] } });
    const description = screen.getByRole('textbox', { name: 'Tournament description' });
    await userEvent.clear(description);
    await userEvent.type(description, '  Updated notes  ');
    await userEvent.clear(screen.getByLabelText('YouTube Playlist URL (optional)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(api.updateUnofficialTournamentDetails).toHaveBeenCalledWith('friendly', { playlist_url: null, description: 'Updated notes' }, 'test-admin-only');
    expect(store.getState().app.history[0]).toMatchObject({ is_official: false, ranks: [], description: 'Updated notes' });
});

test('invalid playlist URLs stop submission', async () => {
    setAdminAuthCookie('test-admin-only');
    renderWithProviders(<UnofficialTournamentDialog open onClose={jest.fn()} tournament={tournament} />);
    const url = screen.getByLabelText('YouTube Playlist URL (optional)');
    await userEvent.clear(url);
    await userEvent.type(url, 'https://example.test/?list=abc');
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    expect(screen.getByText('Enter a valid YouTube playlist URL containing a list ID.')).toBeInTheDocument();
    expect(api.updateUnofficialTournamentDetails).not.toHaveBeenCalled();
});

test('save errors stay visible and permit another attempt', async () => {
    setAdminAuthCookie('test-admin-only');
    api.updateUnofficialTournamentDetails.mockRejectedValue(new Error('Offline'));
    const close = jest.fn();
    renderWithProviders(<UnofficialTournamentDialog open onClose={close} tournament={tournament} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    expect(await screen.findByRole('alert', { name: '' })).toBeDefined();
    expect(await screen.findByText('Offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save details' })).toBeEnabled();
    expect(close).not.toHaveBeenCalled();
});

test('preview toggles between notes and the editor', async () => {
    setAdminAuthCookie('test-admin-only');
    renderWithProviders(<UnofficialTournamentDialog open onClose={jest.fn()} tournament={tournament} />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.queryByRole('textbox', { name: 'Tournament description' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit description' }));
    expect(screen.getByRole('textbox', { name: 'Tournament description' })).toBeInTheDocument();
});
