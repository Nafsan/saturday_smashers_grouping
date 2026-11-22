import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatsOverview from './StatsOverview';
import { renderWithProviders } from '../../tests/frontend/renderWithProviders';
import { updateNextTournamentDate } from '../api/client';
import { isAdminAuthenticated } from '../utils/cookieUtils';
jest.mock('../api/client', () => ({ updateNextTournamentDate: jest.fn() }));
jest.mock('../utils/cookieUtils', () => ({ ...jest.requireActual('../utils/cookieUtils'), isAdminAuthenticated: jest.fn(), getAdminAuthCookie: jest.fn(() => 'old-secret') }));

test('administrator changes the next tournament date through the session', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    updateNextTournamentDate.mockResolvedValue({});
    renderWithProviders(<StatsOverview />, {state:{history:[], allPlayers:[], fundSettings:{next_tournament_date:'2099-12-05'}}});
    await userEvent.click(screen.getByText('Next Tournament'));
    fireEvent.change(screen.getByLabelText('Tournament Date'), {target:{value:'2099-12-12'}});
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    await waitFor(() => expect(updateNextTournamentDate).toHaveBeenCalledWith('2099-12-12'));
    expect(await screen.findByText('Next tournament date updated successfully!')).toBeInTheDocument();
});

test('shows Google sign-in if the session expires before saving', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    renderWithProviders(<StatsOverview />, {state:{history:[], allPlayers:['Alice', {name:'Bob', is_guest:true}], fundSettings:null}});
    await userEvent.click(screen.getByText('Next Tournament'));
    isAdminAuthenticated.mockReturnValue(false);
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    expect(screen.getByRole('link', {name:/sign in with google/i})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    expect(updateNextTournamentDate).not.toHaveBeenCalled();
});

test('reports update errors and lets the administrator cancel editing', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    isAdminAuthenticated.mockReturnValue(true);
    updateNextTournamentDate.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<StatsOverview />, {state:{history:[{date:'2026-01-03'}], allPlayers:[{name:'Alice', is_guest:false}], fundSettings:{next_tournament_date:'2000-01-01'}}});
    await userEvent.click(screen.getByText('Next Tournament'));
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('sign in')));
    await userEvent.click(screen.getByText('Next Tournament'));
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    error.mockRestore();
    alert.mockRestore();
});
