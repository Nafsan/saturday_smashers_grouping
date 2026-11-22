import React from 'react';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkImportDialog from './BulkImportDialog';
import {ToastProvider} from '../context/ToastContext';
import {fetchClubVenues,bulkImportClubTournaments} from '../api/client';
jest.mock('../api/client', () => ({fetchClubVenues:jest.fn(),bulkImportClubTournaments:jest.fn()}));
jest.mock('@uiw/react-md-editor', () => ({__esModule:true,default:({value,onChange}) => <textarea aria-label="Announcement" value={value} onChange={e=>onChange(e.target.value)} />}));
test('imports tournaments using the session', async () => {
    fetchClubVenues.mockResolvedValue([{id:1,name:'Arena'}]);
    bulkImportClubTournaments.mockResolvedValue({created:1,total:1,errors:[]});
    const close=jest.fn();
    render(<ToastProvider><BulkImportDialog open onClose={close} /></ToastProvider>);
    await userEvent.click(await screen.findByRole('combobox',{name:/Venue/}));
    await userEvent.click(await screen.findByRole('option',{name:'Arena'}));
    await userEvent.type(screen.getByLabelText(/Category/),'Singles');
    await userEvent.click(screen.getByRole('button',{name:'Import 1 Tournament'}));
    await waitFor(() => expect(bulkImportClubTournaments).toHaveBeenCalledWith({tournaments:[expect.objectContaining({venue_id:1,category:'Singles'})]}));
    expect(close).toHaveBeenCalledWith(true);
});

test('validates rows and reports partial imports', async () => {
    const {fireEvent} = require('@testing-library/react');
    fetchClubVenues.mockResolvedValue([{id:1,name:'Arena',whatsapp_links:[{id:7,label:'Main'}]}]);
    bulkImportClubTournaments.mockResolvedValue({created:0,total:1,errors:['Duplicate tournament']});
    render(<ToastProvider><BulkImportDialog open onClose={jest.fn()} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button',{name:'Import 1 Tournament'}));
    expect(await screen.findByText('Row 1: Please select a venue')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('combobox',{name:/Venue/}));
    await userEvent.click(await screen.findByRole('option',{name:'Arena'}));
    await userEvent.click(screen.getByRole('button',{name:'Import 1 Tournament'}));
    expect(await screen.findByText('Row 1: Category is required')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Category/),{target:{value:'Singles'}});
    fireEvent.change(screen.getByLabelText(/Date & Time/),{target:{value:''}});
    await userEvent.click(screen.getByRole('button',{name:'Import 1 Tournament'}));
    expect(await screen.findByText('Row 1: Date & Time is required')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Date & Time/),{target:{value:'2026-10-24T12:00'}});
    fireEvent.change(screen.getByLabelText('Players'),{target:{value:'8'}});
    fireEvent.change(screen.getByLabelText('Online Link'),{target:{value:'https://example.test'}});
    fireEvent.change(screen.getByLabelText('Announcement'),{target:{value:'Notes'}});
    for (const label of [/Champion/,/Runner Up/,/SF 1/,/SF 2/,/QF 1/,/QF 2/,/QF 3/,/QF 4/]) fireEvent.change(screen.getByLabelText(label),{target:{value:'Player'}});
    await userEvent.click(screen.getByRole('combobox',{name:'WhatsApp Group'}));
    await userEvent.click(screen.getByRole('option',{name:'Main'}));
    await userEvent.click(screen.getByRole('button',{name:'Import 1 Tournament'}));
    expect(await screen.findByText('Duplicate tournament')).toBeInTheDocument();
});

test('duplicates and adds rows and allows cancellation', async () => {
    fetchClubVenues.mockResolvedValue([]);
    const close=jest.fn();
    render(<ToastProvider><BulkImportDialog open onClose={close} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button',{name:'Duplicate'}));
    expect(screen.getByText('Tournament #2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Add Another Tournament'}));
    expect(screen.getByText('Tournament #3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Cancel'}));
    expect(close).toHaveBeenCalledWith(false);
});

test('reports loading failures', async () => {
    fetchClubVenues.mockRejectedValueOnce(new Error('Offline'));
    render(<ToastProvider><BulkImportDialog open onClose={jest.fn()} /></ToastProvider>);
    expect(await screen.findByText('Failed to load venues')).toBeInTheDocument();
});
