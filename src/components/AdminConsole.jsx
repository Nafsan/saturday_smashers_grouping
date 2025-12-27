import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, DollarSign, Settings as SettingsIcon, Lock, Wallet, Receipt } from 'lucide-react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Tabs, Tab, Box } from '@mui/material';
import SeedInitialData from './SeedInitialData';
import AddTournamentCosts from './AddTournamentCosts';
import FundSettings from './FundSettings';
import RecordPayment from './RecordPayment';
import AddPlayerMiscCost from './AddPlayerMiscCost';
import './AdminConsole.scss';

const AdminConsole = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const handlePasswordSubmit = () => {
        if (password === 'ss_admin_panel') {
            setIsAuthenticated(true);
            setPasswordError('');
        } else {
            setPasswordError('Invalid password');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handlePasswordSubmit();
        }
    };

    if (!isAuthenticated) {
        return (
            <Dialog open={true} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Lock size={24} />
                        Admin Authentication Required
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 3 }}>
                    <TextField
                        fullWidth
                        type="password"
                        label="Enter Admin Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        error={!!passwordError}
                        helperText={passwordError}
                        autoFocus
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => navigate('/fund')} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePasswordSubmit}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                            }
                        }}
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <div className="admin-console">
            <div className="admin-header">
                <div className="header-content">
                    <button className="back-btn" onClick={() => navigate('/fund')}>
                        <ArrowLeft size={20} />
                        Back to Fund
                    </button>
                    <h1 className="admin-title">Admin Console</h1>
                    <div style={{ width: '150px' }}></div>
                </div>
            </div>

            <div className="admin-content">
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => setActiveTab(newValue)}
                        variant="fullWidth"
                        sx={{
                            '& .MuiTab-root': {
                                color: '#94a3b8',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                textTransform: 'none',
                                '&.Mui-selected': {
                                    color: '#f59e0b',
                                }
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#f59e0b',
                                height: 3,
                            }
                        }}
                    >
                        {/* <Tab
                            icon={<Database size={18} />}
                            label="Seed/Edit Data"
                            iconPosition="start"
                        /> */}
                        <Tab
                            icon={<Wallet size={18} />}
                            label="Record Payment"
                            iconPosition="start"
                        />
                        <Tab
                            icon={<Receipt size={18} />}
                            label="Player Misc Costs"
                            iconPosition="start"
                        />
                        <Tab
                            icon={<DollarSign size={18} />}
                            label="Tournament Costs"
                            iconPosition="start"
                        />
                        <Tab
                            icon={<SettingsIcon size={18} />}
                            label="Settings"
                            iconPosition="start"
                        />
                    </Tabs>
                </Box>

                <div className="tab-content">
                    {activeTab === 0 && <RecordPayment />}
                    {activeTab === 1 && <AddPlayerMiscCost />}
                    {activeTab === 2 && <AddTournamentCosts />}
                    {activeTab === 3 && <FundSettings />}
                </div>
            </div>
        </div>
    );
};

export default AdminConsole;
