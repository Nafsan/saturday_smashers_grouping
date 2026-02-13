import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TextField, IconButton,
    Box, Pagination, useMediaQuery
} from '@mui/material';
import { X, Search } from 'lucide-react';
import { fetchPaymentHistory } from '../api/client';
import LoadingSpinner from './LoadingSpinner';

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

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await fetchPaymentHistory(page, 20, debouncedSearch);
            setTransactions(data.items);
            setTotalPages(data.total_pages);
        } catch (error) {
            console.error("Failed to load payment history", error);
        } finally {
            setLoading(false);
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
        </Dialog>
    );
};

export default PaymentHistoryModal;
