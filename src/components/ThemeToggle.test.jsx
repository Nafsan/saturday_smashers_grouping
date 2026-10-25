import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';
import { renderWithProviders } from '../../tests/frontend/renderWithProviders';

test('toggles theme through the real Redux reducer and updates its accessible label', async () => {
    const { store } = renderWithProviders(<ThemeToggle />, { state: { theme: 'dark' } });
    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(store.getState().app.theme).toBe('light');
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(store.getState().app.theme).toBe('dark');
});
