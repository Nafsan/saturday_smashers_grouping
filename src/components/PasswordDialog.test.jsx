import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordDialog from './PasswordDialog';
import { isAdminAuthenticated } from '../utils/cookieUtils';
jest.mock('../utils/cookieUtils', () => ({ isAdminAuthenticated: jest.fn() }));

beforeEach(() => isAdminAuthenticated.mockReturnValue(false));
test('offers Google sign-in when a session is required', () => {
    render(<PasswordDialog open onSuccess={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute('href', expect.stringContaining('/auth/google/login'));
    expect(screen.queryByLabelText('Enter Admin Password')).not.toBeInTheDocument();
});
test('continues an action when a server session is present', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    const success = jest.fn();
    render(<PasswordDialog open onSuccess={success} onCancel={jest.fn()} />);
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
});
test('cancel calls the parent', async () => {
    const cancel = jest.fn();
    render(<PasswordDialog open onCancel={cancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledTimes(1);
});

test('shows an error when an authorized action fails', async () => {
    isAdminAuthenticated.mockReturnValue(true);
    render(<PasswordDialog open onSuccess={() => Promise.reject(new Error('Action failed'))} onCancel={jest.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Action failed');
});
