import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RankSubmission from './RankSubmission';
import { renderWithProviders } from '../../tests/frontend/renderWithProviders';
import * as api from '../api/client';
import { isAdminAuthenticated } from '../utils/cookieUtils';
jest.mock('../api/client');
jest.mock('../utils/cookieUtils', () => ({ ...jest.requireActual('../utils/cookieUtils'), isAdminAuthenticated: jest.fn(), getAdminAuthCookie: jest.fn(() => null), setAdminAuthCookie: jest.fn() }));
const tournament = {id:'cup', date:'2026-10-24', ranks:[
 {rating:1, players:['Alice']}, {rating:2, players:['Bob']}, {rating:3, players:['Carol','Dave']},
 {rating:5, players:['Eve']}, {rating:6, players:['Frank']}, {rating:7, players:['Grace','Henry']},
]};
test('an authenticated administrator saves results without a password', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.updateTournament.mockResolvedValue({});
    const close = jest.fn();
    renderWithProviders(<RankSubmission open onClose={close} initialData={tournament} />);
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    await waitFor(() => expect(api.updateTournament).toHaveBeenCalledWith('cup', expect.objectContaining({id:'cup'})));
    expect(close).toHaveBeenCalled();
});


test('visitor can open Google sign-in from results editor', async () => {
    isAdminAuthenticated.mockReturnValue(false);
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={tournament} />);
    await userEvent.click(screen.getByRole('button', {name:'Login as Admin'}));
    expect(screen.getByRole('link', {name:/sign in with google/i})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
});

test('administrator can confirm a deletion', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.deleteTournament.mockResolvedValue({});
    const close = jest.fn();
    renderWithProviders(<RankSubmission open onClose={close} initialData={tournament} />);
    await userEvent.click(screen.getByRole('button', {name:'Delete tournament'}));
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Delete'}));
    await waitFor(() => expect(api.deleteTournament).toHaveBeenCalledWith('cup'));
    expect(close).toHaveBeenCalled();
});

test('shows validation for an empty new result', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    renderWithProviders(<RankSubmission open onClose={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    expect(await screen.findByText(/Cup Champion, Runner Up, and Semi Finalists are mandatory/)).toBeInTheDocument();
});

test('reports a save failure', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.updateTournament.mockRejectedValueOnce(new Error('Offline'));
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={tournament} />);
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    expect(await screen.findByText(/Upload Failed/)).toBeInTheDocument();
});


const withPlayers = (rating, players) => ({ ...tournament, ranks: tournament.ranks.filter(r => r.rating !== rating).concat({rating, players}) });
test.each([
    [withPlayers(5, []), /Plate Champion, Runner Up, and Semi Finalists are mandatory/],
    [withPlayers(3, ['Carol']), /Cup Semi Finals must have exactly 2 players/],
    [withPlayers(7, ['Grace']), /Plate Semi Finals must have exactly 2 players/],
    [withPlayers(4, ['I','J','K','L','M']), /Cup Quarter Finals cannot have more than 4 players/],
    [withPlayers(8, ['I','J','K','L','M']), /Plate Quarter Finals cannot have more than 4 players/],
    [withPlayers(5, ['Alice']), /A player cannot be selected multiple times/],
])('rejects invalid tournament selections', async (data, message) => {
    isAdminAuthenticated.mockReturnValue(true);
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={data} />);
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(api.updateTournament).not.toHaveBeenCalled();
});

test('includes quarter finalists in the saved result', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.updateTournament.mockResolvedValue({});
    const data = {...tournament, ranks: [...tournament.ranks, {rating:4,players:['I','J']}, {rating:8,players:['K','L']}]};
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={data} />);
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    await waitFor(() => expect(api.updateTournament).toHaveBeenCalledWith('cup', expect.objectContaining({ranks: expect.arrayContaining([
        expect.objectContaining({players:['I','J']}), expect.objectContaining({players:['K','L']})
    ])})));
});

test('creates a tournament after selecting bracket players', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.addTournament.mockResolvedValue({});
    const names = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Henry','Iris','Jack'];
    renderWithProviders(<RankSubmission open onClose={jest.fn()} />, {state:{allPlayers:names}});
    const choose = async (label, name) => {
        await userEvent.click(screen.getByRole('combobox', {name:label}));
        await userEvent.click(await screen.findByRole('option', {name}));
    };
    await choose('Cup Champion','Alice');
    await choose('Cup Runner Up','Bob');
    await choose('Cup Semi Finalists (2 players)','Carol');
    await choose('Cup Semi Finalists (2 players)','Dave');
    await choose('Cup Quarter Finalists','Iris');
    await choose('Plate Champion','Eve');
    await choose('Plate Runner Up','Frank');
    await choose('Plate Semi Finalists','Grace');
    await choose('Plate Semi Finalists','Henry');
    await choose('Plate Quarter Finalists','Jack');
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    await waitFor(() => expect(api.addTournament).toHaveBeenCalledWith(expect.objectContaining({ranks:expect.any(Array)})));
}, 20000);

test('loads YouTube video metadata for an administrator', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ok:true, json: async () => ({title:'Video', html:'<iframe></iframe>'})});
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={tournament} />);
    const playlist = screen.getByLabelText('YouTube Playlist URL');
    await userEvent.type(playlist, 'https://www.youtube.com/watch?v=abcdefghijk&list=PL1');
    await userEvent.tab();
    await waitFor(() => expect(screen.getByLabelText('YouTube Embed Code')).toHaveValue('<iframe></iframe>'));
    expect(await screen.findByText('Fetched video: Video')).toBeInTheDocument();
});

test('delete failure is shown and the confirmation can be cancelled', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.deleteTournament.mockRejectedValueOnce(new Error('Offline'));
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={tournament} />);
    await userEvent.click(screen.getByRole('button', {name:'Delete tournament'}));
    await userEvent.click(screen.getByRole('button', {name:'Delete'}));
    expect(await screen.findByText(/Delete Failed/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
});

test('accepts changing a date, video embed, and player selections', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    const { fireEvent } = require('@testing-library/react');
    const names = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Henry','Iris','Jack'];
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={tournament} />, {state:{allPlayers:names}});
    fireEvent.change(screen.getByLabelText('Tournament Date'), {target:{value:'2026-11-21'}});
    fireEvent.change(screen.getByLabelText('YouTube Embed Code'), {target:{value:'custom embed'}});
    const cup = screen.getByRole('combobox', {name:'Cup Champion'});
    await userEvent.click(cup);
    await userEvent.click(screen.getByRole('option', {name:'Iris'}));
    const plate = screen.getByRole('combobox', {name:'Plate Runner Up'});
    await userEvent.click(plate);
    await userEvent.click(screen.getByRole('option', {name:'Jack'}));
    expect(cup).toHaveValue('Iris');
    expect(plate).toHaveValue('Jack');
    expect(screen.getByLabelText('Tournament Date')).toHaveValue('2026-11-21');
});

test('allows cancelling a delete confirmation', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={tournament} />);
    await userEvent.click(screen.getByRole('button', {name:'Delete tournament'}));
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    expect(api.deleteTournament).not.toHaveBeenCalled();
});

test('handles a YouTube service failure without losing the form', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    isAdminAuthenticated.mockReturnValue(true);
    global.fetch = jest.fn().mockRejectedValue(new Error('Offline'));
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={tournament} />);
    const input = screen.getByLabelText('YouTube Playlist URL');
    await userEvent.type(input, 'https://youtu.be/abcdefghijk');
    await userEvent.tab();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByRole('button', {name:'Save'})).toBeEnabled();
    spy.mockRestore();
});

test('asks for Google sign-in if the session expires before saving', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={tournament} />);
    isAdminAuthenticated.mockReturnValue(false);
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    expect(screen.getByRole('link', {name:/sign in with google/i})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    expect(api.updateTournament).not.toHaveBeenCalled();
});

test('preserves supplied video links when saving without a close callback', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.updateTournament.mockResolvedValue({});
    const data = {...tournament, playlist_url:'https://youtube.com/playlist?list=PL1', embed_url:'<iframe></iframe>'};
    renderWithProviders(<RankSubmission open initialData={data} />);
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    await waitFor(() => expect(api.updateTournament).toHaveBeenCalledWith('cup', expect.objectContaining({playlist_url:data.playlist_url, embed_url:data.embed_url})));
});


test.each([2, 3])('rejects missing cup players for rating %s', async rating => {
    isAdminAuthenticated.mockReturnValue(true);
    renderWithProviders(<RankSubmission open onClose={jest.fn()} initialData={withPlayers(rating, [])} />);
    await userEvent.click(screen.getByRole('button', {name:'Save'}));
    expect(await screen.findByText(/Cup Champion, Runner Up, and Semi Finalists are mandatory/)).toBeInTheDocument();
});
