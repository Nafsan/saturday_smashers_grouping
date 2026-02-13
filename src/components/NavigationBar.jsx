import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Calculator, DollarSign, Youtube, UserPlus, BarChart3, ChevronDown, Trophy, LogIn, LogOut } from 'lucide-react';
import { isAdminAuthenticated, clearAdminAuthCookie } from '../utils/cookieUtils';
import ThemeToggle from './ThemeToggle';
import LoginDialog from './LoginDialog';
import './NavigationBar.scss';

const NavigationBar = ({ onAddPlayer, onPlayerStats, onSubmitResults }) => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [adminMenuOpen, setAdminMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(isAdminAuthenticated());
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

    useEffect(() => {
        // Check login status on mount and when cookie changes
        const checkAuthStatus = () => {
            setIsLoggedIn(isAdminAuthenticated());
        };

        // Check periodically (in case cookie expires)
        const interval = setInterval(checkAuthStatus, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleLogin = () => {
        setIsLoginDialogOpen(true);
        setAdminMenuOpen(false);
        setMobileMenuOpen(false);
    };

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
        // Trigger a re-render of components that depend on auth status
        window.dispatchEvent(new Event('authStatusChanged'));
    };

    const handleLogout = () => {
        clearAdminAuthCookie();
        setIsLoggedIn(false);
        setAdminMenuOpen(false);
        setMobileMenuOpen(false);
        // Trigger a re-render of components that depend on auth status
        window.dispatchEvent(new Event('authStatusChanged'));
    };

    return (
        <nav className="navigation-bar">
            <div className="nav-container">
                {/* Logo Section */}
                <div className="nav-logo">
                    <img
                        src="/saturday_smashers_grouping/assets/logo.png"
                        alt="Saturday Smashers Logo"
                        className="logo-image"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div className="logo-fallback" style={{ display: 'none' }}>
                        <span className="logo-icon">🏓</span>
                        <span className="logo-text">Saturday Smashers</span>
                    </div>
                </div>

                {/* Desktop Navigation Links */}
                <div className="nav-links desktop-only">
                    <a onClick={() => navigate('/gtt-elo-calculator')} className="nav-link">
                        <Calculator size={18} />
                        <span>ELO Calculator</span>
                    </a>
                    <a onClick={() => navigate('/fund')} className="nav-link">
                        <DollarSign size={18} />
                        <span>Fund</span>
                    </a>
                    <a
                        href="https://www.youtube.com/@PongTTT-bd"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nav-link youtube-link"
                    >
                        <Youtube size={18} />
                        <span>YouTube</span>
                    </a>
                </div>

                {/* Desktop Actions */}
                <div className="nav-actions desktop-only">
                    <div className="admin-dropdown">
                        <button
                            className="admin-toggle"
                            onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                        >
                            <span>Admin</span>
                            <ChevronDown size={16} className={adminMenuOpen ? 'rotated' : ''} />
                        </button>
                        {adminMenuOpen && (
                            <div className="admin-menu">
                                {isLoggedIn ? (
                                    <>
                                        <button onClick={() => { onSubmitResults(); setAdminMenuOpen(false); }}>
                                            <Trophy size={16} />
                                            <span>Submit Results</span>
                                        </button>
                                        <button onClick={() => { onAddPlayer(); setAdminMenuOpen(false); }}>
                                            <UserPlus size={16} />
                                            <span>Add Player</span>
                                        </button>
                                        <button onClick={handleLogout}>
                                            <LogOut size={16} />
                                            <span>Logout</span>
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={handleLogin}>
                                        <LogIn size={16} />
                                        <span>Login</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <ThemeToggle />
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="mobile-menu-toggle mobile-only"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="mobile-menu">
                    <a onClick={() => { navigate('/gtt-elo-calculator'); setMobileMenuOpen(false); }} className="mobile-link">
                        <Calculator size={18} />
                        <span>ELO Calculator</span>
                    </a>
                    <a onClick={() => { navigate('/fund'); setMobileMenuOpen(false); }} className="mobile-link">
                        <DollarSign size={18} />
                        <span>Fund</span>
                    </a>
                    <a
                        href="https://www.youtube.com/@PongTTT-bd"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mobile-link youtube-link"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <Youtube size={18} />
                        <span>YouTube</span>
                    </a>
                    <div className="mobile-divider"></div>
                    {isLoggedIn ? (
                        <>
                            <a onClick={() => { onSubmitResults(); setMobileMenuOpen(false); }} className="mobile-link">
                                <Trophy size={18} />
                                <span>Submit Results</span>
                            </a>
                            <a onClick={() => { onAddPlayer(); setMobileMenuOpen(false); }} className="mobile-link">
                                <UserPlus size={18} />
                                <span>Add Player</span>
                            </a>
                            <a onClick={handleLogout} className="mobile-link">
                                <LogOut size={18} />
                                <span>Logout</span>
                            </a>
                        </>
                    ) : (
                        <a onClick={handleLogin} className="mobile-link">
                            <LogIn size={18} />
                            <span>Login</span>
                        </a>
                    )}
                    <div className="mobile-theme-toggle">
                        <ThemeToggle />
                    </div>
                </div>
            )}

            {/* Login Dialog */}
            <LoginDialog
                open={isLoginDialogOpen}
                onClose={() => setIsLoginDialogOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />
        </nav>
    );
};

export default NavigationBar;
