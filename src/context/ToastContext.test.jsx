import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './ToastContext';

function Buttons() {
    const toast = useToast();
    return <>{['success', 'error', 'warning'].map(kind => <button key={kind} onClick={() => toast[`${kind}Notification`](`${kind} message`)}>{kind}</button>)}</>;
}
test.each(['success', 'error', 'warning'])('displays and dismisses %s notifications', async kind => {
    render(<ToastProvider><Buttons /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: kind }));
    expect(screen.getByRole('alert')).toHaveTextContent(`${kind} message`);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
test('automatically dismisses notifications after the configured delay', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ToastProvider><Buttons /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: 'success' }));
    act(() => jest.advanceTimersByTime(4500));
    act(() => jest.advanceTimersByTime(300));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('useToast explains a missing provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Buttons />)).toThrow('useToast must be used within a ToastProvider');
});

test('clicking outside a notification leaves it visible until dismissed or timed out', async () => {
    render(<ToastProvider><Buttons /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'success' }));
    await userEvent.click(document.body);
    expect(screen.getByRole('alert')).toHaveTextContent('success message');
});
