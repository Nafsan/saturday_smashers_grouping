import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddClubTournamentDialog from './AddClubTournamentDialog';
import { ToastProvider } from '../context/ToastContext';
import { fetchClubVenues, updateClubTournament, createClubTournament } from '../api/client';
jest.mock('../api/client', () => ({fetchClubVenues:jest.fn(), updateClubTournament:jest.fn(), createClubTournament:jest.fn()}));
jest.mock('@uiw/react-md-editor', () => ({__esModule:true, default:({value,onChange}) => <textarea aria-label="Announcement" value={value} onChange={e => onChange(e.target.value)} />}));
const venue={id:1,name:'Arena'};
const tournament={id:2,venue,category:'Singles',tournament_datetime:'2026-10-24T12:00:00'};
beforeEach(() => fetchClubVenues.mockResolvedValue([venue]));
test('updates a tournament through the session', async () => {
    updateClubTournament.mockResolvedValue({});
    const close=jest.fn();
    render(<ToastProvider><AddClubTournamentDialog open tournament={tournament} onClose={close} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', {name:'Update'}));
    await waitFor(() => expect(updateClubTournament).toHaveBeenCalledWith(2, expect.objectContaining({venue_id:1,category:'Singles'})));
    expect(close).toHaveBeenCalledWith(true);
});

test('validates and creates a tournament', async () => {
    createClubTournament.mockResolvedValue({});
    const close=jest.fn();
    render(<ToastProvider><AddClubTournamentDialog open onClose={close} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', {name:'Create'}));
    expect(await screen.findByText('Please select a venue')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('combobox', {name:'Tournament Venue'}));
    await userEvent.click(await screen.findByRole('option', {name:'Arena'}));
    await userEvent.click(screen.getByRole('button', {name:'Create'}));
    expect(await screen.findByText('Please enter a tournament category')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Tournament Category/), 'Doubles');
    await userEvent.type(screen.getByLabelText('Announcement'), 'Hello');
    await userEvent.type(screen.getByLabelText('Tournament Online Link'), 'https://example.test');
    await userEvent.click(screen.getByRole('button', {name:'Create'}));
    await waitFor(() => expect(createClubTournament).toHaveBeenCalledWith(expect.objectContaining({category:'Doubles',venue_id:1})));
    expect(close).toHaveBeenCalledWith(true);
});

test('shows load and save errors', async () => {
    fetchClubVenues.mockRejectedValueOnce(new Error('offline'));
    updateClubTournament.mockRejectedValueOnce({response:{data:{detail:'Not authorized'}}});
    render(<ToastProvider><AddClubTournamentDialog open tournament={tournament} onClose={jest.fn()} /></ToastProvider>);
    expect(await screen.findByText('Failed to load venues')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Update'}));
    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
});


test('edits optional details and registration group, then cancels', async () => {
    const { fireEvent } = require('@testing-library/react');
    const venueWithGroup={...venue, whatsapp_links:[{id:7,label:'Group'}]};
    fetchClubVenues.mockResolvedValue([venueWithGroup]);
    const close=jest.fn();
    render(<ToastProvider><AddClubTournamentDialog open tournament={{...tournament,venue:venueWithGroup}} onClose={close} /></ToastProvider>);
    await userEvent.click(screen.getByRole('combobox', {name:'WhatsApp Registration Group'}));
    await userEvent.click(screen.getByRole('option', {name:'Group'}));
    fireEvent.change(screen.getByLabelText(/Date & Time/), {target:{value:'2026-11-01T12:00'}});
    await userEvent.clear(screen.getByLabelText('Total Players'));
    await userEvent.type(screen.getByLabelText('Total Players'), '8');
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    expect(close).toHaveBeenCalledWith(false);
});
