import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, DollarSign, Settings as SettingsIcon, Lock, Wallet, Receipt } from 'lucide-react';
import { Tabs, Tab, Box } from '@mui/material';
import SeedInitialData from './SeedInitialData';
import AddTournamentCosts from './AddTournamentCosts';
import FundSettings from './FundSettings';
import RecordPayment from './RecordPayment';
import AddPlayerMiscCost from './AddPlayerMiscCost';
import PasswordDialog from './PasswordDialog';
import { getAdminAuthCookie } from '../utils/cookieUtils';
import './AdminConsole.scss';

const AdminConsole = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // Check for stored password on mount
    useEffect(() => {
        const storedPassword = getAdminAuthCookie();
        if (storedPassword && storedPassword === 'ss_admin_panel') {
            // Auto-authenticate if valid cookie exists
            setIsAuthenticated(true);
        } else {
            // Show password dialog
            setShowPasswordDialog(true);
        }
    }, []);

    const handleAuthSuccess = async (password) => {
        setIsAuthenticated(true);
        setShowPasswordDialog(false);
    };

    const handleAuthCancel = () => {
        navigate('/fund');
    };

    // Show password dialog if not authenticated
    if (!isAuthenticated) {
        return (
            <PasswordDialog
                open={showPasswordDialog}
                onSuccess={handleAuthSuccess}
                onCancel={handleAuthCancel}
                title="Admin Authentication Required"
                description="Please enter the admin password to access the admin console."
            />
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
