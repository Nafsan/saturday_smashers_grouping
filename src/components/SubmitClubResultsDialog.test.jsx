import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmitClubResultsDialog from './SubmitClubResultsDialog';
import { ToastProvider } from '../context/ToastContext';
import { updateClubTournamentResults, submitClubTournamentResults } from '../api/client';
jest.mock('../api/client', () => ({updateClubTournamentResults:jest.fn(), submitClubTournamentResults:jest.fn()}));
const tournament = {id:1,total_players:8,result:{champion:'Alice',runner_up:'Bob',semi_finalist_1:'Carol',semi_finalist_2:'Dave'}};
test('updates existing results through the server session', async () => {
    updateClubTournamentResults.mockResolvedValue({});
    const close = jest.fn();
    render(<ToastProvider><SubmitClubResultsDialog open tournament={tournament} onClose={close} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', {name:'Update Results'}));
    await waitFor(() => expect(updateClubTournamentResults).toHaveBeenCalledWith(1, expect.objectContaining({champion:'Alice', runner_up:'Bob'})));
    expect(close).toHaveBeenCalledWith(true);
});

test('validates and submits new results', async () => {
    submitClubTournamentResults.mockResolvedValue({});
    const close = jest.fn();
    render(<ToastProvider><SubmitClubResultsDialog open tournament={{id:2}} onClose={close} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', {name:'Submit Results'}));
    expect(screen.getByText('Champion and Runner Up are required')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Champion/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/Runner Up/i), 'Bob');
    await userEvent.click(screen.getByRole('button', {name:'Submit Results'}));
    expect(screen.getByText('Both Semi Finalists are required')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Semi Finalist 1/), 'Carol');
    await userEvent.type(screen.getByLabelText(/Semi Finalist 2/), 'Dave');
    await userEvent.click(screen.getByRole('button', {name:'Submit Results'}));
    await waitFor(() => expect(submitClubTournamentResults).toHaveBeenCalledWith(2, expect.objectContaining({champion:'Alice'})));
    expect(close).toHaveBeenCalledWith(true);
});

test('reports an update failure', async () => {
    updateClubTournamentResults.mockRejectedValueOnce({response:{data:{detail:'Not authorized'}}});
    render(<ToastProvider><SubmitClubResultsDialog open tournament={tournament} onClose={jest.fn()} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', {name:'Update Results'}));
    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
});


test('edits optional results and permits cancellation', async () => {
    const close = jest.fn();
    render(<ToastProvider><SubmitClubResultsDialog open tournament={tournament} onClose={close} /></ToastProvider>);
    for (const label of ['QF 1','QF 2','QF 3','QF 4']) await userEvent.type(screen.getByLabelText(label), 'Player');
    await userEvent.type(screen.getByLabelText('Tournament Online Link'), 'https://example.test');
    await userEvent.clear(screen.getByLabelText('Total Players'));
    await userEvent.type(screen.getByLabelText('Total Players'), '12');
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    expect(close).toHaveBeenCalledWith(false);
});
