import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import reducer from '../../src/store/appSlice';
import { ToastProvider } from '../../src/context/ToastContext';

export function renderWithProviders(ui, { state = {}, toast = true } = {}) {
    const store = configureStore({ reducer: { app: reducer }, preloadedState: {
        app: { ...reducer(undefined, { type: 'test/init' }), ...state },
    } });
    const content = toast ? <ToastProvider>{ui}</ToastProvider> : ui;
    return { store, ...render(<Provider store={store}>{content}</Provider>) };
}
