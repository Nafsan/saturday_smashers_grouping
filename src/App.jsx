import React, { useEffect, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store/store';
import { fetchPlayersAsync, fetchHistoryAsync } from './store/appSlice';
import PlayerSelection from './components/PlayerSelection';
import GroupDisplay from './components/GroupDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import FundManagement from './components/FundManagement';
import AdminConsole from './components/AdminConsole';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { ToastProvider } from './context/ToastContext';
import './styles/global.scss';

// Create a custom dark theme matching the global SCSS variables
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
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#334155', // --bg-card for dialogs to stand out
                    backgroundImage: 'none',
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
            <header style={{ textAlign: 'center', padding: '2rem 0' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Saturday Smashers
                </h1>
            </header>

            <main>
                {status === 'loading' ? (
                    <LoadingSpinner />
                ) : (
                    !isGroupsGenerated ? <PlayerSelection /> : <GroupDisplay />
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
            <ThemeProvider theme={darkTheme}>
                <CssBaseline />
                <ToastProvider>
                    <HashRouter>
                        <Routes>
                            <Route path="/" element={<MainContent />} />
                            <Route path="/fund" element={<FundManagement />} />
                            <Route path="/fund/admin" element={<AdminConsole />} />
                        </Routes>
                    </HashRouter>
                </ToastProvider>
            </ThemeProvider>
        </Provider>
    );
}

export default App;
