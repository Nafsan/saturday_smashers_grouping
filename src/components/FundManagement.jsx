import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Search, TrendingUp, TrendingDown, Users, FileText } from 'lucide-react';
import { fetchFundBalances } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import TournamentCostViewerModal from './TournamentCostViewerModal';
import PaymentHistoryModal from './PaymentHistoryModal';
import TrackExpensesModal from './TrackExpensesModal';
import ThemeToggle from './ThemeToggle';
import './FundManagement.scss';

const FundManagement = () => {
    const navigate = useNavigate();
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'positive', 'negative'
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
    const [isTrackExpensesOpen, setIsTrackExpensesOpen] = useState(false);


    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const balancesData = await fetchFundBalances();
            setBalances(balancesData);
        } catch (error) {
            console.error('Error loading fund data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBalances = balances.filter(player => {
        const matchesSearch = player.player_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
            filterType === 'all' ||
            (filterType === 'positive' && player.current_balance > 0) ||
            (filterType === 'negative' && player.current_balance < 0);
        return matchesSearch && matchesFilter;
    });

    const formatCurrency = (amount) => {
        return `৳${amount.toFixed(2)}`;
    };

    const getBalanceColor = (balance) => {
        if (balance > 0) return '#4ade80'; // green
        if (balance < 0) return '#f87171'; // red
        return '#94a3b8'; // gray
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="fund-management">
            <ThemeToggle />
            <div className="fund-header">
                <div className="header-content">
                    <button className="back-btn" onClick={() => navigate('/')}>
                        <ArrowLeft size={20} />
                        Back to Home
                    </button>
                    <h1 className="fund-title">Saturday Smashers Fund</h1>
                    <div className="header-actions">
                        <button className="cost-btn" onClick={() => setIsCostModalOpen(true)}>
                            <FileText size={20} />
                            Tournament Costs
                        </button>
                        <button className="cost-btn" onClick={() => setIsPaymentHistoryOpen(true)}>
                            <FileText size={20} />
                            Payment History
                        </button>
                        <button className="cost-btn" onClick={() => setIsTrackExpensesOpen(true)} style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
                            <TrendingDown size={20} />
                            Track Expenses
                        </button>

                        <button className="admin-btn" onClick={() => navigate('/fund/admin')}>
                            <Settings size={20} />
                            Admin Console
                        </button>
                    </div>
                </div>
            </div>

            <TournamentCostViewerModal
                open={isCostModalOpen}
                onClose={() => setIsCostModalOpen(false)}
            />

            <PaymentHistoryModal
                open={isPaymentHistoryOpen}
                onClose={() => setIsPaymentHistoryOpen(false)}
            />

            <TrackExpensesModal
                open={isTrackExpensesOpen}
                onClose={() => setIsTrackExpensesOpen(false)}
                players={balances}
            />



            <div className="fund-content">
                {/* Bkash Payment Info */}
                <div className="payment-info-card">
                    <div className="payment-info-header">
                        <h3>💰 Make Payment via Bkash</h3>
                    </div>
                    <div className="payment-info-body">
                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                            You can make payments to the Saturday Smashers Fund using Bkash
                        </p>
                        <div className="bkash-number-container">
                            <span className="bkash-label">Bkash Number:</span>
                            <button
                                className="bkash-number"
                                onClick={() => {
                                    navigator.clipboard.writeText('01521436290');
                                    // Show a temporary tooltip or message
                                    const btn = document.querySelector('.bkash-number');
                                    const originalText = btn.textContent;
                                    btn.textContent = '✓ Copied!';
                                    setTimeout(() => {
                                        btn.textContent = originalText;
                                    }, 2000);
                                }}
                                title="Click to copy to clipboard"
                            >
                                01521436290
                            </button>
                            <span className="copy-hint">Click to copy</span>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)' }}>
                            <Users size={24} />
                        </div>
                        <div className="stat-info">
                            <div className="stat-label">Total Players</div>
                            <div className="stat-value">{balances.length}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                            <div className="stat-label">Positive Balance</div>
                            <div className="stat-value">{balances.filter(p => p.current_balance >= 0).length}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' }}>
                            <TrendingDown size={24} />
                        </div>
                        <div className="stat-info">
                            <div className="stat-label">Negative Balance</div>
                            <div className="stat-value">{balances.filter(p => p.current_balance < 0).length}</div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="controls-section">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search players..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterType('all')}
                        >
                            All Players
                        </button>
                        <button
                            className={`filter-btn ${filterType === 'positive' ? 'active' : ''}`}
                            onClick={() => setFilterType('positive')}
                        >
                            Positive Balance
                        </button>
                        <button
                            className={`filter-btn ${filterType === 'negative' ? 'active' : ''}`}
                            onClick={() => setFilterType('negative')}
                        >
                            Negative Balance
                        </button>
                    </div>
                </div>

                {/* Player Balances Table */}
                <div className="balance-table-container">
                    <h2 className="section-title">Player Balances</h2>
                    <div className="table-wrapper">
                        <table className="balance-table">
                            <thead>
                                <tr>
                                    <th>Player Name</th>
                                    <th>Current Balance</th>
                                    <th>Days Played</th>
                                    <th>Total Paid</th>
                                    <th>Total Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBalances.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                            No players found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBalances.map((player) => (
                                        <tr key={player.id}>
                                            <td className="player-name">{player.player_name}</td>
                                            <td>
                                                <span
                                                    className="balance-amount"
                                                    style={{ color: getBalanceColor(player.current_balance) }}
                                                >
                                                    {formatCurrency(player.current_balance)}
                                                </span>
                                            </td>
                                            <td>{player.days_played}</td>
                                            <td>{formatCurrency(player.total_paid)}</td>
                                            <td>{formatCurrency(player.total_cost)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FundManagement;
