import React from 'react';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddPlayer from './AddPlayer';
import {renderWithProviders} from '../../tests/frontend/renderWithProviders';
import * as api from '../api/client';
import {isAdminAuthenticated} from '../utils/cookieUtils';
jest.mock('../api/client');
jest.mock('../utils/cookieUtils', () => ({...jest.requireActual('../utils/cookieUtils'), isAdminAuthenticated:jest.fn()}));
beforeEach(() => isAdminAuthenticated.mockReturnValue(false));

test('asks for Google sign-in before adding a player', async () => {
    renderWithProviders(<AddPlayer open onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText(/Player Name/), 'Alice');
    await userEvent.click(screen.getByRole('button', {name:'Add Player'}));
    expect(screen.getByText(/Sign in with an approved Google account/)).toBeInTheDocument();
    expect(screen.queryByText(/enter the admin password/i)).not.toBeInTheDocument();
});


test('validates the name and permits cancellation', async () => {
    const close=jest.fn();
    renderWithProviders(<AddPlayer open onClose={close} />);
    await userEvent.click(screen.getByRole('button', {name:'Add Player'}));
    expect(await screen.findByText('Player name cannot be empty!')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    expect(close).toHaveBeenCalled();
});

test('adds a player with a verified session', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.addPlayer.mockResolvedValue({id:1,name:'Alice'});
    const close=jest.fn();
    renderWithProviders(<AddPlayer open onClose={close} />);
    await userEvent.type(screen.getByLabelText(/Player Name/), ' Alice ');
    await userEvent.click(screen.getByRole('button', {name:'Add Player'}));
    expect(await screen.findByText(/added successfully/)).toBeInTheDocument();
    expect(api.addPlayer).toHaveBeenCalledWith('Alice');
    expect(close).toHaveBeenCalled();
});

test('reports a rejected add and keeps the dialog open', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    api.addPlayer.mockRejectedValue(new Error('Offline'));
    renderWithProviders(<AddPlayer open onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText(/Player Name/), 'Alice');
    await userEvent.click(screen.getByRole('button', {name:'Add Player'}));
    expect(await screen.findByText(/Failed to add player/)).toBeInTheDocument();
});

test('rejects whitespace-only names and the close icon dismisses the form', async () => {
    const close=jest.fn();
    renderWithProviders(<AddPlayer open onClose={close} />);
    await userEvent.type(screen.getByLabelText(/Player Name/), '   ');
    await userEvent.click(screen.getByRole('button', {name:'Add Player'}));
    expect(await screen.findByText('Player name cannot be empty!')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'close'}));
    expect(close).toHaveBeenCalled();
});

test('allows a player form to be cancelled on a small screen', async () => {
    window.matchMedia.mockImplementation(query => ({matches:true,media:query,addListener:jest.fn(),removeListener:jest.fn(),addEventListener:jest.fn(),removeEventListener:jest.fn()}));
    const close=jest.fn();
    renderWithProviders(<AddPlayer open onClose={close} />);
    await userEvent.click(screen.getByRole('button',{name:'Cancel'}));
    expect(close).toHaveBeenCalled();
});
