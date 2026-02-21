import React, { useEffect, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store/store';
import { fetchPlayersAsync, fetchHistoryAsync } from './store/appSlice';
import AppLandingPage from './components/AppLandingPage';
import GroupDisplay from './components/GroupDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import FundManagement from './components/FundManagement';
import AdminConsole from './components/AdminConsole';
import GttEloCalculator from './components/GttEloCalculator';
import NationalRanking from './components/NationalRanking';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { ToastProvider } from './context/ToastContext';
import './styles/global.scss';

// Create custom themes matching the global SCSS variables
const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#0284c7', // --accent-primary (light)
        },
        secondary: {
            main: '#4f46e5', // --accent-secondary (light)
        },
        background: {
            default: '#f8fafc', // --bg-primary (light)
            paper: '#ffffff',   // --bg-card (light)
        },
        text: {
            primary: '#0f172a', // --text-primary (light)
            secondary: '#475569', // --text-secondary (light)
        },
        success: {
            main: '#16a34a', // --accent-success (light)
        },
    },
    typography: {
        fontFamily: "'Inter', system-ui, sans-serif",
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    borderRadius: '12px',
                }
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#ffffff',
                    backgroundImage: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                }
            }
        }
    }
});

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#38bdf8', // --accent-primary
        },
        secondary: {
            main: '#818cf8', // --accent-secondary
        },
        background: {
            default: '#0f172a', // --bg-primary
            paper: '#1e293b',   // --bg-secondary
        },
        text: {
            primary: '#f8fafc', // --text-primary
            secondary: '#94a3b8', // --text-secondary
        },
        success: {
            main: '#4ade80', // --accent-success
        },
    },
    typography: {
        fontFamily: "'Inter', system-ui, sans-serif",
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    borderRadius: '12px',
                }
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#1e293b',
                    backgroundImage: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                }
            }
        }
    }
});

const MainContent = () => {
    const dispatch = useDispatch();
    const { isGroupsGenerated, status } = useSelector(state => state.app);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (status === 'idle' && !hasFetched.current) {
            hasFetched.current = true;
            // Fetch players first, then history
            dispatch(fetchPlayersAsync()).then(() => {
                dispatch(fetchHistoryAsync());
            });
        }
    }, [status, dispatch]);

    return (
        <div className="container">
            <main>
                {status === 'loading' ? (
                    <LoadingSpinner />
                ) : (
                    !isGroupsGenerated ? <AppLandingPage /> : <GroupDisplay />
                )}
            </main>
        </div>
    );
};

function App() {
    // Use base path for GitHub Pages, empty for local development
    const basename = import.meta.env.BASE_URL || '/';

    return (
        <Provider store={store}>
            <AppWithTheme basename={basename} />
        </Provider>
    );
}

function AppWithTheme({ basename }) {
    const theme = useSelector(state => state.app.theme);
    const currentTheme = theme === 'light' ? lightTheme : darkTheme;

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <ThemeProvider theme={currentTheme}>
            <CssBaseline />
            <ToastProvider>
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<MainContent />} />
                        <Route path="/fund" element={<FundManagement />} />
                        <Route path="/fund/admin" element={<AdminConsole />} />
                        <Route path="/gtt-elo-calculator" element={<GttEloCalculator />} />
                        <Route path="/national-ranking" element={<NationalRanking />} />
                    </Routes>
                </HashRouter>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
