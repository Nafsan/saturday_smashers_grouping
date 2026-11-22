import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RankParser from './RankParser';
import { renderWithProviders } from '../../tests/frontend/renderWithProviders';
import { isAdminAuthenticated } from '../utils/cookieUtils';
import * as api from '../api/client';
jest.mock('../api/client');
jest.mock('../utils/cookieUtils', () => ({ ...jest.requireActual('../utils/cookieUtils'), isAdminAuthenticated: jest.fn() }));

test('uploads parsed rankings with the server session', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.addTournament.mockResolvedValue({});
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithProviders(<RankParser />, {state:{allPlayers:['Alice']}});
    await userEvent.type(screen.getByPlaceholderText(/Player A/), '2026-10-24{enter}1. Alice');
    await userEvent.click(screen.getByRole('button', {name:'Generate JSON'}));
    await userEvent.click(screen.getByRole('button', {name:'Upload Ranking'}));
    await waitFor(() => expect(api.addTournament).toHaveBeenCalledWith(expect.objectContaining({date:'2026-10-24'})));
    expect(screen.queryByText(/Enter password/)).not.toBeInTheDocument();
    alert.mockRestore();
});

test('offers Google sign-in to an unauthenticated user', async () => {
    isAdminAuthenticated.mockReturnValue(false);
    renderWithProviders(<RankParser />);
    await userEvent.type(screen.getByPlaceholderText(/Player A/), '2026-10-24{enter}1. Alice');
    await userEvent.click(screen.getByRole('button', {name:'Generate JSON'}));
    await userEvent.click(screen.getByRole('button', {name:'Upload Ranking'}));
    expect(screen.getByRole('link', {name:/sign in with google/i})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    expect(api.addTournament).not.toHaveBeenCalled();
});

test('warns about a possible typo and lets the admin upload anyway', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.addTournament.mockResolvedValue({});
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithProviders(<RankParser />, {state:{allPlayers:['Alice']}});
    await userEvent.type(screen.getByPlaceholderText(/Player A/), '2026-10-24{enter}1. Alic');
    await userEvent.click(screen.getByRole('button', {name:'Generate JSON'}));
    await userEvent.click(screen.getByRole('button', {name:'Upload Ranking'}));
    expect(screen.getByText(/might be a typo/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Yes, Upload Anyway'}));
    await waitFor(() => expect(api.addTournament).toHaveBeenCalledWith(expect.any(Object)));
    alert.mockRestore();
});

test('reports parsing and upload errors', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.addTournament.mockRejectedValueOnce(new Error('Offline'));
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<RankParser />, {state:{allPlayers:['Alice']}});
    await userEvent.click(screen.getByRole('button', {name:'Generate JSON'}));
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('Could not parse'));
    await userEvent.type(screen.getByPlaceholderText(/Player A/), '2026-10-24{enter}1. Alice');
    await userEvent.click(screen.getByRole('button', {name:'Generate JSON'}));
    await userEvent.click(screen.getByRole('button', {name:'Upload Ranking'}));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('Upload Failed')));
    alert.mockRestore();
    log.mockRestore();
});
