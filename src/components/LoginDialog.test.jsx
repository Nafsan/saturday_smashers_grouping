import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginDialog from './LoginDialog';
import { getAdminAuthCookie } from '../utils/cookieUtils';

test('validates blank and incorrect credentials', async () => {
    const success = jest.fn();
    render(<LoginDialog open onClose={jest.fn()} onLoginSuccess={success} />);
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByText('Please enter a password')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Admin Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByText('Incorrect password')).toBeInTheDocument();
    expect(success).not.toHaveBeenCalled();
});
test('successful login stores credentials and notifies/ closes the parent', async () => {
    const success = jest.fn(), close = jest.fn();
    render(<LoginDialog open onClose={close} onLoginSuccess={success} />);
    await userEvent.type(screen.getByLabelText('Admin Password'), 'test-admin-only{Enter}');
    expect(success).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(getAdminAuthCookie()).toBe('test-admin-only');
});
test('cancel clears input and closes the dialog', async () => {
    const close = jest.fn();
    render(<LoginDialog open onClose={close} onLoginSuccess={jest.fn()} />);
    await userEvent.type(screen.getByLabelText('Admin Password'), 'partial');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalled();
    expect(screen.getByLabelText('Admin Password')).toHaveValue('');
});
