import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }));
import NavigationBar from './NavigationBar';
import { isAdminAuthenticated, logoutAdmin } from '../utils/cookieUtils';

jest.mock('../utils/cookieUtils', () => ({ isAdminAuthenticated: jest.fn(), clearAdminAuthCookie: jest.fn(), refreshAdminSession: jest.fn().mockResolvedValue(false), logoutAdmin: jest.fn().mockResolvedValue() }));
jest.mock('./ThemeToggle', () => () => <button>Theme</button>);
jest.mock('./LoginDialog', () => ({ open, onLoginSuccess }) => open ? <button onClick={onLoginSuccess}>Complete login</button> : null);

const renderNav = (props = {}) => render(<NavigationBar onAddPlayer={jest.fn()} onSubmitResults={jest.fn()} {...props} />);

test('keeps requested links hidden in desktop and mobile navigation', () => {
    isAdminAuthenticated.mockReturnValue(false);
    const { container } = renderNav();
    expect(screen.queryByRole('link', { name: /elo calculator|tournaments/i })).not.toBeInTheDocument();
    fireEvent.click(container.querySelector('.mobile-menu-toggle'));
    expect(screen.queryByRole('link', { name: /elo calculator|tournaments/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Fund' })).toHaveLength(2);
});

test('admin can log in and log out', async () => {
    isAdminAuthenticated.mockReturnValue(false);
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    isAdminAuthenticated.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Complete login' }));
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(logoutAdmin).toHaveBeenCalled());
});

test('admin actions work on desktop and mobile', () => {
    isAdminAuthenticated.mockReturnValue(true);
    const onAddPlayer = jest.fn();
    const onSubmitResults = jest.fn();
    const { container } = renderNav({ onAddPlayer, onSubmitResults });
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Player' }));
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Results' }));
    fireEvent.click(container.querySelector('.mobile-menu-toggle'));
    fireEvent.click(screen.getByText('Add Player'));
    fireEvent.click(container.querySelector('.mobile-menu-toggle'));
    fireEvent.click(screen.getByText('Submit Results'));
    expect(onAddPlayer).toHaveBeenCalledTimes(2);
    expect(onSubmitResults).toHaveBeenCalledTimes(2);
});


test('mobile login and logout controls work', async () => {
    isAdminAuthenticated.mockReturnValue(false);
    const { container, unmount } = renderNav();
    fireEvent.click(container.querySelector('.mobile-menu-toggle'));
    fireEvent.click(screen.getByText('Login'));
    expect(screen.getByText('Complete login')).toBeInTheDocument();
    unmount();
    isAdminAuthenticated.mockReturnValue(true);
    const next = renderNav();
    fireEvent.click(next.container.querySelector('.mobile-menu-toggle'));
    fireEvent.click(screen.getByText('Logout'));
    await waitFor(() => expect(logoutAdmin).toHaveBeenCalled());
});

test('shows fallback when logo fails and refreshes authentication', () => {
    jest.useFakeTimers();
    isAdminAuthenticated.mockReturnValue(false);
    const { container } = renderNav();
    fireEvent.error(screen.getByAltText('Saturday Smashers Logo'));
    expect(container.querySelector('.logo-fallback')).toHaveStyle({ display: 'flex' });
    isAdminAuthenticated.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event('authStatusChanged')));
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    jest.useRealTimers();
});

test('refreshes the server session on startup', () => {
    const { refreshAdminSession } = require('../utils/cookieUtils');
    renderNav();
    expect(refreshAdminSession).toHaveBeenCalled();
});




test('does not poll signed-out visitors and refreshes when the tab becomes visible', () => {
    jest.useFakeTimers();
    const { refreshAdminSession } = require('../utils/cookieUtils');
    isAdminAuthenticated.mockReturnValue(false);
    renderNav();
    expect(refreshAdminSession).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(30000));
    expect(refreshAdminSession).toHaveBeenCalledTimes(1);
    const descriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    fireEvent(document, new Event('visibilitychange'));
    expect(refreshAdminSession).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    fireEvent(document, new Event('visibilitychange'));
    expect(refreshAdminSession).toHaveBeenCalledTimes(2);
    if (descriptor) Object.defineProperty(document, 'visibilityState', descriptor);
    else delete document.visibilityState;
    jest.useRealTimers();
});
