import React from 'react';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageVenuesDialog from './ManageVenuesDialog';
import {ToastProvider} from '../context/ToastContext';
import {fetchClubVenues,createClubVenue,updateClubVenue,deleteClubVenue} from '../api/client';
jest.mock('../api/client', () => ({fetchClubVenues:jest.fn(),createClubVenue:jest.fn(),updateClubVenue:jest.fn(),deleteClubVenue:jest.fn()}));
beforeEach(() => fetchClubVenues.mockResolvedValue([{id:1,name:'Arena',whatsapp_links:[]}]));
test('adds a venue using the server session', async () => {
    createClubVenue.mockResolvedValue({});
    render(<ToastProvider><ManageVenuesDialog open onClose={jest.fn()} /></ToastProvider>);
    await userEvent.click(await screen.findByRole('button',{name:'Add New Venue'}));
    await userEvent.type(screen.getByLabelText(/Venue Name/), 'New Arena');
    await userEvent.click(screen.getByRole('button',{name:'Add'}));
    await waitFor(() => expect(createClubVenue).toHaveBeenCalledWith(expect.objectContaining({name:'New Arena'})));
});
test('deletes a venue using the server session', async () => {
    const confirm=jest.spyOn(window,'confirm').mockReturnValue(true);
    deleteClubVenue.mockResolvedValue({});
    render(<ToastProvider><ManageVenuesDialog open onClose={jest.fn()} /></ToastProvider>);
    await userEvent.click(await screen.findByRole('button',{name:'Delete Arena'}));
    await waitFor(() => expect(deleteClubVenue).toHaveBeenCalledWith(1));
    confirm.mockRestore();
});

test('validates venue name and updates an existing venue', async () => {
    updateClubVenue.mockResolvedValue({});
    render(<ToastProvider><ManageVenuesDialog open onClose={jest.fn()} /></ToastProvider>);
    await userEvent.click(await screen.findByRole('button',{name:'Edit Arena'}));
    const name=screen.getByLabelText(/Venue Name/);
    await userEvent.clear(name);
    await userEvent.click(screen.getByRole('button',{name:'Update'}));
    expect(await screen.findByText('Venue name is required')).toBeInTheDocument();
    await userEvent.type(name,'New Name');
    await userEvent.click(screen.getByRole('button',{name:'Update'}));
    await waitFor(() => expect(updateClubVenue).toHaveBeenCalledWith(1,expect.objectContaining({name:'New Name'})));
});
test('reports loading and save errors', async () => {
    fetchClubVenues.mockRejectedValueOnce(new Error('Offline'));
    createClubVenue.mockRejectedValueOnce({response:{data:{detail:'Not authorized'}}});
    render(<ToastProvider><ManageVenuesDialog open onClose={jest.fn()} /></ToastProvider>);
    expect(await screen.findByText('Failed to load venues')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Add New Venue'}));
    await userEvent.type(screen.getByLabelText(/Venue Name/),'New Arena');
    await userEvent.click(screen.getByRole('button',{name:'Add'}));
    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
});

test('can add and remove a registration link and cancel', async () => {
    render(<ToastProvider><ManageVenuesDialog open onClose={jest.fn()} /></ToastProvider>);
    await userEvent.click(await screen.findByRole('button',{name:'Add New Venue'}));
    await userEvent.click(screen.getByRole('button',{name:'Add Group Link'}));
    await userEvent.type(screen.getByLabelText('Label (e.g. Elite)'),'Main');
    await userEvent.type(screen.getByLabelText('Group Link URL'),'https://example.test');
    expect(screen.getByLabelText('Group Link URL')).toHaveValue('https://example.test');
    await userEvent.click(screen.getByRole('button',{name:'Cancel'}));
    expect(screen.queryByLabelText('Group Link URL')).not.toBeInTheDocument();
});

test('does not delete when confirmation is cancelled and reports a deletion error', async () => {
    const confirm=jest.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    deleteClubVenue.mockRejectedValueOnce({response:{data:{detail:'Cannot delete'}}});
    render(<ToastProvider><ManageVenuesDialog open onClose={jest.fn()} /></ToastProvider>);
    await userEvent.click(await screen.findByRole('button',{name:'Delete Arena'}));
    expect(deleteClubVenue).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button',{name:'Delete Arena'}));
    expect(await screen.findByText('Cannot delete')).toBeInTheDocument();
    confirm.mockRestore();
});

test('uploads and removes a logo and registration link', async () => {
    render(<ToastProvider><ManageVenuesDialog open onClose={jest.fn()} /></ToastProvider>);
    await userEvent.click(await screen.findByRole('button',{name:'Add New Venue'}));
    await userEvent.click(screen.getByRole('button',{name:'Add Group Link'}));
    await userEvent.click(screen.getByRole('button',{name:'Remove registration link'}));
    expect(screen.queryByLabelText('Group Link URL')).not.toBeInTheDocument();
    const upload=document.querySelector('#venue-logo-upload');
    await userEvent.upload(upload, new File(['image'], 'logo.png', {type:'image/png'}));
    await userEvent.click(await screen.findByRole('button',{name:'Remove venue logo'}));
    expect(screen.queryByRole('button',{name:'Remove venue logo'})).not.toBeInTheDocument();
});
