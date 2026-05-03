import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TextField, IconButton,
    Box, Pagination, useMediaQuery
} from '@mui/material';
import { X, Search, Edit2 } from 'lucide-react';
import { fetchPaymentHistory, updatePayment, fetchPlayers } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import { getAdminAuthCookie, isAdminAuthenticated } from '../utils/cookieUtils';
import { Autocomplete } from '@mui/material';

const PaymentHistoryModal = ({ open, onClose }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const isMobile = useMediaQuery('(max-width:600px)');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (open) {
            loadHistory();
        }
    }, [open, page, debouncedSearch]);

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [allPlayers, setAllPlayers] = useState([]);
    const isAdmin = isAdminAuthenticated();

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await fetchPaymentHistory(page, 20, debouncedSearch);
            setTransactions(data.items);
            setTotalPages(data.total_pages);
            
            if (isAdmin && allPlayers.length === 0) {
                const players = await fetchPlayers();
                setAllPlayers(players.map(p => p.name));
            }
        } catch (error) {
            console.error("Failed to load payment history", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (transaction) => {
        setEditingTransaction({
            ...transaction,
            payment_date: transaction.payment_date.split('T')[0] // Format for date input
        });
        setEditDialogOpen(true);
    };

    const handleUpdatePayment = async () => {
        try {
            const adminPassword = getAdminAuthCookie();
            await updatePayment(editingTransaction.id, {
                player_name: editingTransaction.player_name,
                amount: parseFloat(editingTransaction.amount),
                payment_date: editingTransaction.payment_date,
                notes: editingTransaction.notes
            }, adminPassword);
            
            setEditDialogOpen(false);
            loadHistory();
        } catch (error) {
            console.error("Failed to update payment", error);
            alert(error.response?.data?.detail || "Failed to update payment");
        }
    };

    const formatCurrency = (amount) => `৳${parseFloat(amount).toFixed(2)}`;
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    width: isMobile ? '97%' : undefined,
                    maxHeight: isMobile ? '95vh' : undefined,
                    margin: isMobile ? '8px' : undefined
                }
            }}
        >
            <DialogTitle>
                Payment History
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                >
                    <X />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <TextField
                        size="small"
                        placeholder="Filter by player name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                        InputProps={{
                            startAdornment: <Search size={20} style={{ marginRight: 8, color: 'gray' }} />
                        }}
                    />
                </div>

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Player</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Notes</TableCell>
                                        {isAdmin && <TableCell align="right">Actions</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.length > 0 ? (
                                        transactions.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell>{formatDate(t.payment_date)}</TableCell>
                                                <TableCell>{t.player_name}</TableCell>
                                                <TableCell sx={{ color: '#4ade80', fontWeight: 'bold' }}>
                                                    {formatCurrency(t.amount)}
                                                </TableCell>
                                                <TableCell>{t.notes || '-'}</TableCell>
                                                {isAdmin && (
                                                    <TableCell align="right">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleEditClick(t)}
                                                            color="primary"
                                                        >
                                                            <Edit2 size={16} />
                                                        </IconButton>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                No transactions found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(e, v) => setPage(v)}
                                color="primary"
                            />
                        </Box>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Payment</DialogTitle>
                <DialogContent dividers>
                    {editingTransaction && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <Autocomplete
                                options={allPlayers}
                                value={editingTransaction.player_name}
                                onChange={(e, v) => setEditingTransaction({...editingTransaction, player_name: v})}
                                renderInput={(params) => <TextField {...params} label="Player Name" size="small" />}
                            />
                            <TextField
                                label="Amount"
                                type="number"
                                size="small"
                                value={editingTransaction.amount}
                                onChange={(e) => setEditingTransaction({...editingTransaction, amount: e.target.value})}
                                InputProps={{ startAdornment: <Box sx={{ mr: 1 }}>৳</Box> }}
                            />
                            <TextField
                                label="Date"
                                type="date"
                                size="small"
                                value={editingTransaction.payment_date}
                                onChange={(e) => setEditingTransaction({...editingTransaction, payment_date: e.target.value})}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Notes"
                                size="small"
                                multiline
                                rows={2}
                                value={editingTransaction.notes || ''}
                                onChange={(e) => setEditingTransaction({...editingTransaction, notes: e.target.value})}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdatePayment} variant="contained" color="primary">Update</Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default PaymentHistoryModal;
