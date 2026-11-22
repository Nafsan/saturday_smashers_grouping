import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginDialog from './LoginDialog';

test('offers Google sign-in rather than requesting the shared password', () => {
    render(<LoginDialog open onClose={jest.fn()} />);
    expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute('href', expect.stringContaining('/auth/google/login'));
    expect(screen.queryByLabelText('Admin Password')).not.toBeInTheDocument();
});
test('cancel closes the dialog', async () => {
    const close = jest.fn();
    render(<LoginDialog open onClose={close} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalled();
});

test('uses the same-origin proxy when no API override is set', () => {
    const previous = process.env.VITE_API_URL;
    delete process.env.VITE_API_URL;
    try {
        render(<LoginDialog open onClose={jest.fn()} />);
        expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute('href', '/api/auth/google/login');
    } finally {
        process.env.VITE_API_URL = previous;
    }
});
