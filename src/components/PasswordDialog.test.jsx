import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordDialog from './PasswordDialog';
import { getAdminAuthCookie, setAdminAuthCookie } from '../utils/cookieUtils';

test('rejects empty and incorrect passwords before invoking the callback', async () => {
    const success = jest.fn();
    render(<PasswordDialog open onSuccess={success} onCancel={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByText('Please enter a password')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Enter Admin Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByText('Incorrect password')).toBeInTheDocument();
    expect(success).not.toHaveBeenCalled();
});
test('Enter submits a valid password and stores it', async () => {
    const success = jest.fn().mockResolvedValue(undefined);
    render(<PasswordDialog open onSuccess={success} onCancel={jest.fn()} />);
    await userEvent.type(screen.getByLabelText('Enter Admin Password'), 'test-admin-only{Enter}');
    await waitFor(() => expect(success).toHaveBeenCalledWith('test-admin-only'));
    expect(getAdminAuthCookie()).toBe('test-admin-only');
});
test('a stored credential is submitted automatically on opening', async () => {
    setAdminAuthCookie('test-admin-only');
    const success = jest.fn().mockResolvedValue(undefined);
    render(<PasswordDialog open onSuccess={success} onCancel={jest.fn()} />);
    await waitFor(() => expect(success).toHaveBeenCalledWith('test-admin-only'));
});
test('callback failure is displayed and permits retry', async () => {
    const success = jest.fn().mockRejectedValue(new Error('Action failed'));
    render(<PasswordDialog open onSuccess={success} onCancel={jest.fn()} />);
    await userEvent.type(screen.getByLabelText('Enter Admin Password'), 'test-admin-only');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Action failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
});
test('cancel calls the parent and a closed dialog is hidden', async () => {
    const cancel = jest.fn();
    const { rerender } = render(<PasswordDialog open onCancel={cancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledTimes(1);
    rerender(<PasswordDialog open={false} onCancel={cancel} />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
