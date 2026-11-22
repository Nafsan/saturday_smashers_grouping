import React from 'react';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClubTournaments from './ClubTournaments';
import {ToastProvider} from '../context/ToastContext';
import {fetchClubTournaments,fetchClubVenues,deleteClubTournament} from '../api/client';
jest.mock('react-router-dom', () => ({useNavigate:() => jest.fn(),Link:({children}) => <span>{children}</span>}));
jest.mock('react-markdown', () => ({__esModule:true,default:({children}) => <span>{children}</span>}));
jest.mock('../api/client', () => ({fetchClubTournaments:jest.fn(),fetchClubVenues:jest.fn(),deleteClubTournament:jest.fn()}));
jest.mock('../utils/cookieUtils', () => ({isAdminAuthenticated:() => true,getAdminAuthCookie:() => null}));
jest.mock('./NavigationBar', () => () => null);
jest.mock('./AddClubTournamentDialog', () => ({open,onClose}) => open ? <button onClick={() => onClose(true)}>Tournament dialog done</button> : null);
jest.mock('./SubmitClubResultsDialog', () => ({open,onClose}) => open ? <button onClick={() => onClose(true)}>Results dialog done</button> : null);
jest.mock('./ManageVenuesDialog', () => ({open,onClose}) => open ? <button onClick={() => onClose(true)}>Venues dialog done</button> : null);
jest.mock('./ClubTournamentResultsDialog', () => ({open,onClose}) => open ? <button onClick={() => onClose(true)}>Share dialog done</button> : null);
jest.mock('./BulkImportDialog', () => ({open,onClose}) => open ? <button onClick={() => onClose(true)}>Import dialog done</button> : null);
jest.mock('./SmartDateRangeSelector', () => ({onRangeChange}) => <button onClick={() => onRangeChange('2026-01-01','2026-12-31')}>Set dates</button>);
jest.mock('./TournamentScoresheetModal', () => ({open,onClose}) => open ? <button onClick={() => onClose(true)}>Scoresheet dialog done</button> : null);
test('deletes a club tournament using the server session', async () => {
    const confirm=jest.spyOn(window,'confirm').mockReturnValue(true);
    fetchClubVenues.mockResolvedValue([]);
    fetchClubTournaments.mockResolvedValue({items:[{id:1,venue:{name:'Arena'},category:'Singles',tournament_datetime:'2026-10-24T12:00:00',status:'past'}],total_count:1,total_pages:1});
    deleteClubTournament.mockResolvedValue({});
    render(<ToastProvider><ClubTournaments /></ToastProvider>);
    await userEvent.click(await screen.findByTitle('Delete tournament'));
    await waitFor(() => expect(deleteClubTournament).toHaveBeenCalledWith(1));
    confirm.mockRestore();
});

test('filters, searches, paginates and changes the date range', async () => {
    const scroll=jest.spyOn(window,'scrollTo').mockImplementation(() => {});
    fetchClubVenues.mockResolvedValue([{id:2,name:'Arena'}]);
    fetchClubTournaments.mockResolvedValue({items:[],total_count:30,total_pages:2});
    render(<ToastProvider><ClubTournaments /></ToastProvider>);
    expect(await screen.findByText('No tournaments found')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Upcoming'}));
    await waitFor(() => expect(fetchClubTournaments).toHaveBeenLastCalledWith(expect.objectContaining({statusFilter:'upcoming'})));
    await userEvent.type(screen.getByPlaceholderText('Search tournament...'),'Singles');
    await waitFor(() => expect(fetchClubTournaments).toHaveBeenLastCalledWith(expect.objectContaining({searchQuery:'Singles'})));
    await userEvent.click(screen.getByRole('combobox',{name:'Filter by Venue'}));
    await userEvent.click(screen.getByRole('option',{name:'Arena'}));
    await waitFor(() => expect(fetchClubTournaments).toHaveBeenLastCalledWith(expect.objectContaining({venueId:2})));
    await userEvent.click(screen.getByRole('button',{name:'Set dates'}));
    await waitFor(() => expect(fetchClubTournaments).toHaveBeenLastCalledWith(expect.objectContaining({startDate:'2026-01-01',endDate:'2026-12-31'})));
    await userEvent.click(screen.getByRole('button',{name:'Go to page 2'}));
    await waitFor(() => expect(fetchClubTournaments).toHaveBeenLastCalledWith(expect.objectContaining({page:2})));
    expect(scroll).toHaveBeenCalled();
    scroll.mockRestore();
});

test('opens admin tools and refreshes after changes', async () => {
    fetchClubVenues.mockResolvedValue([]);
    fetchClubTournaments.mockResolvedValue({items:[],total_count:0,total_pages:0});
    render(<ToastProvider><ClubTournaments /></ToastProvider>);
    await screen.findByText('No tournaments found');
    for (const [button,dialog] of [['Bulk Import','Import dialog done'],['Manage Venues','Venues dialog done'],['Add Tournament','Tournament dialog done']]) {
        await userEvent.click(screen.getByRole('button',{name:button}));
        await userEvent.click(screen.getByRole('button',{name:dialog}));
    }
    expect(fetchClubVenues.mock.calls.length).toBeGreaterThan(1);
});

test('shows tournament details and opens its actions', async () => {
    fetchClubVenues.mockResolvedValue([]);
    fetchClubTournaments.mockResolvedValue({items:[{id:1,venue:{name:'Arena',logo_base64:'data:image/png;base64,YQ=='},category:'Singles',tournament_datetime:'2026-10-24T12:00:00Z',status:'upcoming',total_players:8,announcement:'Notes',online_link:'https://example.test',whatsapp_link:{link:'https://example.test'},result:{champion:'Alice',runner_up:'Bob'}}],total_count:1,total_pages:1});
    render(<ToastProvider><ClubTournaments /></ToastProvider>);
    expect(await screen.findByText('Singles')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Register'})).toHaveAttribute('href','https://example.test');
    for (const [button,dialog] of [['Share Result','Share dialog done'],['Scoresheet','Scoresheet dialog done'],['Edit Results','Results dialog done']]) {
        await userEvent.click(screen.getByRole('button',{name:button}));
        await userEvent.click(screen.getByRole('button',{name:dialog}));
    }
    await userEvent.click(screen.getByTitle('Edit tournament'));
    await userEvent.click(screen.getByRole('button',{name:'Tournament dialog done'}));
});

test('reports loading and deletion errors', async () => {
    const log=jest.spyOn(console,'error').mockImplementation(() => {});
    fetchClubVenues.mockRejectedValueOnce(new Error('Offline'));
    fetchClubTournaments.mockRejectedValueOnce(new Error('Offline'));
    render(<ToastProvider><ClubTournaments /></ToastProvider>);
    expect(await screen.findByText('Failed to load tournaments')).toBeInTheDocument();
    log.mockRestore();
});
