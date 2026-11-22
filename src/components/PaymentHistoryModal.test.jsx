import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentHistoryModal from './PaymentHistoryModal';
import { fetchPaymentHistory, fetchPlayers, updatePayment, deletePayment } from '../api/client';
jest.mock('../api/client', () => ({fetchPaymentHistory:jest.fn(), fetchPlayers:jest.fn(), updatePayment:jest.fn(), deletePayment:jest.fn()}));
jest.mock('../utils/cookieUtils', () => ({isAdminAuthenticated:() => true, getAdminAuthCookie:() => null}));
beforeEach(() => {fetchPaymentHistory.mockResolvedValue({items:[{id:1,player_name:'Alice',amount:25,payment_date:'2026-10-24',notes:''}],total_pages:1}); fetchPlayers.mockResolvedValue([{name:'Alice'}]);});
test('updates a payment using the session', async () => {
    updatePayment.mockResolvedValue({});
    render(<PaymentHistoryModal open onClose={jest.fn()} />);
    await userEvent.click(await screen.findByRole('button', {name:'Edit payment for Alice'}));
    await userEvent.click(screen.getByRole('button', {name:'Update'}));
    await waitFor(() => expect(updatePayment).toHaveBeenCalledWith(1, expect.objectContaining({player_name:'Alice',amount:25})));
});
test('deletes a payment using the session', async () => {
    deletePayment.mockResolvedValue({});
    render(<PaymentHistoryModal open onClose={jest.fn()} />);
    await userEvent.click(await screen.findByRole('button', {name:'Delete payment for Alice'}));
    await userEvent.click(screen.getByRole('button', {name:'Delete'}));
    await waitFor(() => expect(deletePayment).toHaveBeenCalledWith(1));
});

test('edits fields and reports an update error', async () => {
    const error=jest.spyOn(console,'error').mockImplementation(() => {}), alert=jest.spyOn(window,'alert').mockImplementation(() => {});
    updatePayment.mockRejectedValueOnce({response:{data:{detail:'Not authorized'}}});
    render(<PaymentHistoryModal open onClose={jest.fn()} />);
    await userEvent.click(await screen.findByRole('button', {name:'Edit payment for Alice'}));
    await userEvent.clear(screen.getByLabelText('Amount'));
    await userEvent.type(screen.getByLabelText('Amount'), '40');
    await userEvent.type(screen.getByLabelText('Notes'), 'Cash');
    await userEvent.click(screen.getByRole('button', {name:'Update'}));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Not authorized'));
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    error.mockRestore(); alert.mockRestore();
});

test('reports delete errors and allows cancellation', async () => {
    const error=jest.spyOn(console,'error').mockImplementation(() => {}), alert=jest.spyOn(window,'alert').mockImplementation(() => {});
    deletePayment.mockRejectedValueOnce(new Error('Offline'));
    render(<PaymentHistoryModal open onClose={jest.fn()} />);
    await userEvent.click(await screen.findByRole('button', {name:'Delete payment for Alice'}));
    await userEvent.click(screen.getByRole('button', {name:'Delete'}));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Failed to delete payment'));
    await userEvent.click(screen.getByRole('button', {name:'Cancel'}));
    error.mockRestore(); alert.mockRestore();
});

test('shows an empty history and allows closing', async () => {
    fetchPaymentHistory.mockResolvedValue({items:[],total_pages:1});
    const close=jest.fn();
    render(<PaymentHistoryModal open onClose={close} />);
    expect(await screen.findByText('No transactions found')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name:'Close'}));
    expect(close).toHaveBeenCalled();
});

test('changes a payment player and date before saving', async () => {
    fetchPlayers.mockResolvedValue([{name:'Alice'},{name:'Bob'}]);
    updatePayment.mockResolvedValue({});
    render(<PaymentHistoryModal open onClose={jest.fn()} />);
    await userEvent.click(await screen.findByRole('button',{name:'Edit payment for Alice'}));
    await userEvent.click(screen.getByRole('combobox',{name:'Player Name'}));
    await userEvent.click(screen.getByRole('option',{name:'Bob'}));
    const {fireEvent}=require('@testing-library/react');
    fireEvent.change(screen.getByLabelText('Date'),{target:{value:'2026-11-21'}});
    await userEvent.click(screen.getByRole('button',{name:'Update'}));
    await waitFor(() => expect(updatePayment).toHaveBeenCalledWith(1,expect.objectContaining({player_name:'Bob',payment_date:'2026-11-21'})));
});
