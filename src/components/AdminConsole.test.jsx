import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
import AdminConsole from './AdminConsole';
import { isAdminAuthenticated } from '../utils/cookieUtils';
jest.mock('../utils/cookieUtils', () => ({ isAdminAuthenticated: jest.fn(), getAdminAuthCookie: jest.fn(() => null) }));
jest.mock('./SeedInitialData', () => () => <div>Seed data form</div>);
jest.mock('./AddTournamentCosts', () => () => <div>Costs form</div>);
jest.mock('./FundSettings', () => () => <div>Settings form</div>);
jest.mock('./RecordPayment', () => () => <div>Payment form</div>);
jest.mock('./AddPlayerMiscCost', () => () => <div>Misc form</div>);
jest.mock('./ManagePlayers', () => () => <div>Players form</div>);

test('opens admin console for a verified server session', () => {
    isAdminAuthenticated.mockReturnValue(true);
    render(<AdminConsole />);
    expect(screen.getByText('Admin Console')).toBeInTheDocument();
    expect(screen.getByText('Players form')).toBeInTheDocument();
});
test('asks visitors to sign in with Google', () => {
    isAdminAuthenticated.mockReturnValue(false);
    render(<AdminConsole />);
    expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument();
});


test('switches between admin tools', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    render(<AdminConsole />);
    await userEvent.click(screen.getByRole('tab', { name: /record payment/i }));
    expect(screen.getByText('Payment form')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /player misc costs/i }));
    expect(screen.getByText('Misc form')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /tournament costs/i }));
    expect(screen.getByText('Costs form')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /settings/i }));
    expect(screen.getByText('Settings form')).toBeInTheDocument();
});

test('closes access when the server session changes', () => {
    isAdminAuthenticated.mockReturnValue(true);
    render(<AdminConsole />);
    isAdminAuthenticated.mockReturnValue(false);
    act(() => window.dispatchEvent(new Event('authStatusChanged')));
    expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.queryByText('Players form')).not.toBeInTheDocument();
});


test('cancel returns the visitor to the fund page', async () => {
    isAdminAuthenticated.mockReturnValue(false);
    render(<AdminConsole />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockNavigate).toHaveBeenCalledWith('/fund');
});

test('back returns an authenticated user to the fund page', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    render(<AdminConsole />);
    await userEvent.click(screen.getByRole('button', { name: /back to fund/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/fund');
});
